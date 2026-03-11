// opinionator-ignore-file
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { format } from '../../src/format.js'

test('adds node: prefix to built-in imports', async (  ) => {
  const input = `import fs from "fs"\n`
  const result = await format(input)
  assert.equal(result.code, `import fs from 'node:fs'\n`)
})

test('adds node: prefix to named built-in imports', async (  ) => {
  const input = `import { readFile } from "fs"\n`
  const result = await format(input)
  assert.equal(result.code, `import { readFile } from 'node:fs'\n`)
})

test('preserves existing node: prefix', async (  ) => {
  const input = `import fs from "node:fs"\n`
  const result = await format(input)
  assert.equal(result.code, `import fs from 'node:fs'\n`)
})

test('adds node: prefix to path module', async (  ) => {
  const input = `import path from "path"\n`
  const result = await format(input)
  assert.equal(result.code, `import path from 'node:path'\n`)
})

test('preserves file extensions on relative imports', async (  ) => {
  const input = `import { helper } from "./utils.js"\n`
  const result = await format(input)
  assert.ok(result.code.includes('./utils.js'))
})

test('adds .js extension to relative imports missing extension', async (  ) => {
  const input = `import { helper } from "./utils"\n`
  const result = await format(input)
  assert.equal(result.code, `import { helper } from './utils.js'\n`)
})

test('adds .js extension to relative imports with subdirectory', async (  ) => {
  const input = `import { foo } from "../lib/parser"\n`
  const result = await format(input)
  assert.ok(result.code.includes('../lib/parser.js'))
})

test('does not add extension to package imports', async (  ) => {
  const input = `import express from "express"\n`
  const result = await format(input)
  assert.ok(result.code.includes('\'express\''))
  assert.ok(result.code.includes('express.js') === false)
})

test('does not add extension to node: imports', async (  ) => {
  const input = `import fs from "node:fs"\n`
  const result = await format(input)
  assert.equal(result.code, `import fs from 'node:fs'\n`)
})

test('preserves .mjs and .cjs extensions', async (  ) => {
  const input = `import { a } from "./config.mjs"\n`
  const result = await format(input)
  assert.ok(result.code.includes('./config.mjs'))
})

test('does not double-add .js extension', async (  ) => {
  const input = `import { a } from "./mod.js"\n`
  const result = await format(input)
  assert.ok(result.code.includes('.js.js') === false)
})

test('orders imports: built-in, external, internal', async (  ) => {
  const input = `import express from "express"\nimport fs from "fs"\nimport { helper } from "./utils.js"\n`
  const result = await format(input)
  const lines = result.code.split('\n').filter(( l ) => l.trim())
  assert.ok(lines[0].includes('node:fs'))
  assert.ok(result.code.indexOf('node:fs') < result.code.indexOf('express'))
  assert.ok(result.code.indexOf('express') < result.code.indexOf('./utils.js'))
})

test('adds blank line between import groups', async (  ) => {
  const input = `import fs from "fs"\nimport express from "express"\nimport { helper } from "./utils.js"\n`
  const result = await format(input)
  const groups = result.code.split('\n\n').filter(( g ) => g.trim())
  assert.ok(groups.length >= 3, 'Expected at least 3 groups separated by blank lines')
})

test('sorts imports alphabetically within group', async (  ) => {
  const input = `import path from "path"\nimport fs from "fs"\n`
  const result = await format(input)
  assert.ok(result.code.indexOf('node:fs') < result.code.indexOf('node:path'))
})

test('sorts named imports alphabetically', async (  ) => {
  const input = `import { c, a, b } from "./mod.js"\n`
  const result = await format(input)
  assert.equal(result.code, `import { a, b, c } from './mod.js'\n`)
})

test('sorts named imports with many specifiers', async (  ) => {
  const input = `import { readFile, writeFile, appendFile } from "fs"\n`
  const result = await format(input)
  assert.ok(result.code.includes('{ appendFile, readFile, writeFile }'))
})

test('merges duplicate imports from same module', async (  ) => {
  const input = `import { a } from "./mod.js"\nimport { b } from "./mod.js"\n`
  const result = await format(input)
  assert.equal(result.code, `import { a, b } from './mod.js'\n`)
})

test('merges default and named imports from same module', async (  ) => {
  const input = `import fs from "fs"\nimport { readFile, writeFile } from "fs"\n`
  const result = await format(input)
  assert.ok(result.code.includes('fs'))
  assert.ok(result.code.includes('readFile'))
  const fs_lines = result.code.split('\n').filter(( l ) => l.includes('node:fs'))
  assert.equal(fs_lines.length, 1)
})

test('uses single quotes for import sources', async (  ) => {
  const input = `import foo from "bar"\n`
  const result = await format(input)
  assert.ok(result.code.includes('\'bar\''))
  assert.ok(result.code.includes('"bar"') === false)
})

test('preserves side-effect imports', async (  ) => {
  const input = `import "./setup.js"\n`
  const result = await format(input)
  assert.ok(result.code.includes('\'./setup.js\''))
})

test('preserves namespace imports', async (  ) => {
  const input = `import * as utils from "./utils.js"\n`
  const result = await format(input)
  assert.ok(result.code.includes('* as utils'))
})

test('removes unused named import', async (  ) => {
  const input = `import { foo } from './mod.js'\nconst x = 1\n`
  const result = await format(input)
  assert.ok(result.code.includes('foo') === false)
})

test('keeps used named import', async (  ) => {
  const input = `import { foo } from './mod.js'\nconst x = foo()\n`
  const result = await format(input)
  assert.ok(result.code.includes('foo'))
})

test('removes unused default import', async (  ) => {
  const input = `import Foo from './mod.js'\nconst x = 1\n`
  const result = await format(input)
  assert.ok(result.code.includes('Foo') === false)
})

test('keeps used default import', async (  ) => {
  const input = `import Foo from './mod.js'\nconst x = new Foo()\n`
  const result = await format(input)
  assert.ok(result.code.includes('Foo'))
})

test('always keeps side-effect import even with other code', async (  ) => {
  const input = `import './setup.js'\nconst x = 1\n`
  const result = await format(input)
  assert.ok(result.code.includes('./setup.js'))
})

test('removes unused specifiers but keeps used ones', async (  ) => {
  const input = `import { foo, bar, baz } from './mod.js'\nconst x = bar()\n`
  const result = await format(input)
  assert.ok(result.code.includes('bar'))
  assert.ok(result.code.includes('foo') === false)
  assert.ok(result.code.includes('baz') === false)
})

test('removes entire import when all specifiers unused', async (  ) => {
  const input = `import { foo, bar } from './mod.js'\nconst x = 1\n`
  const result = await format(input)
  assert.ok(result.code.includes('./mod.js') === false)
})

test('removes unused namespace import', async (  ) => {
  const input = `import * as utils from './utils.js'\nconst x = 1\n`
  const result = await format(input)
  assert.ok(result.code.includes('utils') === false)
  assert.ok(result.code.includes('./utils.js') === false)
})

test('keeps used namespace import', async (  ) => {
  const input = `import * as utils from './utils.js'\nconst x = utils.helper()\n`
  const result = await format(input)
  assert.ok(result.code.includes('* as utils'))
})
