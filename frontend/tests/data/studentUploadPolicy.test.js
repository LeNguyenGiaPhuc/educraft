import assert from 'node:assert/strict'
import { test } from 'node:test'
import { validateSubmissionForm } from '../../src/data/submissionValidation.js'

test('Student file rules preserve JPG JPEG PNG, exact 5MiB boundary and reject other or empty files', () => {
  for (const fileName of ['ảnh.JPG','ảnh.jpeg','bai.png']) assert.deepEqual(validateSubmissionForm({ fileName, fileSizeBytes: 5242880 }), {})
  for (const form of [{ fileName: '' }, { fileName:'a.png',fileSizeBytes:0 }, { fileName:'a.png',fileSizeBytes:5242881 }, { fileName:'a.webp',fileSizeBytes:100 }, { fileName:'a.pdf',fileSizeBytes:100 }]) assert.ok(validateSubmissionForm(form).file)
})
