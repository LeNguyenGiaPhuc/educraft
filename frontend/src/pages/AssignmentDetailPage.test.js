import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { fileURLToPath } from 'node:url'

import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

import { mapTeacherSubmission } from '../data/teacherSubmissionView.js'

let vite

before(async () => {
  vite = await createServer({
    appType: 'custom',
    logLevel: 'silent',
    root: fileURLToPath(new URL('../..', import.meta.url)),
    server: { middlewareMode: true },
  })
})

after(async () => {
  await vite.close()
})

function submission(id, attemptNumber) {
  return mapTeacherSubmission({
    id,
    student_id: 'student-profile-1',
    attempt_number: attemptNumber,
    status: 'SUBMITTED',
    submitted_at: '2026-09-17T13:00:00Z',
    student: {
      full_name: 'Nguyen An Binh',
      student_code: 'student01',
    },
    files: [{ original_filename: 'notes.png' }],
  })
}

test('Teacher submission list renders full name and distinct backend attempt numbers', async () => {
  const { SubmissionList } = await vite.ssrLoadModule('/src/pages/AssignmentDetailPage.jsx')
  const markup = renderToStaticMarkup(React.createElement(SubmissionList, {
    onSelect() {},
    selectedId: 'submission-2',
    submissions: [submission('submission-1', 1), submission('submission-2', 2)],
  }))

  assert.match(markup, /Nguyen An Binh/)
  assert.match(markup, /student01/)
  assert.match(markup, /Lần 1/)
  assert.match(markup, /Lần 2/)
})

test('selected review panel keeps the Student name and attempt visible', async () => {
  const { SubmissionReviewPanel } = await vite.ssrLoadModule('/src/pages/AssignmentDetailPage.jsx')
  const markup = renderToStaticMarkup(React.createElement(SubmissionReviewPanel, {
    onReviewed() {},
    submission: submission('submission-2', 2),
  }))

  assert.match(markup, /Nguyen An Binh/)
  assert.match(markup, /student01 · Lần 2/)
})
