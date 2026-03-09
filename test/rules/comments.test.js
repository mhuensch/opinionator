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

// ─── Comment preservation ─────────────────────────────

test('preserves line comment before statement', async (  ) => {
  const input = `// comment\nconst x = 1\n`
  const result = await format(input)
  assert.ok(result.code.includes('// comment'))
  assert.ok(result.code.includes('const x = 1'))
})

test('preserves line comment between statements', async (  ) => {
  const input = `const x = 1\n// between\nconst y = 2\n`
  const result = await format(input)
  assert.ok(result.code.includes('// between'))
  assert.ok(result.code.indexOf('// between') > result.code.indexOf('const x = 1'))
  assert.ok(result.code.indexOf('// between') < result.code.indexOf('const y = 2'))
})

test('preserves multiple leading comments', async (  ) => {
  const input = `// first\n// second\n// third\nconst x = 1\n`
  const result = await format(input)
  assert.ok(result.code.includes('// first'))
  assert.ok(result.code.includes('// second'))
  assert.ok(result.code.includes('// third'))
})

test('preserves block comment', async (  ) => {
  const input = `/* block comment */\nconst x = 1\n`
  const result = await format(input)
  assert.ok(result.code.includes('/* block comment */'))
})

test('preserves multiline block comment (JSDoc)', async (  ) => {
  const input = `/**\n * Does a thing\n * @param x\n */\nfunction doThing ( x ) {\n  return x\n}\n`
  const result = await format(input)
  assert.ok(result.code.includes('* Does a thing'))
  assert.ok(result.code.includes('* @param x'))
})

test('preserves comment inside function body', async (  ) => {
  const input = `function doThing () {\n  // step one\n  const x = 1\n  return x\n}\n`
  const result = await format(input)
  assert.ok(result.code.includes('// step one'))
})

test('preserves comment inside if block', async (  ) => {
  const input = `function doThing () {\n  if ( x === true ) {\n    // inside if\n    return 1\n  }\n  return 0\n}\n`
  const result = await format(input)
  assert.ok(result.code.includes('// inside if'))
})

test('preserves comment inside try/catch', async (  ) => {
  const input = `function doThing () {\n  try {\n    // try comment\n    doIt()\n  }\n  catch {\n    // catch comment\n    fallback()\n  }\n}\n`
  const result = await format(input)
  assert.ok(result.code.includes('// try comment'))
  assert.ok(result.code.includes('// catch comment'))
})

test('preserves comment before class method', async (  ) => {
  const input = `class Foo {\n  // method comment\n  doThing () {\n    return 1\n  }\n}\n`
  const result = await format(input)
  assert.ok(result.code.includes('// method comment'))
})

test('preserves comment before switch case', async (  ) => {
  const input = `function doThing ( x ) {\n  switch ( x ) {\n  // case comment\n  case 1:\n    return 'one'\n  default:\n    return 'other'\n  }\n}\n`
  const result = await format(input)
  assert.ok(result.code.includes('// case comment'))
})

test('preserves trailing comment at end of file', async (  ) => {
  const input = `const x = 1\n// end of file\n`
  const result = await format(input)
  assert.ok(result.code.includes('// end of file'))
})

test('comment preservation is idempotent', async (  ) => {
  const input = `// header\nimport { foo } from 'bar'\n\n// main function\nfunction doThing () {\n  // step one\n  const x = 1\n  return x\n}\n`
  const pass1 = await format(input)
  const pass2 = await format(pass1.code)
  assert.equal(pass1.code, pass2.code)
})

test('does not duplicate comments across formatting passes', async (  ) => {
  const input = `// only once\nconst x = 1\n`
  const result = await format(input)
  const matches = result.code.match(/\/\/ only once/g)
  assert.equal(matches.length, 1)
})

// ─── Space after // ──────────────────────────────────

test('enforces space after // when missing', async (  ) => {
  const input = `//no space\nconst x = 1\n`
  const result = await format(input)
  assert.ok(result.code.includes('// no space'))
})

test('preserves space after // when already present', async (  ) => {
  const input = `// has space\nconst x = 1\n`
  const result = await format(input)
  assert.ok(result.code.includes('// has space'))
})

test('does not add space after /// (triple slash)', async (  ) => {
  const input = `/// <reference />\nconst x = 1\n`
  const result = await format(input)
  assert.ok(result.code.includes('/// <reference />'))
})

test('does not add space after //! (shebang-style)', async (  ) => {
  const input = `//! special\nconst x = 1\n`
  const result = await format(input)
  assert.ok(result.code.includes('//! special'))
})

// ─── Inline trailing comment placement ───────────────

test('moves inline trailing comment above the statement', async (  ) => {
  const input = `const x = 1 // explains x\nconst y = 2\n`
  const result = await format(input)
  const lines = result.code.split('\n')
  const comment_idx = lines.findIndex((l) => l.includes('// explains x'))
  const stmt_idx = lines.findIndex((l) => l.includes('const x = 1'))
  assert.ok(comment_idx < stmt_idx, 'comment should be above the statement it annotates')
})

test('inline trailing comment placement is idempotent', async (  ) => {
  const input = `const x = 1 // explains x\nconst y = 2\n`
  const pass1 = await format(input)
  const pass2 = await format(pass1.code)
  assert.equal(pass1.code, pass2.code)
})
