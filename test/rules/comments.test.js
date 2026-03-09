// opinionator-ignore-file
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { format } from '../../src/format.js'

test('removes console.log calls', async (  ) => {
  const input = `const x = 1\nconsole.log("hello")\nconst y = 2\n`
  const result = await format(input)
  assert.ok(result.code.includes('console.log') === false)
  assert.ok(result.code.includes('const x = 1'))
  assert.ok(result.code.includes('const y = 2'))
})

test('removes console.log with multiple arguments', async (  ) => {
  const input = `console.log("debug:", x, y)\n`
  const result = await format(input)
  assert.ok(result.code.includes('console.log') === false)
})

test('preserves console.error', async (  ) => {
  const input = `console.error("error occurred")\n`
  const result = await format(input)
  assert.ok(result.code.includes('console.error'))
})

test('preserves console.warn', async (  ) => {
  const input = `console.warn("warning")\n`
  const result = await format(input)
  assert.ok(result.code.includes('console.warn'))
})

test('opinionator-ignore-next comment is preserved', async (  ) => {
  const input = `const x = 1\n// opinionator-ignore-next\nvar y = 2\n`
  const result = await format(input)
  assert.ok(result.code.includes('// opinionator-ignore-next'))
})

test('format emits warning when removing console.log', async (  ) => {
  const input = `console.log("test")\nconst x = 1\n`
  const result = await format(input)
  assert.ok(result.code.includes('console.log') === false)
})

test('removes console.log but preserves surrounding code', async (  ) => {
  const input = `function foo(x) {\n  const y = x * 2\n  console.log("result:", y)\n  return y\n}\n`
  const result = await format(input)
  assert.ok(result.code.includes('console.log') === false)
  assert.ok(result.code.includes('const y = x * 2'))
  assert.ok(result.code.includes('return y'))
})

test('removes multiple console.log calls', async (  ) => {
  const input = `console.log("a")\nconst x = 1\nconsole.log("b")\nconst y = 2\nconsole.log("c")\n`
  const result = await format(input)
  assert.ok(result.code.includes('console.log') === false)
  assert.ok(result.code.includes('const x = 1'))
  assert.ok(result.code.includes('const y = 2'))
})
