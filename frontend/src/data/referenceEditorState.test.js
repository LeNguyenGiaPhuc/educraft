import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createReferenceEditorState,
  referenceEditorReducer,
} from './referenceEditorState.js'

test('opening replace targets only the selected reference and cancel clears its file', () => {
  const opened = referenceEditorReducer(createReferenceEditorState(), {
    type: 'OPEN_REPLACE',
    referenceId: 'reference-b',
  })
  const withFile = referenceEditorReducer(opened, {
    type: 'SELECT_FILE',
    file: { name: 'replacement.png' },
  })
  const cancelled = referenceEditorReducer(withFile, { type: 'CLOSE' })

  assert.equal(opened.mode, 'replace')
  assert.equal(opened.referenceId, 'reference-b')
  assert.equal(withFile.file.name, 'replacement.png')
  assert.deepEqual(cancelled, createReferenceEditorState())
})

test('opening add creates one editor and cancel clears its selected file', () => {
  const opened = referenceEditorReducer(createReferenceEditorState(), { type: 'OPEN_ADD' })
  const withFile = referenceEditorReducer(opened, {
    type: 'SELECT_FILE',
    file: { name: 'additional.webp' },
  })
  const cancelled = referenceEditorReducer(withFile, { type: 'CLOSE' })

  assert.equal(opened.mode, 'add')
  assert.equal(opened.referenceId, null)
  assert.deepEqual(cancelled, createReferenceEditorState())
})

test('successful add or replacement collapses the editor and clears request state', () => {
  const loading = referenceEditorReducer(
    referenceEditorReducer(createReferenceEditorState(), { type: 'OPEN_ADD' }),
    { type: 'REQUEST_START' },
  )
  const completed = referenceEditorReducer(loading, { type: 'REQUEST_SUCCESS' })

  assert.equal(loading.status, 'loading')
  assert.deepEqual(completed, createReferenceEditorState())
})
