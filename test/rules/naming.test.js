import { test } from 'node:test'
import assert from 'node:assert/strict'
import { format } from '../../src/format.js'

// ─── Variables: snake_case ──────────────────────────────

test('throws on camelCase variable with naming violation details', async () => {
  const input = `const myVariable = 1\n`
  const err = await assert.rejects(() => format(input), { code: 'NAMING_VIOLATION' })
})

test('throws on camelCase let variable', async () => {
  await assert.rejects(() => format(`let myCounter = 0\n`), { code: 'NAMING_VIOLATION' })
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

test('throws on snake_case function name', async () => {
  await assert.rejects(() => format(`function process_data(x) { return x }\n`), { code: 'NAMING_VIOLATION' })
})

test('preserves already camelCase function names', async () => {
  const input = `function processData(x) { return x }\n`
  const result = await format(input)
  assert.ok(result.code.includes('function processData'))
})

// ─── Classes: PascalCase ────────────────────────────────

test('throws on snake_case class name', async () => {
  await assert.rejects(() => format(`class my_class {}\n`), { code: 'NAMING_VIOLATION' })
})

test('throws on camelCase class name', async () => {
  await assert.rejects(() => format(`class dataProcessor {}\n`), { code: 'NAMING_VIOLATION' })
})

test('preserves already PascalCase class names', async () => {
  const input = `class DataProcessor {}\n`
  const result = await format(input)
  assert.ok(result.code.includes('class DataProcessor'))
})

// ─── Private methods: _camelCase ────────────────────────

test('throws on _snake_case private method name', async () => {
  await assert.rejects(
    () => format(`class Foo {\n  _process_item(x) { return x }\n}\n`),
    { code: 'NAMING_VIOLATION' }
  )
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

// ─── Naming violation error details ─────────────────────

test('error includes all naming violations in message', async () => {
  const input = `const myVariable = 1\n`
  try {
    await format(input)
    assert.fail('should have thrown')
  }
  catch (err) {
    assert.equal(err.code, 'NAMING_VIOLATION')
    assert.ok(err.message.includes('myVariable'), 'should mention original name')
    assert.ok(err.message.includes('my_variable'), 'should mention expected name')
  }
})

test('error includes formatted code in result property', async () => {
  const input = `const myVariable = 1\n`
  try {
    await format(input)
    assert.fail('should have thrown')
  }
  catch (err) {
    assert.ok(err.result, 'error should have result property')
    assert.ok(err.result.code, 'result should have code')
    assert.ok(err.result.warnings.length > 0, 'result should have warnings')
    assert.ok(err.result.code.includes('const myVariable'), 'code should preserve original name')
  }
})

test('error result contains warnings array for AI agent consumption', async () => {
  const input = `function process_data(x) { return x }\nclass my_class {}\n`
  try {
    await format(input)
    assert.fail('should have thrown')
  }
  catch (err) {
    assert.equal(err.code, 'NAMING_VIOLATION')
    const warnings = err.result.warnings
    const func_warning = warnings.find((w) => w.includes('process_data'))
    assert.ok(func_warning, 'should warn about function name')
    assert.ok(func_warning.includes('camelCase'), 'should mention convention')
    assert.ok(func_warning.includes('processData'), 'should suggest fix')
    const class_warning = warnings.find((w) => w.includes('my_class'))
    assert.ok(class_warning, 'should warn about class name')
    assert.ok(class_warning.includes('PascalCase'), 'should mention convention')
    assert.ok(class_warning.includes('MyClass'), 'should suggest fix')
  }
})

test('no error when names already follow conventions', async () => {
  const input = `const my_var = 1\nfunction processData(x) { return x }\nclass MyClass {}\n`
  const result = await format(input)
  assert.ok(result.code, 'should return formatted code without throwing')
})
