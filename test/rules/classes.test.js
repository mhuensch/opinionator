// opinionator-ignore-file
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { format } from '../../src/format.js'

test('throws on non-PascalCase class names', async (  ) => {
  const input = `class my_class {}\n`
  await assert.rejects((  ) => format(input), { code: 'NAMING_VIOLATION' })
})

test('one blank line after class opening brace', async (  ) => {
  const input = `class Foo {\n  constructor() {\n    this.x = 1\n  }\n}\n`
  const result = await format(input)
  assert.ok(result.code.includes('class Foo {\n\n'))
})

test('one blank line before class closing brace', async (  ) => {
  const input = `class Foo {\n  bar() { return 1 }\n}\n`
  const result = await format(input)
  assert.ok(result.code.includes('\n\n}\n'))
})

test('blank lines between class methods', async (  ) => {
  const input = `class Foo {\n  constructor() {\n    this.x = 1\n  }\n  bar() {\n    return 2\n  }\n}\n`
  const result = await format(input)
  assert.ok(result.code.includes('}\n\n'))
  assert.ok(result.code.includes('bar'))
})

test('preserves class extends', async (  ) => {
  const input = `class Child extends Parent {\n  constructor() {\n    super()\n  }\n}\n`
  const result = await format(input)
  assert.ok(result.code.includes('class Child extends Parent'))
})

test('throws on non-PascalCase class name with extends', async (  ) => {
  const input = `class child_class extends Parent {}\n`
  await assert.rejects((  ) => format(input), { code: 'NAMING_VIOLATION' })
})

test('formats constructor with params', async (  ) => {
  const input = `class Foo {\n  constructor(config) {\n    this.config = config\n  }\n}\n`
  const result = await format(input)
  assert.ok(result.code.includes('constructor ( config )'))
})

test('formats getters', async (  ) => {
  const input = `class Foo {\n  get size() {\n    return this.cache.size\n  }\n}\n`
  const result = await format(input)
  assert.ok(result.code.includes('get size'))
})

test('throws on _snake_case private method names', async (  ) => {
  const input = `class Foo {\n  _process_item(item) {\n    return item.value\n  }\n}\n`
  await assert.rejects((  ) => format(input), { code: 'NAMING_VIOLATION' })
})

test('preserves static keyword on methods', async (  ) => {
  const input = `class Foo {\n  static create() {\n    return new Foo()\n  }\n}\n`
  const result = await format(input)
  assert.ok(result.code.includes('static create'))
})

test('throws on snake_case method names', async (  ) => {
  const input = `class Foo {\n  process_data(x) {\n    return x\n  }\n}\n`
  await assert.rejects((  ) => format(input), { code: 'NAMING_VIOLATION' })
})

test('formats empty class', async (  ) => {
  const input = `class Foo {}\n`
  const result = await format(input)
  assert.ok(result.code.includes('class Foo {\n'))
})

test('export default class', async (  ) => {
  const input = `export default class Foo {\n  bar() { return 1 }\n}\n`
  const result = await format(input)
  assert.ok(result.code.includes('export default class Foo'))
})
