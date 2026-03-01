import { test } from 'node:test'
import assert from 'node:assert/strict'
import { format } from '../../src/core/format.js'

// ─── Indentation ─────────────────────────────────────────

test('uses 2-space indentation', async () => {
  const input = `function foo(a) {\n    return a\n}\n`
  const result = await format(input)
  assert.equal(result.code, `function foo ( a ) {\n  return a\n}\n`)
})

// ─── Semicolons ──────────────────────────────────────────

test('removes semicolons', async () => {
  const input = `const x = 1;\nconst y = 2;\n`
  const result = await format(input)
  assert.equal(result.code, `const x = 1\nconst y = 2\n`)
})

test('removes semicolons from multiple statements', async () => {
  const input = `let a = 1;\nlet b = 2;\nlet c = 3;\n`
  const result = await format(input)
  assert.equal(result.code, `let a = 1\nlet b = 2\nlet c = 3\n`)
})

// ─── Use strict ──────────────────────────────────────────

test('removes use strict directive', async () => {
  const input = `"use strict"\nconst x = 1\n`
  const result = await format(input)
  assert.equal(result.code, `const x = 1\n`)
})

test('removes use strict with single quotes', async () => {
  const input = `'use strict'\nconst x = 1\n`
  const result = await format(input)
  assert.equal(result.code, `const x = 1\n`)
})

// ─── Stroustrup brace style ─────────────────────────────

test('uses Stroustrup brace style for if/else', async () => {
  const input = `if (x) {\n  a(1)\n} else {\n  b(2)\n}\n`
  const result = await format(input)
  assert.equal(result.code, `if ( x ) {\n  a( 1 )\n}\nelse {\n  b( 2 )\n}\n`)
})

test('uses Stroustrup brace style for try/catch', async () => {
  const input = `try { foo(1) } catch (err) { bar(err) }\n`
  const result = await format(input)
  assert.equal(result.code, `try {\n  foo( 1 )\n}\ncatch ( err ) {\n  bar( err )\n}\n`)
})

test('uses Stroustrup brace style for try/catch/finally', async () => {
  const input = `try { a(1) } catch (e) { b(2) } finally { c(3) }\n`
  const result = await format(input)
  assert.equal(result.code, `try {\n  a( 1 )\n}\ncatch ( e ) {\n  b( 2 )\n}\nfinally {\n  c( 3 )\n}\n`)
})

// ─── Function spacing ───────────────────────────────────

test('adds space before and inside parentheses in named function declarations', async () => {
  const input = `function foo(a, b) { return a + b }\n`
  const result = await format(input)
  assert.equal(result.code, `function foo ( a, b ) {\n  return a + b\n}\n`)
})

test('adds spaces inside parens in function calls but not before', async () => {
  const input = `foo(1, 2)\n`
  const result = await format(input)
  assert.equal(result.code, `foo( 1, 2 )\n`)
})

test('handles empty function params', async () => {
  const input = `function bar() { return 1 }\n`
  const result = await format(input)
  assert.equal(result.code, `function bar () {\n  return 1\n}\n`)
})

// ─── No trailing blank line in blocks ───────────────────

test('removes trailing blank line in blocks', async () => {
  const input = `function foo() {\n  const x = 1\n\n}\n`
  const result = await format(input)
  assert.equal(result.code, `function foo () {\n  const x = 1\n}\n`)
})

// ─── Two blank lines between top-level functions ────────

test('two blank lines between top-level functions', async () => {
  const input = `function foo() { return 1 }\nfunction bar() { return 2 }\n`
  const result = await format(input)
  assert.equal(result.code, `function foo () {\n  return 1\n}\n\n\nfunction bar () {\n  return 2\n}\n`)
})

// ─── One blank line before return ───────────────────────

test('one blank line before return when not first statement', async () => {
  const input = `function foo() {\n  const x = 1\n  return x\n}\n`
  const result = await format(input)
  assert.equal(result.code, `function foo () {\n  const x = 1\n\n  return x\n}\n`)
})

test('no blank line before return when first/only statement', async () => {
  const input = `function foo() {\n  return 1\n}\n`
  const result = await format(input)
  assert.equal(result.code, `function foo () {\n  return 1\n}\n`)
})

// ─── One blank line between unrelated blocks ────────────

test('one blank line between unrelated blocks (if/for/try)', async () => {
  const input = `function foo() {\n  if (a) { x(1) }\n  for (const b of c) { y(2) }\n}\n`
  const result = await format(input)
  assert.equal(result.code, `function foo () {\n  if ( a ) {\n    x( 1 )\n  }\n\n  for ( const b of c ) {\n    y( 2 )\n  }\n}\n`)
})

// ─── Blank line after guard checks ──────────────────────

test('blank line after guard check', async () => {
  const input = `function foo(x) {\n  if (!x) {\n    return null\n  }\n  const y = x * 2\n  return y\n}\n`
  const result = await format(input)
  // After guard if-return, there should be a blank line before next code
  assert.ok(result.code.includes('}\n\n  const y'))
  assert.ok(result.code.includes('x * 2\n\n  return y'))
})

// ─── if/else-if/else ────────────────────────────────────

test('formats if/else-if/else chain', async () => {
  const input = `if (a) {\n  x(1)\n} else if (b) {\n  y(2)\n} else {\n  z(3)\n}\n`
  const result = await format(input)
  assert.equal(result.code, `if ( a ) {\n  x( 1 )\n}\nelse if ( b ) {\n  y( 2 )\n}\nelse {\n  z( 3 )\n}\n`)
})

// ─── Idempotency ────────────────────────────────────────

test('formatting is idempotent', async () => {
  const input = `var myVariable = "hello";\nfunction process_data(x) { return x; }\n`
  const result = await format(input)
  const result2 = await format(result.code)
  assert.equal(result2.code, result.code)
  assert.equal(result2.changed, false)
})

// ─── changed flag ───────────────────────────────────────

test('changed is true when formatting modifies code', async () => {
  const input = `const x = 1;\n`
  const result = await format(input)
  assert.equal(result.changed, true)
})

test('changed is false when code is already formatted', async () => {
  const input = `const x = 1\n`
  const result = await format(input)
  assert.equal(result.changed, false)
})

// ─── Ignore directives ─────────────────────────────────

test('opinionator-ignore-file leaves source unchanged', async () => {
  const input = `// opinionator-ignore-file\nvar x = 1;\nvar y = 2;\n`
  const result = await format(input)
  assert.equal(result.code, input)
  assert.equal(result.changed, false)
})

test('opinionator-ignore-next preserves the following line', async () => {
  const input = `const x = 1;\n// opinionator-ignore-next\nvar   weird   =   "preserved";\nconst y = 2;\n`
  const result = await format(input)
  assert.ok(result.code.includes('var   weird   =   "preserved";'))
})
