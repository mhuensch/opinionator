import { test } from 'node:test'
import assert from 'node:assert/strict'
import { format } from '../../src/core/format.js'

// ─── Class name: PascalCase ─────────────────────────────

test('converts class names to PascalCase', async () => {
  const input = `class my_class {}\n`
  const result = await format(input)
  assert.ok(result.code.includes('class MyClass'))
})

// ─── One blank line after class signature ───────────────

test('one blank line after class opening brace', async () => {
  const input = `class Foo {\n  constructor() {\n    this.x = 1\n  }\n}\n`
  const result = await format(input)
  // After "class Foo {" there should be a blank line
  assert.ok(result.code.includes('class Foo {\n\n'))
})

// ─── One blank line before class closing brace ─────────

test('one blank line before class closing brace', async () => {
  const input = `class Foo {\n  bar() { return 1 }\n}\n`
  const result = await format(input)
  // Before closing "}" there should be a blank line
  assert.ok(result.code.includes('\n\n}\n'))
})

// ─── Two blank lines between class methods ──────────────

test('blank lines between class methods', async () => {
  const input = `class Foo {\n  constructor() {\n    this.x = 1\n  }\n  bar() {\n    return 2\n  }\n}\n`
  const result = await format(input)
  // Methods should be separated by blank line(s)
  assert.ok(result.code.includes('}\n\n'))
  assert.ok(result.code.includes('bar'))
})

// ─── Class extends ─────────────────────────────────────

test('preserves class extends', async () => {
  const input = `class Child extends Parent {\n  constructor() {\n    super()\n  }\n}\n`
  const result = await format(input)
  assert.ok(result.code.includes('class Child extends Parent'))
})

test('converts extends class name to PascalCase', async () => {
  const input = `class child_class extends Parent {}\n`
  const result = await format(input)
  assert.ok(result.code.includes('class ChildClass extends Parent'))
})

// ─── Constructor formatting ────────────────────────────

test('formats constructor with params', async () => {
  const input = `class Foo {\n  constructor(config) {\n    this.config = config\n  }\n}\n`
  const result = await format(input)
  assert.ok(result.code.includes('constructor ( config )'))
})

// ─── Getter formatting ────────────────────────────────

test('formats getters', async () => {
  const input = `class Foo {\n  get size() {\n    return this.cache.size\n  }\n}\n`
  const result = await format(input)
  assert.ok(result.code.includes('get size'))
})

// ─── Private methods ───────────────────────────────────

test('formats private method names as _camelCase', async () => {
  const input = `class Foo {\n  _process_item(item) {\n    return item.value\n  }\n}\n`
  const result = await format(input)
  assert.ok(result.code.includes('_processItem'))
})

// ─── Static methods ────────────────────────────────────

test('preserves static keyword on methods', async () => {
  const input = `class Foo {\n  static create() {\n    return new Foo()\n  }\n}\n`
  const result = await format(input)
  assert.ok(result.code.includes('static create'))
})

// ─── Class method spacing ──────────────────────────────

test('method names are camelCase', async () => {
  const input = `class Foo {\n  process_data(x) {\n    return x\n  }\n}\n`
  const result = await format(input)
  assert.ok(result.code.includes('processData'))
})

// ─── Empty class ────────────────────────────────────────

test('formats empty class', async () => {
  const input = `class Foo {}\n`
  const result = await format(input)
  // Should still have blank line after and before braces
  assert.ok(result.code.includes('class Foo {\n'))
})

// ─── Export default class ──────────────────────────────

test('export default class', async () => {
  const input = `export default class Foo {\n  bar() { return 1 }\n}\n`
  const result = await format(input)
  assert.ok(result.code.includes('export default class Foo'))
})
