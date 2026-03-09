#!/usr/bin/env node

import { readFile, writeFile, readdir, stat, access } from 'node:fs/promises'
import { join, resolve, relative, extname } from 'node:path'
import process from 'node:process'

const USAGE = 'Usage: opinionator [path] [--check]'
const VALID_EXTENSIONS = new Set(['.js', '.mjs', '.cjs'])
const IGNORED_DIRS = new Set(['dist', 'build', 'node_modules'])

function parseArgs(argv) {
  const args = argv.slice(2)
  let path = null
  let check = false

  for (const arg of args) {
    if (arg === '--check') {
      check = true
    } else if (arg === '--help' || arg === '-h') {
      return { help: true }
    } else if (!path) {
      path = arg
    }
  }

  return { path, check }
}

function parseGitignorePatterns(content) {
  const patterns = []
  for (const raw of content.split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    patterns.push(line)
  }
  return patterns
}

function matchesGitignore(relativePath, patterns) {
  const parts = relativePath.split('/')

  for (const pattern of patterns) {
    if (pattern.startsWith('!')) continue

    const clean = pattern.replace(/\/$/, '')

    // Pattern without slash — matches any path component
    if (!clean.includes('/')) {
      for (const part of parts) {
        if (simpleMatch(clean, part)) return true
      }
    } else {
      // Pattern with slash — match from root
      if (simpleMatch(clean, relativePath)) return true
    }
  }
  return false
}

function simpleMatch(pattern, str) {
  // Convert glob pattern to regex
  let regex = '^'
  let i = 0
  while (i < pattern.length) {
    const ch = pattern[i]
    if (ch === '*') {
      if (pattern[i + 1] === '*') {
        regex += '.*'
        i += 2
        if (pattern[i] === '/') i++ // skip separator after **
        continue
      }
      regex += '[^/]*'
    } else if (ch === '?') {
      regex += '[^/]'
    } else if (ch === '.') {
      regex += '\\.'
    } else if (ch === '(' || ch === ')' || ch === '+' || ch === '^' || ch === '$' || ch === '{' || ch === '}' || ch === '|' || ch === '[' || ch === ']' || ch === '\\') {
      regex += '\\' + ch
    } else {
      regex += ch
    }
    i++
  }
  regex += '$'

  try {
    return new RegExp(regex).test(str)
  } catch {
    return false
  }
}

async function loadGitignorePatterns(cwd) {
  try {
    const content = await readFile(join(cwd, '.gitignore'), 'utf-8')
    return parseGitignorePatterns(content)
  } catch {
    return []
  }
}

async function discoverFiles(targetPath, cwd, gitignorePatterns) {
  const resolved = resolve(targetPath)
  const info = await stat(resolved)

  if (info.isFile()) {
    if (VALID_EXTENSIONS.has(extname(resolved))) {
      return [resolved]
    }
    return []
  }

  if (!info.isDirectory()) return []

  const files = []
  await walkDir(resolved, cwd, gitignorePatterns, files)
  files.sort((a, b) => a.localeCompare(b))
  return files
}

async function walkDir(dir, cwd, gitignorePatterns, files) {
  const entries = await readdir(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    const rel = relative(cwd, fullPath)

    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue
      if (gitignorePatterns.length && matchesGitignore(rel, gitignorePatterns)) continue
      await walkDir(fullPath, cwd, gitignorePatterns, files)
    } else if (entry.isFile()) {
      if (!VALID_EXTENSIONS.has(extname(entry.name))) continue
      if (gitignorePatterns.length && matchesGitignore(rel, gitignorePatterns)) continue
      files.push(fullPath)
    }
  }
}

async function main() {
  const cwd = process.cwd()
  const parsed = parseArgs(process.argv)

  if (parsed.help || !parsed.path) {
    process.stderr.write(USAGE + '\n')
    process.exit(2)
  }

  const { format } = await import('./src/format.js')

  const gitignorePatterns = await loadGitignorePatterns(cwd)
  let files
  try {
    files = await discoverFiles(parsed.path, cwd, gitignorePatterns)
  } catch (err) {
    process.stderr.write(`error: ${parsed.path}: ${err.message}\n`)
    process.exit(2)
  }

  let changeCount = 0
  let hadError = false

  for (const filePath of files) {
    const rel = relative(cwd, filePath)
    let source
    try {
      source = await readFile(filePath, 'utf-8')
    } catch (err) {
      process.stderr.write(`error: ${rel}: ${err.message}\n`)
      hadError = true
      continue
    }

    let result
    try {
      result = await format(source)
    } catch (err) {
      process.stderr.write(`error: ${rel}: ${err.message}\n`)
      hadError = true
      continue
    }

    if (result.changed) {
      changeCount++
      if (parsed.check) {
        process.stdout.write(`needs formatting: ${rel}\n`)
      } else {
        await writeFile(filePath, result.code, 'utf-8')
        process.stdout.write(`formatted: ${rel}\n`)
      }
    }
  }

  if (parsed.check) {
    process.stdout.write(`${changeCount} file(s) need formatting.\n`)
  } else {
    process.stdout.write(`${changeCount} file(s) formatted.\n`)
  }

  if (hadError) process.exit(2)
  if (changeCount > 0) process.exit(1)
  process.exit(0)
}

main()
