import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('Teacher header stays sticky in document flow without changing other roles', async () => {
  const css = await readFile(new URL('../../../src/styles/teacher-kinetic.css', import.meta.url), 'utf8')
  const rule = css.match(/\.teacher-kinetic-shell \.teacher-kinetic-header \{([^}]+)\}/)?.[1]
  assert.ok(rule)
  assert.match(rule, /position: sticky/)
  assert.match(rule, /top: 0/)
  assert.match(rule, /z-index: 40/)
  assert.match(rule, /align-self: start/)
  assert.doesNotMatch(rule, /position: fixed/)
})
