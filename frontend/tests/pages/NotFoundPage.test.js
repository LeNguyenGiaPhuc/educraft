import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const pageDirectory = join(dirname(fileURLToPath(import.meta.url)), '../../src/pages')
const appPath = join(pageDirectory, '..', 'App.jsx')
const pagePath = join(pageDirectory, 'NotFoundPage.jsx')

test('App has a friendly wildcard 404 with role-aware home navigation', () => {
  assert.equal(existsSync(pagePath), true)
  const appSource = readFileSync(appPath, 'utf8')
  const pageSource = readFileSync(pagePath, 'utf8')

  assert.match(appSource, /path="\*"/)
  assert.match(appSource, /<NotFoundPage\s*\/>/)
  assert.match(pageSource, /Trang không tồn tại/)
  assert.match(pageSource, /getRoleHome\(user\.role\)/)
  assert.match(pageSource, /user\s*\?[^:]+:\s*['"]\/login['"]/s)
})
