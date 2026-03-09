import { test } from 'node:test'
import assert from 'node:assert/strict'
import { format } from '../../src/format.js'

// ─── Elm-style objects ──────────────────────────────────

test('formats object literal in elm style with leading commas', async () => {
  const input = `const obj = { a: 1, b: 2, c: 3 }\n`
  const result = await format(input)
  assert.equal(result.code, `const obj =\n  { a: 1\n  , b: 2\n  , c: 3\n  }\n`)
})

test('formats multi-line object in elm style', async () => {
  const input = `const obj = {\n  alpha: 1,\n  beta: 2,\n  gamma: 3\n}\n`
  const result = await format(input)
  assert.equal(result.code, `const obj =\n  { alpha: 1\n  , beta: 2\n  , gamma: 3\n  }\n`)
})

test('handles empty object on same line', async () => {
  // Per spec, empty objects should stay inline
  // Note: printer currently puts empty objects on next line (possible bug)
  const input = `const obj = {}\n`
  const result = await format(input)
  assert.equal(result.code, `const obj = {}\n`)
})

test('nested objects use elm style with alignment', async () => {
  const input = `const config = {\n  host: "localhost",\n  db: {\n    name: "mydb",\n    pool: 5\n  }\n}\n`
  const result = await format(input)
  // Nested object should be formatted elm style
  assert.ok(result.code.includes('{ host:'))
  assert.ok(result.code.includes(', db:'))
  assert.ok(result.code.includes('{ name:'))
})

// ─── No trailing commas ────────────────────────────────

test('no trailing commas in elm-style objects', async () => {
  const input = `const obj = {\n  a: 1,\n  b: 2,\n}\n`
  const result = await format(input)
  // Leading commas, no trailing
  assert.ok(!result.code.match(/,\s*\}/))
})

// ─── One property per line ──────────────────────────────

test('one property per line in elm-style objects', async () => {
  const input = `const obj = { a: 1, b: 2, c: 3 }\n`
  const result = await format(input)
  const lines = result.code.split('\n')
  // Should have opening brace line, comma lines, and closing brace
  assert.ok(lines.some(l => l.trim().startsWith('{ a:')))
  assert.ok(lines.some(l => l.trim().startsWith(', b:')))
  assert.ok(lines.some(l => l.trim().startsWith(', c:')))
})

// ─── Elm-style arrays ──────────────────────────────────

test('simple arrays stay inline when short', async () => {
  // Per spec, short simple arrays should stay inline
  // Note: printer currently puts arrays on next line in assignments (possible bug)
  const input = `const arr = [1, 2, 3, 4, 5]\n`
  const result = await format(input)
  assert.equal(result.code, `const arr = [ 1, 2, 3, 4, 5 ]\n`)
})

test('handles empty array on same line', async () => {
  // Per spec, empty arrays should stay inline
  // Note: printer currently puts empty arrays on next line (possible bug)
  const input = `const arr = []\n`
  const result = await format(input)
  assert.equal(result.code, `const arr = []\n`)
})

test('array of objects uses elm style', async () => {
  const input = `const arr = [\n  { name: "alice" },\n  { name: "bob" }\n]\n`
  const result = await format(input)
  // Should use elm-style with leading commas
  assert.ok(result.code.includes('[ {'))
  assert.ok(result.code.includes(', {'))
})

// ─── Object key quoting ────────────────────────────────

test('removes unnecessary quotes from object keys', async () => {
  const input = `const obj = { "normal": 1, "another": 2 }\n`
  const result = await format(input)
  assert.ok(result.code.includes('normal:'))
  assert.ok(result.code.includes('another:'))
  assert.ok(!result.code.includes('"normal"'))
})

test('keeps quotes on kebab-case keys', async () => {
  const input = `const obj = { "kebab-key": 1 }\n`
  const result = await format(input)
  assert.ok(result.code.includes("'kebab-key':"))
})

test('uses single quotes for quoted keys', async () => {
  const input = `const obj = { "kebab-key": 1 }\n`
  const result = await format(input)
  assert.ok(result.code.includes("'kebab-key'"))
  assert.ok(!result.code.includes('"kebab-key"'))
})

// ─── Spread in objects ──────────────────────────────────

test('preserves spread in objects', async () => {
  const input = `const obj = { ...defaults, a: 1 }\n`
  const result = await format(input)
  assert.ok(result.code.includes('...defaults'))
})

// ─── Nested elm-style property values ───────────────────

test('nested object property value starts on next line', async () => {
  const input = `const config = { options: { a: 1, b: 2 } }\n`
  const result = await format(input)
  assert.equal(result.code, `const config =\n  { options:\n    { a: 1\n    , b: 2\n    }\n  }\n`)
})

test('nested array property value starts on next line', async () => {
  const input = `const config = { plugins: ['jsx', 'classProperties', 'optionalChaining', 'nullishCoalescingOperator'] }\n`
  const result = await format(input)
  const lines = result.code.split('\n')
  const plugins_idx = lines.findIndex( ( l ) => l.includes('plugins:') )
  assert.ok(plugins_idx >= 0, 'should have plugins: line')
  assert.ok(!lines[plugins_idx].includes('['), 'array should not start on same line as key')
  assert.ok(lines[plugins_idx + 1]?.trim().startsWith('['), 'array should start on next line')
})
