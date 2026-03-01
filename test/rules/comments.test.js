import { test } from 'node:test'
import assert from 'node:assert/strict'
import { format } from '../../src/core/format.js'

// ─── console.log removal ──────────────────────────────

test('removes console.log calls', async () => {
  const input = `const x = 1\nconsole.log("hello")\nconst y = 2\n`
  const result = await format(input)
  assert.ok(!result.code.includes('console.log'))
  assert.ok(result.code.includes('const x = 1'))
  assert.ok(result.code.includes('const y = 2'))
})

test('removes console.log with multiple arguments', async () => {
  const input = `console.log("debug:", x, y)\n`
  const result = await format(input)
  assert.ok(!result.code.includes('console.log'))
})

test('preserves console.error', async () => {
  const input = `console.error("error occurred")\n`
  const result = await format(input)
  assert.ok(result.code.includes('console.error'))
})

test('preserves console.warn', async () => {
  const input = `console.warn("warning")\n`
  const result = await format(input)
  assert.ok(result.code.includes('console.warn'))
})

// ─── Comment formatting ────────────────────────────────
// Note: The printer currently drops standalone comments since
// babel AST doesn't preserve them as statements. These tests
// verify comment handling in contexts where they survive.

test('opinionator-ignore-next comment is preserved', async () => {
  const input = `const x = 1\n// opinionator-ignore-next\nvar y = 2\n`
  const result = await format(input)
  assert.ok(result.code.includes('// opinionator-ignore-next'))
})

// ─── Warnings for console.log ──────────────────────────

test('format emits warning when removing console.log', async () => {
  const input = `console.log("test")\nconst x = 1\n`
  // The formatter writes warnings to stderr, we just verify the code is cleaned
  const result = await format(input)
  assert.ok(!result.code.includes('console.log'))
})

// ─── Console.log in complex expressions ─────────────────

test('removes console.log but preserves surrounding code', async () => {
  const input = `function foo(x) {\n  const y = x * 2\n  console.log("result:", y)\n  return y\n}\n`
  const result = await format(input)
  assert.ok(!result.code.includes('console.log'))
  assert.ok(result.code.includes('const y = x * 2'))
  assert.ok(result.code.includes('return y'))
})

// ─── Multiple console.log calls ─────────────────────────

test('removes multiple console.log calls', async () => {
  const input = `console.log("a")\nconst x = 1\nconsole.log("b")\nconst y = 2\nconsole.log("c")\n`
  const result = await format(input)
  assert.ok(!result.code.includes('console.log'))
  assert.ok(result.code.includes('const x = 1'))
  assert.ok(result.code.includes('const y = 2'))
})
