import { test } from 'node:test'
import assert from 'node:assert/strict'
import { format } from '../../src/format.js'

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
  const input = `if (x === true) { y() }\n`
  const result = await format(input)
  assert.ok(result.code.includes('if ( x === true )'))
})

test('adds spaces inside for condition parentheses', async () => {
  const input = `for (let i = 0; i < 10; i++) { x() }\n`
  const result = await format(input)
  assert.ok(result.code.includes('for ('))
  assert.ok(result.code.includes(') {'))
})

test('adds spaces inside while condition parentheses', async () => {
  const input = `while (x > 0) { y() }\n`
  const result = await format(input)
  assert.ok(result.code.includes('while ( x > 0 )'))
})

// ─── Switch statement ───────────────────────────────────

test('formats switch statements', async () => {
  const input = `switch (x) {\n  case 1:\n    a()\n    break\n  default:\n    b()\n}\n`
  const result = await format(input)
  assert.ok(result.code.includes('switch ( x )'))
  assert.ok(result.code.includes('case 1:'))
  assert.ok(result.code.includes('default:'))
})

// ─── Implicit truthy check detection ──────────────────

test('warns on implicit truthy check in if condition', async () => {
  const input = `if (x) { doThing() }\n`
  try {
    await format(input)
    assert.fail('should have thrown')
  }
  catch (err) {
    assert.equal(err.code, 'TRUTHY_CHECK')
    assert.ok(err.message.includes('Implicit truthy'), 'should mention implicit truthy')
  }
})

test('warns on implicit truthy in while condition', async () => {
  const input = `while (items.length) { items.pop() }\n`
  try {
    await format(input)
    assert.fail('should have thrown')
  }
  catch (err) {
    assert.equal(err.code, 'TRUTHY_CHECK')
  }
})

test('does not warn on explicit comparisons', async () => {
  const input = `if (x === true) { a() }\nif (y != null) { b() }\nif (z !== undefined) { c() }\n`
  const result = await format(input)
  assert.ok(result.code, 'explicit comparisons should pass')
})

test('does not warn on == null checks', async () => {
  const input = `if (x == null) { return }\n`
  const result = await format(input)
  assert.ok(result.code.includes('== null'))
})

test('does not warn on boolean literals in conditions', async () => {
  const input = `while (true) { break }\n`
  const result = await format(input)
  assert.ok(result.code.includes('while ( true )'))
})

test('does not warn on function calls in conditions', async () => {
  const input = `if (isValid(x)) { doThing() }\n`
  const result = await format(input)
  assert.ok(result.code, 'function call results are allowed')
})

// ─── Nested if detection ──────────────────────────────

test('throws NESTING_VIOLATION for if nested inside if', async () => {
  const input = `function foo(x, y) {\n  if (x) {\n    if (y) {\n      doThing()\n    }\n  }\n}\n`
  await assert.rejects(() => format(input), { code: 'NESTING_VIOLATION' })
})

test('throws NESTING_VIOLATION for if nested inside else block', async () => {
  const input = `function foo(x, y) {\n  if (x) {\n    a()\n  } else {\n    if (y) {\n      b()\n    }\n  }\n}\n`
  await assert.rejects(() => format(input), { code: 'NESTING_VIOLATION' })
})

test('else-if chains do not trigger nesting violation', async () => {
  const input = `function foo(x) {\n  if (x === 1) {\n    a()\n  } else if (x === 2) {\n    b()\n  } else {\n    c()\n  }\n}\n`
  const result = await format(input)
  assert.ok(result.code.includes('else if'), 'else-if chain should be fine')
})

test('if inside a loop inside an if does not trigger nesting', async () => {
  const input = `function foo(items) {\n  if (items.length > 0) {\n    for (const item of items) {\n      if (item.valid === true) {\n        process(item)\n      }\n    }\n  }\n}\n`
  const result = await format(input)
  assert.ok(result.code, 'loop separates the if statements')
})

test('nesting error includes actionable message', async () => {
  const input = `function foo(x, y) {\n  if (x) {\n    if (y) {\n      doThing()\n    }\n  }\n}\n`
  try {
    await format(input)
    assert.fail('should have thrown')
  }
  catch (err) {
    assert.equal(err.code, 'NESTING_VIOLATION')
    assert.ok(err.message.includes('nested'), 'should mention nesting')
    assert.ok(err.result, 'should include formatted result')
    assert.ok(err.result.code, 'result should have code')
    assert.ok(err.result.warnings.length > 0, 'result should have warnings')
  }
})

test('nesting error result contains formatted code', async () => {
  const input = `function foo(x, y) {\n  if (x) {\n    if (y) {\n      doThing()\n    }\n  }\n}\n`
  try {
    await format(input)
    assert.fail('should have thrown')
  }
  catch (err) {
    assert.ok(err.result.code.includes('if ( x )'), 'code should still be formatted')
    assert.ok(err.result.code.includes('if ( y )'), 'nested if should be in output')
  }
})
