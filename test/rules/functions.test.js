import { test } from 'node:test'
import assert from 'node:assert/strict'
import { format } from '../../src/core/format.js'

// ─── Named function spacing ────────────────────────────

test('spaces inside function declaration params', async () => {
  const input = `function foo(a, b) { return a + b }\n`
  const result = await format(input)
  assert.equal(result.code, `function foo ( a, b ) {\n  return a + b\n}\n`)
})

test('empty params format correctly', async () => {
  const input = `function foo() { return 1 }\n`
  const result = await format(input)
  assert.ok(result.code.includes('function foo ()'))
})

// ─── Function name camelCase ────────────────────────────

test('converts snake_case function names to camelCase', async () => {
  const input = `function process_data(x) { return x }\n`
  const result = await format(input)
  assert.ok(result.code.includes('function processData'))
})

// ─── Two blank lines between top-level functions ────────

test('two blank lines between top-level function declarations', async () => {
  const input = `function foo() { return 1 }\nfunction bar() { return 2 }\n`
  const result = await format(input)
  assert.ok(result.code.includes('}\n\n\nfunction bar'))
})

test('two blank lines between function and class', async () => {
  const input = `function foo() { return 1 }\nclass Bar {}\n`
  const result = await format(input)
  assert.ok(result.code.includes('}\n\n\nclass Bar'))
})

// ─── Arrow functions: always include parens ─────────────

test('adds parentheses to single-param arrow functions', async () => {
  const input = `const f = x => x * 2\n`
  const result = await format(input)
  assert.ok(result.code.includes('( x ) =>'))
})

test('preserves parentheses on multi-param arrow functions', async () => {
  const input = `const f = (a, b) => a + b\n`
  const result = await format(input)
  assert.ok(result.code.includes('( a, b ) =>'))
})

test('arrow function with body block', async () => {
  const input = `const f = (x) => {\n  const doubled = x * 2\n  return doubled\n}\n`
  const result = await format(input)
  assert.ok(result.code.includes('( x ) => {'))
  assert.ok(result.code.includes('return doubled'))
})

// ─── Async functions ───────────────────────────────────

test('preserves async keyword on functions', async () => {
  const input = `async function fetchData(url) { return await fetch(url) }\n`
  const result = await format(input)
  assert.ok(result.code.includes('async function fetchData'))
})

test('preserves async arrow functions', async () => {
  const input = `const f = async (x) => await x\n`
  const result = await format(input)
  assert.ok(result.code.includes('async ( x ) =>'))
})

// ─── Generator functions ───────────────────────────────

test('preserves generator function syntax', async () => {
  const input = `function* gen() { yield 1 }\n`
  const result = await format(input)
  assert.ok(result.code.includes('function*'))
  assert.ok(result.code.includes('yield 1'))
})

// ─── Exported functions ────────────────────────────────

test('preserves export on function declarations', async () => {
  const input = `export function foo(x) { return x }\n`
  const result = await format(input)
  assert.ok(result.code.includes('export function foo'))
})

test('export async function', async () => {
  const input = `export async function foo(x) { return x }\n`
  const result = await format(input)
  assert.ok(result.code.includes('export async function foo'))
})

// ─── Default params ────────────────────────────────────

test('preserves default parameter values', async () => {
  const input = `function foo(x = 1, y = 2) { return x + y }\n`
  const result = await format(input)
  assert.ok(result.code.includes('x = 1'))
  assert.ok(result.code.includes('y = 2'))
})

// ─── Rest params ────────────────────────────────────────

test('preserves rest parameters', async () => {
  const input = `function foo(...args) { return args }\n`
  const result = await format(input)
  assert.ok(result.code.includes('...args'))
})

// ─── Function expression ───────────────────────────────

test('formats function expressions', async () => {
  const input = `const f = function(x) { return x }\n`
  const result = await format(input)
  assert.ok(result.code.includes('function ( x )'))
})

test('formats named function expressions', async () => {
  const input = `const f = function myFunc(x) { return x }\n`
  const result = await format(input)
  assert.ok(result.code.includes('function myFunc'))
})

// ─── Call expression spacing ────────────────────────────

test('function calls have no space before paren but spaces inside', async () => {
  const input = `foo(1, 2)\n`
  const result = await format(input)
  assert.equal(result.code, `foo( 1, 2 )\n`)
})

test('chained method calls have no space before paren but spaces inside', async () => {
  const input = `arr.map(x => x * 2).filter(x => x > 0)\n`
  const result = await format(input)
  assert.ok(result.code.includes('.map('))
  assert.ok(result.code.includes('.filter('))
})

// ─── Complex call arg extraction ────────────────────────

test('extracts complex object arg from long call to const', async () => {
  const input = `configure('production', { host: 'localhost', port: 3000, database: 'mydb', username: 'admin', password: 'secret123' })\n`
  const result = await format(input)
  assert.ok(result.code.includes('const options ='), 'object arg should be extracted to const options')
  assert.ok(result.code.includes("configure( 'production', options )"), 'call should reference extracted variable')
  assert.ok(result.code.includes("host: 'localhost'"), 'extracted object should contain original properties')
})

test('does not extract complex arg from short call', async () => {
  const input = `foo({ a: 1, b: 2 })\n`
  const result = await format(input)
  assert.ok(!result.code.includes('const options'), 'short call should not have extracted variable')
})
