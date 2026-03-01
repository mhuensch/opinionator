import { test } from 'node:test'
import assert from 'node:assert/strict'
import { format } from '../../src/core/format.js'

// ─── == to === conversion ──────────────────────────────

test('converts == to === for non-null comparisons', async () => {
  const input = `if (x == 1) {}\n`
  const result = await format(input)
  assert.ok(result.code.includes('==='))
  assert.ok(!result.code.includes(' == '))
})

test('converts != to !== for non-null comparisons', async () => {
  const input = `if (x != 1) {}\n`
  const result = await format(input)
  assert.ok(result.code.includes('!=='))
  assert.ok(!result.code.includes(' != '))
})

// ─── == null preserved ─────────────────────────────────

test('preserves == null for existence checks', async () => {
  const input = `if (x == null) {}\n`
  const result = await format(input)
  assert.ok(result.code.includes('== null'))
})

test('preserves != null for existence checks', async () => {
  const input = `if (x != null) {}\n`
  const result = await format(input)
  assert.ok(result.code.includes('!= null'))
})

// ─── == undefined preserved ────────────────────────────

test('preserves == undefined for property existence checks', async () => {
  const input = `if (x == undefined) {}\n`
  const result = await format(input)
  assert.ok(result.code.includes('== undefined'))
})

test('preserves !== undefined', async () => {
  const input = `if (x !== undefined) {}\n`
  const result = await format(input)
  assert.ok(result.code.includes('!== undefined'))
})

// ─── Boolean comparisons ───────────────────────────────

test('preserves === true', async () => {
  const input = `if (x === true) {}\n`
  const result = await format(input)
  assert.ok(result.code.includes('=== true'))
})

test('preserves === false', async () => {
  const input = `if (x === false) {}\n`
  const result = await format(input)
  assert.ok(result.code.includes('=== false'))
})

test('converts == true to === true', async () => {
  const input = `if (x == true) {}\n`
  const result = await format(input)
  assert.ok(result.code.includes('=== true'))
})

test('converts == false to === false', async () => {
  const input = `if (x == false) {}\n`
  const result = await format(input)
  assert.ok(result.code.includes('=== false'))
})

test('converts !expr to expr === false', async () => {
  const input = `if (!x) {}\n`
  const result = await format(input)
  assert.ok(result.code.includes('x === false'))
  assert.ok(!result.code.includes('!x'))
})

// ─── Conditional expressions ────────────────────────────

test('preserves short ternary inline', async () => {
  const input = `const x = a ? 1 : 2\n`
  const result = await format(input)
  assert.equal(result.code, `const x = a ? 1 : 2\n`)
})

// ─── If statement spacing ──────────────────────────────

test('adds spaces inside if condition parentheses', async () => {
  const input = `if (x) { y() }\n`
  const result = await format(input)
  assert.ok(result.code.includes('if ( x )'))
})

test('adds spaces inside for condition parentheses', async () => {
  const input = `for (let i = 0; i < 10; i++) { x() }\n`
  const result = await format(input)
  assert.ok(result.code.includes('for ('))
  assert.ok(result.code.includes(') {'))
})

test('adds spaces inside while condition parentheses', async () => {
  const input = `while (x) { y() }\n`
  const result = await format(input)
  assert.ok(result.code.includes('while ( x )'))
})

// ─── Switch statement ───────────────────────────────────

test('formats switch statements', async () => {
  const input = `switch (x) {\n  case 1:\n    a()\n    break\n  default:\n    b()\n}\n`
  const result = await format(input)
  assert.ok(result.code.includes('switch ( x )'))
  assert.ok(result.code.includes('case 1:'))
  assert.ok(result.code.includes('default:'))
})
