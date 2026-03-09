// opinionator-ignore-file
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { format } from '../../src/format.js'

test('throws SWALLOWED_ERROR when catch does not rethrow or wrap', async (  ) => {
  const input = `try { doThing() } catch (err) { log(err.message) }\n`
  await assert.rejects((  ) => format(input), { code: 'SWALLOWED_ERROR' })
})

test('does not throw when catch rethrows the error', async (  ) => {
  const input = `try { doThing() } catch (err) { cleanup(); throw err }\n`
  const result = await format(input)
  assert.ok(result.code, 'rethrowing should pass')
})

test('does not throw when catch wraps with cause', async (  ) => {
  const input = `try { doThing() } catch (err) { throw new Error('failed', { cause: err }) }\n`
  const result = await format(input)
  assert.ok(result.code, 'wrapping with cause should pass')
})

test('does not throw when catch has no parameter', async (  ) => {
  const input = `try { doThing() } catch { fallback() }\n`
  const result = await format(input)
  assert.ok(result.code, 'catch without param should pass')
})

test('does not throw when catch rethrows in if branch', async (  ) => {
  const input = `try { doThing() } catch (err) { if (err.code === 'FATAL') { throw err } }\n`
  const result = await format(input)
  assert.ok(result.code, 'conditional rethrow should pass')
})

test('swallowed error message includes param name', async (  ) => {
  const input = `try { doThing() } catch (err) { log(err.message) }\n`
  try {
    await format(input)
    assert.fail('should have thrown')
  }
  catch ( err ) {
    assert.equal(err.code, 'SWALLOWED_ERROR')
    assert.ok(err.message.includes('rethrow'), 'should mention rethrow')
    assert.ok(err.message.includes('cause'), 'should mention cause')
    assert.ok(err.result, 'should include formatted result')
    assert.ok(err.result.code, 'result should have code')
  }
})

test('throws SWALLOWED_ERROR for empty catch block with param', async (  ) => {
  const input = `try { doThing() } catch (err) { }\n`
  await assert.rejects((  ) => format(input), { code: 'SWALLOWED_ERROR' })
})
