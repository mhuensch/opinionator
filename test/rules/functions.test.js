// opinionator-ignore-file
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { format } from '../../src/format.js'

test('spaces inside function declaration params', async (  ) => {
  const input = `function foo(a, b) { return a + b }\n`
  const result = await format(input)
  assert.equal(result.code, `function foo ( a, b ) {\n  return a + b\n}\n`)
})

test('empty params format correctly', async (  ) => {
  const input = `function foo() { return 1 }\n`
  const result = await format(input)
  assert.ok(result.code.includes('function foo ()'))
})

test('throws on snake_case function names', async (  ) => {
  const input = `function process_data(x) { return x }\n`
  await assert.rejects((  ) => format(input), { code: 'NAMING_VIOLATION' })
})

test('two blank lines between top-level function declarations', async (  ) => {
  const input = `function foo() { return 1 }\nfunction bar() { return 2 }\n`
  const result = await format(input)
  assert.ok(result.code.includes('}\n\n\nfunction bar'))
})

test('two blank lines between function and class', async (  ) => {
  const input = `function foo() { return 1 }\nclass Bar {}\n`
  const result = await format(input)
  assert.ok(result.code.includes('}\n\n\nclass Bar'))
})

test('adds parentheses to single-param arrow functions', async (  ) => {
  const input = `const f = x => x * 2\n`
  const result = await format(input)
  assert.ok(result.code.includes('( x ) =>'))
})

test('preserves parentheses on multi-param arrow functions', async (  ) => {
  const input = `const f = (a, b) => a + b\n`
  const result = await format(input)
  assert.ok(result.code.includes('( a, b ) =>'))
})

test('arrow function with body block', async (  ) => {
  const input = `const f = (x) => {\n  const doubled = x * 2\n  return doubled\n}\n`
  const result = await format(input)
  assert.ok(result.code.includes('( x ) => {'))
  assert.ok(result.code.includes('return doubled'))
})

test('preserves async keyword on functions', async (  ) => {
  const input = `async function fetchData(url) { return await fetch(url) }\n`
  const result = await format(input)
  assert.ok(result.code.includes('async function fetchData'))
})

test('preserves async arrow functions', async (  ) => {
  const input = `const f = async (x) => await x\n`
  const result = await format(input)
  assert.ok(result.code.includes('async ( x ) =>'))
})

test('preserves generator function syntax', async (  ) => {
  const input = `function* gen() { yield 1 }\n`
  const result = await format(input)
  assert.ok(result.code.includes('function*'))
  assert.ok(result.code.includes('yield 1'))
})

test('preserves export on function declarations', async (  ) => {
  const input = `export function foo(x) { return x }\n`
  const result = await format(input)
  assert.ok(result.code.includes('export function foo'))
})

test('export async function', async (  ) => {
  const input = `export async function foo(x) { return x }\n`
  const result = await format(input)
  assert.ok(result.code.includes('export async function foo'))
})

test('preserves default parameter values', async (  ) => {
  const input = `function foo(x = 1, y = 2) { return x + y }\n`
  const result = await format(input)
  assert.ok(result.code.includes('x = 1'))
  assert.ok(result.code.includes('y = 2'))
})

test('preserves rest parameters', async (  ) => {
  const input = `function foo(...args) { return args }\n`
  const result = await format(input)
  assert.ok(result.code.includes('...args'))
})

test('formats function expressions', async (  ) => {
  const input = `const f = function(x) { return x }\n`
  const result = await format(input)
  assert.ok(result.code.includes('function ( x )'))
})

test('formats named function expressions', async (  ) => {
  const input = `const f = function myFunc(x) { return x }\n`
  const result = await format(input)
  assert.ok(result.code.includes('function myFunc'))
})

test('function calls have no spaces inside parens', async (  ) => {
  const input = `foo(1, 2)\n`
  const result = await format(input)
  assert.equal(result.code, `foo(1, 2)\n`)
})

test('chained method calls have no spaces inside parens', async (  ) => {
  const input = `arr.map(x => x * 2).filter(x => x > 0)\n`
  const result = await format(input)
  assert.ok(result.code.includes('.map('))
  assert.ok(result.code.includes('.filter('))
})

test('function call inside for-of has no spaces inside call parens', async (  ) => {
  const input = `for (const entry of readdirSync(dir)) { console.log(entry) }\n`
  const result = await format(input)
  assert.ok(result.code.includes('readdirSync(dir)'), 'call parens should have no spaces')
  assert.ok(result.code.includes('for ( const entry of'), 'for-of parens should have spaces')
})

test('function call inside if condition has no spaces inside call parens', async (  ) => {
  const input = `if (statSync(full).isDirectory()) { return true }\n`
  const result = await format(input)
  assert.ok(result.code.includes('statSync(full)'), 'call parens should have no spaces')
  assert.ok(result.code.includes('isDirectory()'), 'empty call parens stay compact')
  assert.ok(result.code.includes('if ('), 'if parens should have spaces')
})

test('function call in variable declaration has no spaces inside parens', async (  ) => {
  const input = `const full = join(dir, entry)\n`
  const result = await format(input)
  assert.equal(result.code, `const full = join(dir, entry)\n`)
})

test('extracts complex object arg from long call to const', async (  ) => {
  const input = `configure('production', { host: 'localhost', port: 3000, database: 'mydb', username: 'admin', password: 'secret123' })\n`
  const result = await format(input)
  assert.ok(result.code.includes('const options ='), 'object arg should be extracted to const options')
  assert.ok(result.code.includes('configure(\'production\', options)'), 'call should reference extracted variable')
  assert.ok(result.code.includes('host: \'localhost\''), 'extracted object should contain original properties')
})

test('does not extract complex arg from short call', async (  ) => {
  const input = `foo({ a: 1, b: 2 })\n`
  const result = await format(input)
  assert.ok(result.code.includes('const options') === false, 'short call should not have extracted variable')
})

test('arrow function returning object literal is wrapped in parens', async (  ) => {
  const input = `const result = items.map(item => ({ symbol: item.symbol, value: item.value }))\n`
  const result = await format(input)
  assert.ok(result.code.includes('=> ('), 'object literal return must be wrapped in parens')
  assert.ok(result.code.includes('{ symbol:'), 'object body should be present')
})
