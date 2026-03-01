import { test } from 'node:test'
import assert from 'node:assert/strict'
import { format } from '../../src/core/format.js'

// ─── node: prefix for built-ins ─────────────────────────

test('adds node: prefix to built-in imports', async () => {
  const input = `import fs from "fs"\n`
  const result = await format(input)
  assert.equal(result.code, `import fs from 'node:fs'\n`)
})

test('adds node: prefix to named built-in imports', async () => {
  const input = `import { readFile } from "fs"\n`
  const result = await format(input)
  assert.equal(result.code, `import { readFile } from 'node:fs'\n`)
})

test('preserves existing node: prefix', async () => {
  const input = `import fs from "node:fs"\n`
  const result = await format(input)
  assert.equal(result.code, `import fs from 'node:fs'\n`)
})

test('adds node: prefix to path module', async () => {
  const input = `import path from "path"\n`
  const result = await format(input)
  assert.equal(result.code, `import path from 'node:path'\n`)
})

// ─── File extensions for ESM imports ────────────────────

test('preserves file extensions on relative imports', async () => {
  const input = `import { helper } from "./utils.js"\n`
  const result = await format(input)
  assert.ok(result.code.includes('./utils.js'))
})

// ─── Import ordering ───────────────────────────────────

test('orders imports: built-in, external, internal', async () => {
  const input = `import express from "express"\nimport fs from "fs"\nimport { helper } from "./utils.js"\n`
  const result = await format(input)
  const lines = result.code.split('\n').filter(l => l.trim())
  // First should be built-in (fs)
  assert.ok(lines[0].includes('node:fs'))
  // Then external (express) after blank line
  assert.ok(result.code.indexOf('node:fs') < result.code.indexOf('express'))
  // Then internal (utils) after blank line
  assert.ok(result.code.indexOf('express') < result.code.indexOf('./utils.js'))
})

test('adds blank line between import groups', async () => {
  const input = `import fs from "fs"\nimport express from "express"\nimport { helper } from "./utils.js"\n`
  const result = await format(input)
  // Should have blank lines between groups
  const groups = result.code.split('\n\n').filter(g => g.trim())
  assert.ok(groups.length >= 3, 'Expected at least 3 groups separated by blank lines')
})

// ─── Sort within group ─────────────────────────────────

test('sorts imports alphabetically within group', async () => {
  const input = `import path from "path"\nimport fs from "fs"\n`
  const result = await format(input)
  assert.ok(result.code.indexOf('node:fs') < result.code.indexOf('node:path'))
})

// ─── Named imports sorted ───────────────────────────────

test('sorts named imports alphabetically', async () => {
  const input = `import { c, a, b } from "./mod.js"\n`
  const result = await format(input)
  assert.equal(result.code, `import { a, b, c } from './mod.js'\n`)
})

test('sorts named imports with many specifiers', async () => {
  const input = `import { readFile, writeFile, appendFile } from "fs"\n`
  const result = await format(input)
  assert.ok(result.code.includes('{ appendFile, readFile, writeFile }'))
})

// ─── Merge duplicate imports ────────────────────────────

test('merges duplicate imports from same module', async () => {
  const input = `import { a } from "./mod.js"\nimport { b } from "./mod.js"\n`
  const result = await format(input)
  assert.equal(result.code, `import { a, b } from './mod.js'\n`)
})

test('merges default and named imports from same module', async () => {
  const input = `import fs from "fs"\nimport { readFile, writeFile } from "fs"\n`
  const result = await format(input)
  // Should merge into single import
  assert.ok(result.code.includes('fs'))
  assert.ok(result.code.includes('readFile'))
  // Only one import line for fs
  const fs_lines = result.code.split('\n').filter(l => l.includes('node:fs'))
  assert.equal(fs_lines.length, 1)
})

// ─── Single quotes in import sources ────────────────────

test('uses single quotes for import sources', async () => {
  const input = `import foo from "bar"\n`
  const result = await format(input)
  assert.ok(result.code.includes("'bar'"))
  assert.ok(!result.code.includes('"bar"'))
})

// ─── Side-effect imports ────────────────────────────────

test('preserves side-effect imports', async () => {
  const input = `import "./setup.js"\n`
  const result = await format(input)
  assert.ok(result.code.includes("'./setup.js'"))
})

// ─── Namespace imports ──────────────────────────────────

test('preserves namespace imports', async () => {
  const input = `import * as utils from "./utils.js"\n`
  const result = await format(input)
  assert.ok(result.code.includes('* as utils'))
})
