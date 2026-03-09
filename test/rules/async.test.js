// opinionator-ignore-file
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { format } from '../../src/format.js'

// ─── forEach with async callback ────────────────────────

test('throws ASYNC_FOREACH for forEach with async arrow', async () => {
  const input = `items.forEach(async (item) => { await process(item) })\n`
  await assert.rejects(() => format(input), { code: 'ASYNC_FOREACH' })
})

test('throws ASYNC_FOREACH for forEach with async function expression', async () => {
  const input = `items.forEach(async function (item) { await process(item) })\n`
  await assert.rejects(() => format(input), { code: 'ASYNC_FOREACH' })
})

test('does not throw for forEach with sync callback', async () => {
  const input = `items.forEach((item) => { process(item) })\n`
  const result = await format(input)
  assert.ok(result.code, 'sync forEach should pass')
})

test('does not throw for map with async callback', async () => {
  const input = `const results = items.map(async (item) => { return await process(item) })\n`
  const result = await format(input)
  assert.ok(result.code, 'async map should pass')
})

test('async forEach error includes actionable message', async () => {
  const input = `items.forEach(async (item) => { await process(item) })\n`
  try {
    await format(input)
    assert.fail('should have thrown')
  }
  catch (err) {
    assert.equal(err.code, 'ASYNC_FOREACH')
    assert.ok(err.message.includes('forEach'), 'should mention forEach')
    assert.ok(err.message.includes('for...of'), 'should suggest for...of')
    assert.ok(err.result, 'should include formatted result')
    assert.ok(err.result.code, 'result should have code')
  }
})

// ─── Floating promises (.then without .catch) ───────────

test('throws FLOATING_PROMISE for .then() without .catch()', async () => {
  const input = `fetchData().then((data) => { process(data) })\n`
  await assert.rejects(() => format(input), { code: 'FLOATING_PROMISE' })
})

test('does not throw for .then().catch() chain', async () => {
  const input = `fetchData().then((data) => { process(data) }).catch((err) => { handle(err) })\n`
  const result = await format(input)
  assert.ok(result.code, 'then+catch should pass')
})

test('does not throw for await expression', async () => {
  const input = `async function foo () {\n  const data = await fetchData()\n}\n`
  const result = await format(input)
  assert.ok(result.code, 'await should pass')
})

test('does not throw for void promise', async () => {
  const input = `void doThing()\n`
  const result = await format(input)
  assert.ok(result.code, 'void promise should pass')
})

test('floating promise error includes actionable message', async () => {
  const input = `fetchData().then((data) => { process(data) })\n`
  try {
    await format(input)
    assert.fail('should have thrown')
  }
  catch (err) {
    assert.equal(err.code, 'FLOATING_PROMISE')
    assert.ok(err.message.includes('.then()'), 'should mention .then()')
    assert.ok(err.message.includes('.catch()'), 'should mention .catch()')
    assert.ok(err.result, 'should include formatted result')
  }
})
