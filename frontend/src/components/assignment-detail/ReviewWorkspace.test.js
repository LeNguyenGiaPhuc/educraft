import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'
import { createReviewSession } from './reviewSession.js'
import { mapEvaluation } from './assignmentDetailView.js'
let vite, Panel, AiResultCard
before(async () => {
  vite = await createServer({ root: fileURLToPath(new URL('../../../', import.meta.url)), appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } })
  Panel = (await vite.ssrLoadModule('/src/components/assignment-detail/SubmissionReviewPanel.jsx')).default
  AiResultCard = (await vite.ssrLoadModule('/src/components/assignment-detail/AiResultCard.jsx')).default
})
after(async () => { await vite?.close() })
const submission = { id: 'attempt-1', studentName: 'Học sinh trùng tên', studentCode: 'HS-1', attemptNumber: 2, status: 'submitted', fileUrl: 'https://example.invalid/attempt1.png', fileName: 'Bài ghi.jpg' }

test('selected-only review keeps manual form usable during GET and has native original evidence link', () => {
  const html = renderToStaticMarkup(React.createElement(Panel, { submission, assignmentId: 'assignment-1' }))
  assert.match(html, /Đang đọc đề xuất AI đã lưu/)
  assert.match(html, /Hoàn thành/)
  assert.match(html, /Cần bổ sung/)
  assert.match(html, /href="https:\/\/example.invalid\/attempt1.png"/)
  assert.match(html, /<textarea/)
  assert.doesNotMatch(html, /<img|disabled=""|tk-teacher-seal/)
})

test('no-evaluation finalized attempt has no actionable AI or save and keeps confirmed folio', async () => {
  const reviewSession = createReviewSession('assignment-1')
  const approved = { ...submission, status: 'approved', finalStatus: 'COMPLETED', feedback: 'Đã duyệt' }
  reviewSession.ensure(approved)
  await reviewSession.loadEvaluation(approved.id, async () => { throw { status: 404 } })
  const html = renderToStaticMarkup(React.createElement(Panel, { submission: approved, reviewSession }))
  assert.match(html, /Không có đề xuất AI đã lưu/)
  assert.match(html, /Giáo viên đã chốt/)
  assert.match(html, /disabled=""/)
  assert.doesNotMatch(html, />Phân tích bằng AI<|>Thử phân tích lại</)
})

test('AI insights preserve long transcript and uncertainty without unverified accuracy claims', () => {
  const text = 'Nội dung rất dài '.repeat(400)
  const evaluation = mapEvaluation({ confidence: 0.72, coverage_score: 45, missing_content: ['Thiếu phần tư tưởng'], reference_transcription: text, student_transcription: text, uncertain_content: Array.from({ length: 100 }, (_, page) => ({ source: 'student', page: page + 1, text: `Đoạn ${page}`, reason: 'Chữ khó đọc' })) })
  const html = renderToStaticMarkup(React.createElement(AiResultCard, { evaluation, coverageThreshold: 80 }))
  assert.match(html, /Độ bao phủ nội dung/)
  assert.match(html, /45%/)
  assert.match(html, /80%/)
  assert.match(html, /Độ tin cậy do AI cung cấp/)
  assert.match(html, /không phải độ chính xác đã được kiểm chứng/)
  assert.ok(html.includes(text))
  assert.match(html, /Đoạn 99/)
  assert.match(html, /tabindex="0"/)
  assert.doesNotMatch(html, /<img|<input|<button/)
})
