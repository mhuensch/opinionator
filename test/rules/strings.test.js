import { test } from 'node:test'
import assert from 'node:assert/strict'
import { format } from '../../src/format.js'

// ─── Single quotes ─────────────────────────────────────

test('converts double quotes to single quotes', async () => {
  const input = `const x = "hello"\n`
  const result = await format(input)
  assert.equal(result.code, `const x = 'hello'\n`)
})

test('preserves already single-quoted strings', async () => {
  const input = `const x = 'hello'\n`
  const result = await format(input)
  assert.equal(result.code, `const x = 'hello'\n`)
})

test('escapes single quotes inside strings', async () => {
  const input = `const x = "it's"\n`
  const result = await format(input)
  assert.equal(result.code, `const x = 'it\\'s'\n`)
})

test('handles strings with both quote types', async () => {
  const input = `const x = "hello 'world'"\n`
  const result = await format(input)
  assert.ok(result.code.includes("'hello \\'world\\''"))
})

// ─── Template literals ─────────────────────────────────

test('preserves template literals', async () => {
  const input = 'const x = `hello ${name}`\n'
  const result = await format(input)
  assert.ok(result.code.includes('`hello ${name}`'))
})

test('preserves template literals with expressions', async () => {
  const input = 'const msg = `${a} + ${b} = ${a + b}`\n'
  const result = await format(input)
  assert.ok(result.code.includes('`${a} + ${b} = ${a + b}`'))
})

// ─── Double quotes in import sources ────────────────────

test('converts double quotes in import sources to single quotes', async () => {
  const input = `import foo from "bar"\n`
  const result = await format(input)
  assert.ok(result.code.includes("from 'bar'"))
  assert.ok(!result.code.includes('from "bar"'))
})

// ─── Empty strings ──────────────────────────────────────

test('handles empty strings with single quotes', async () => {
  const input = `const x = ""\n`
  const result = await format(input)
  assert.equal(result.code, `const x = ''\n`)
})

// ─── Strings with special characters ────────────────────

test('handles strings with newlines', async () => {
  const input = `const x = "hello\\nworld"\n`
  const result = await format(input)
  assert.ok(result.code.includes("'hello\\nworld'"))
})

test('handles strings with backslashes', async () => {
  const input = `const x = "path\\\\to\\\\file"\n`
  const result = await format(input)
  assert.ok(result.code.includes("'path\\\\to\\\\file'"))
})
