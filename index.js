#!/usr/bin/env node
import { access, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { extname, join, relative, resolve } from 'node:path'
import process from 'node:process'

const USAGE = 'Usage: opinionator [path] [--check]'
const VALID_EXTENSIONS = new Set([ '.js', '.mjs', '.cjs' ])
const IGNORED_DIRS = new Set([ 'dist', 'build', 'node_modules' ])


function parseArgs ( argv ) {
  const args = argv.slice(2)
  let path = null
  let check = false
  for ( const arg of args ) {
    if ( arg === '--check' ) {
      check = true
    }
    else if ( arg === '--help' || arg === '-h' ) {
      return { help: true }
    }
    else if ( path == null ) {
      path = arg
    }
  }

  return { path, check }
}


function parseGitignorePatterns ( content ) {
  const patterns = []
  for ( const raw of content.split('\n') ) {
    const line = raw.trim()
    if ( line === '' || line.startsWith('#') === true ) {
      continue
    }
    patterns.push(line)
  }

  return patterns
}


function matchesPatternParts ( clean, parts ) {
  for ( const part of parts ) {
    if ( simpleMatch(clean, part) === true ) {
      return true
    }
  }

  return false
}


function matchesGitignore ( relative_path, patterns ) {
  const parts = relative_path.split('/')
  for ( const pattern of patterns ) {
    if ( pattern.startsWith('!') === true ) {
      continue
    }
    const clean = pattern.replace(/\/$/, '')
    const has_slash = clean.includes('/')
    if ( has_slash === false && matchesPatternParts(clean, parts) === true ) {
      return true
    }

    if ( has_slash === true && simpleMatch(clean, relative_path) === true ) {
      return true
    }
  }

  return false
}


function isDoublestar ( pattern, i ) {
  return pattern[i] === '*' && pattern[i + 1] === '*'
}


function appendGlobChar ( ch, pattern, i ) {
  if ( ch === '*' ) {
    return '[^/]*'
  }

  if ( ch === '?' ) {
    return '[^/]'
  }

  if ( ch === '.' ) {
    return '\\.'
  }

  if ( '()+^${}|[]\\'.includes(ch) === true ) {
    return '\\' + ch
  }

  return ch
}


function simpleMatch ( pattern, str ) {
  let regex = '^'
  let i = 0
  while ( i < pattern.length ) {
    const ch = pattern[i]
    if ( isDoublestar(pattern, i) === true ) {
      regex += '.*'
      i += 2
      i += pattern[i] === '/' ? 1 : 0
      continue
    }
    regex += appendGlobChar(ch, pattern, i)
    i++
  }
  regex += '$'
  try {
    return new RegExp(regex).test(str)
  }
  catch {
    return false
  }
}


async function loadGitignorePatterns ( cwd ) {
  try {
    const content = await readFile(join(cwd, '.gitignore'), 'utf-8')

    return parseGitignorePatterns(content)
  }
  catch {
    return []
  }
}


function isValidFile ( resolved ) {
  return VALID_EXTENSIONS.has(extname(resolved))
}


async function discoverFiles ( target_path, cwd, gitignore_patterns ) {
  const resolved = resolve(target_path)
  const info = await stat(resolved)
  if ( info.isFile() === true && isValidFile(resolved) === true ) {
    return [ resolved ]
  }

  if ( info.isFile() === true ) {
    return []
  }

  if ( info.isDirectory() === false ) {
    return []
  }

  const files = []
  await walkDir(resolved, cwd, gitignore_patterns, files)
  files.sort(( a, b ) => a.localeCompare(b))

  return files
}


function shouldSkipDir ( entry_name, rel, gitignore_patterns ) {
  if ( IGNORED_DIRS.has(entry_name) === true ) {
    return true
  }

  if ( gitignore_patterns.length > 0 && matchesGitignore(rel, gitignore_patterns) === true ) {
    return true
  }

  return false
}


function shouldSkipFile ( entry_name, rel, gitignore_patterns ) {
  if ( VALID_EXTENSIONS.has(extname(entry_name)) === false ) {
    return true
  }

  if ( gitignore_patterns.length > 0 && matchesGitignore(rel, gitignore_patterns) === true ) {
    return true
  }

  return false
}


async function walkDir ( dir, cwd, gitignore_patterns, files ) {
  const entries = await readdir(dir, { withFileTypes: true })
  for ( const entry of entries ) {
    const full_path = join(dir, entry.name)
    const rel = relative(cwd, full_path)
    if ( entry.isDirectory() === true && shouldSkipDir(entry.name, rel, gitignore_patterns) === false ) {
      await walkDir(full_path, cwd, gitignore_patterns, files)
    }

    if ( entry.isFile() === true && shouldSkipFile(entry.name, rel, gitignore_patterns) === false ) {
      files.push(full_path)
    }
  }
}


function handleDiscoverError ( parsed, err ) {
  process.stderr.write(`error: ${parsed.path}: ${err.message}\n`)
  process.exit(2)
}


function handleFileError ( rel, err ) {
  process.stderr.write(`error: ${rel}: ${err.message}\n`)
}


async function processFile ( file_path, cwd, format, is_check ) {
  const rel = relative(cwd, file_path)
  let source
  // opinionator-ignore-start
  try {
    source = await readFile(file_path, 'utf-8')
  }
  catch (err) {
    handleFileError(rel, err)

    return { changed: false, errored: true }
  }
  // opinionator-ignore-end
  let result
  // opinionator-ignore-start
  try {
    result = await format(source)
  }
  catch (err) {
    handleFileError(rel, err)

    return { changed: false, errored: true }
  }
  // opinionator-ignore-end
  if ( result.changed === false ) {
    return { changed: false, errored: false }
  }

  if ( is_check === true ) {
    process.stdout.write(`needs formatting: ${rel}\n`)
  }
  else {
    await writeFile(file_path, result.code, 'utf-8')
    process.stdout.write(`formatted: ${rel}\n`)
  }

  return { changed: true, errored: false }
}


async function main () {
  const cwd = process.cwd()
  const parsed = parseArgs(process.argv)
  if ( parsed.help === true || parsed.path == null ) {
    process.stderr.write(USAGE + '\n')
    process.exit(2)
  }
  const { format } = await import('./src/format.js')
  const gitignore_patterns = await loadGitignorePatterns(cwd)
  let files
  // opinionator-ignore-start
  try {
    files = await discoverFiles(parsed.path, cwd, gitignore_patterns)
  }
  catch (err) {
    handleDiscoverError(parsed, err)
  }
  // opinionator-ignore-end
  let change_count = 0
  let had_error = false
  for ( const file_path of files ) {
    const status = await processFile(file_path, cwd, format, parsed.check === true)
    if ( status.changed === true ) {
      change_count++
    }

    if ( status.errored === true ) {
      had_error = true
    }
  }

  if ( parsed.check === true ) {
    process.stdout.write(`${change_count} file(s) need formatting.\n`)
  }
  else {
    process.stdout.write(`${change_count} file(s) formatted.\n`)
  }

  if ( had_error === true ) {
    process.exit(2)
  }

  if ( change_count > 0 ) {
    process.exit(1)
  }
  process.exit(0)
}


main()
