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

test('Teacher sidebar footer gives identity its own width and never breaks names character by character', async () => {
  const css = await readFile(new URL('../../../src/styles/teacher-kinetic.css', import.meta.url), 'utf8')
  const shell = css.match(/\.teacher-shell\.teacher-kinetic-shell\s*\{([^}]+)\}/)?.[1]
  const inner = css.match(/\.teacher-kinetic-shell \.teacher-kinetic-header \.site-header-inner\s*\{([^}]+)\}/)?.[1]
  const profile = css.match(/\.teacher-kinetic-shell \.teacher-kinetic-header \.profile-area\s*\{([^}]+)\}/)?.[1]
  const user = css.match(/\.teacher-kinetic-shell \.teacher-kinetic-header \.shell-user\s*\{([^}]+)\}/)?.[1]
  const name = css.match(/\.teacher-kinetic-shell \.teacher-kinetic-header \.shell-user-details strong\s*\{([^}]+)\}/)?.[1]
  const logout = css.match(/\.teacher-kinetic-shell \.teacher-kinetic-header \.logout-button\s*\{([^}]+)\}/)?.[1]

  assert.match(shell, /grid-template-columns:\s*264px\s+minmax\(0,1fr\)/)
  assert.match(inner, /flex-direction:\s*column/)
  assert.match(inner, /width:\s*100%/)
  assert.match(profile, /display:\s*grid/)
  assert.match(profile, /width:\s*100%/)
  assert.match(user, /grid-template-columns:\s*38px\s+minmax\(0,1fr\)/)
  assert.match(name, /overflow-wrap:\s*normal/)
  assert.match(name, /text-overflow:\s*ellipsis/)
  assert.match(name, /white-space:\s*nowrap/)
  assert.match(logout, /width:\s*100%/)
})
