import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const componentsDirectory = dirname(fileURLToPath(import.meta.url))

test('Student routes use the shared AppShell and the unused StudentShell is removed', () => {
  const appSource = readFileSync(join(componentsDirectory, '..', 'App.jsx'), 'utf8')

  assert.equal(existsSync(join(componentsDirectory, 'StudentShell.jsx')), false)
  assert.match(appSource, /AppShell/)
  assert.doesNotMatch(appSource, /StudentShell/)
})
