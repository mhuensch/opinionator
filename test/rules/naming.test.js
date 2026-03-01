import { test } from 'node:test'
import assert from 'node:assert/strict'
import { format } from '../../src/core/format.js'

// ─── Variables: snake_case ──────────────────────────────

test('converts camelCase variables to snake_case', async () => {
  const input = `const myVariable = 1\n`
  const result = await format(input)
  assert.equal(result.code, `const my_variable = 1\n`)
})

test('converts camelCase let variables to snake_case', async () => {
  const input = `let myCounter = 0\n`
  const result = await format(input)
  assert.equal(result.code, `let my_counter = 0\n`)
})

test('preserves already snake_case variables', async () => {
  const input = `const my_var = 1\n`
  const result = await format(input)
  assert.equal(result.code, `const my_var = 1\n`)
})

// ─── Module constants: SCREAMING_SNAKE_CASE ─────────────

test('preserves SCREAMING_SNAKE_CASE constants', async () => {
  const input = `const MAX_RETRIES = 5\n`
  const result = await format(input)
  assert.equal(result.code, `const MAX_RETRIES = 5\n`)
})

test('preserves multi-word SCREAMING_SNAKE_CASE', async () => {
  const input = `const DEFAULT_TIMEOUT = 3000\n`
  const result = await format(input)
  assert.equal(result.code, `const DEFAULT_TIMEOUT = 3000\n`)
})

// ─── Functions: camelCase ───────────────────────────────

test('converts snake_case function names to camelCase', async () => {
  const input = `function process_data(x) { return x }\n`
  const result = await format(input)
  assert.ok(result.code.includes('function processData'))
})

test('preserves already camelCase function names', async () => {
  const input = `function processData(x) { return x }\n`
  const result = await format(input)
  assert.ok(result.code.includes('function processData'))
})

// ─── Classes: PascalCase ────────────────────────────────

test('converts snake_case class names to PascalCase', async () => {
  const input = `class my_class {}\n`
  const result = await format(input)
  assert.ok(result.code.includes('class MyClass'))
})

test('converts camelCase class names to PascalCase', async () => {
  const input = `class dataProcessor {}\n`
  const result = await format(input)
  assert.ok(result.code.includes('class DataProcessor'))
})

test('preserves already PascalCase class names', async () => {
  const input = `class DataProcessor {}\n`
  const result = await format(input)
  assert.ok(result.code.includes('class DataProcessor'))
})

// ─── Private methods: _camelCase ────────────────────────

test('converts private method names to _camelCase', async () => {
  const input = `class Foo {\n  _process_item(x) { return x }\n}\n`
  const result = await format(input)
  assert.ok(result.code.includes('_processItem'))
})

test('preserves already _camelCase private methods', async () => {
  const input = `class Foo {\n  _processItem(x) { return x }\n}\n`
  const result = await format(input)
  assert.ok(result.code.includes('_processItem'))
})

// ─── var → const ────────────────────────────────────────

test('converts var to const', async () => {
  const input = `var x = 1\n`
  const result = await format(input)
  assert.equal(result.code, `const x = 1\n`)
})

test('converts var to const for objects', async () => {
  const input = `var config = {}\n`
  const result = await format(input)
  assert.ok(result.code.startsWith('const'))
})

// ─── let preserved when reassigned ─────────────────────

test('preserves let when variable is reassigned', async () => {
  const input = `let x = 0\nx = 1\n`
  const result = await format(input)
  assert.ok(result.code.includes('let x = 0'))
})

// ─── Destructuring not renamed ─────────────────────────

test('does not rename destructured variables', async () => {
  const input = `const { firstName, lastName } = person\n`
  const result = await format(input)
  assert.ok(result.code.includes('{ firstName, lastName }'))
})

test('does not rename array destructuring', async () => {
  const input = `const [first, second] = items\n`
  const result = await format(input)
  assert.ok(result.code.includes('[ first, second ]'))
})
