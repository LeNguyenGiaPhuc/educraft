import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

const currentDirectory = dirname(fileURLToPath(import.meta.url))
const helperPath = join(currentDirectory, 'modalAccessibility.js')

test('admin modal cancel delegates Escape dismissal to the owner', async () => {
  assert.equal(existsSync(helperPath), true, 'modal accessibility helper is required')

  const { handleDialogCancel } = await import(pathToFileURL(helperPath).href)
  let closed = false
  let prevented = false

  handleDialogCancel(
    { preventDefault: () => { prevented = true } },
    () => { closed = true },
  )
  assert.equal(closed, true)
  assert.equal(prevented, true)
})

test('admin modal scroll lock restores the previous body overflow value', async () => {
  assert.equal(existsSync(helperPath), true, 'modal accessibility helper is required')

  const { lockDocumentScroll } = await import(pathToFileURL(helperPath).href)
  const fakeDocument = { body: { style: { overflow: 'auto' } } }
  const restore = lockDocumentScroll(fakeDocument)

  assert.equal(fakeDocument.body.style.overflow, 'hidden')
  restore()
  assert.equal(fakeDocument.body.style.overflow, 'auto')
})
