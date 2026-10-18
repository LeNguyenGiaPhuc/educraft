import assert from 'node:assert/strict'
import { before, after, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { readFile } from 'node:fs/promises'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { createServer } from 'vite'

let vite, Archive, History, Form, Pending, Workspace
before(async () => {
  vite = await createServer({ root: fileURLToPath(new URL('../../..', import.meta.url)), appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } })
  Archive = (await vite.ssrLoadModule('/src/components/student/StudentLearningArchive.jsx')).default
  Pending = (await vite.ssrLoadModule('/src/components/student/StudentPendingState.jsx')).default
  const module = await vite.ssrLoadModule('/src/pages/StudentSubmissionPage.jsx')
  History = module.SubmissionHistory; Form = module.StudentSubmissionForm; Workspace = module.StudentSubmissionWorkspace
})
after(async () => { await vite?.close() })
const render = (Component, props) => renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(Component, props)))
const assignment = { id: 'a', title: 'Bài kiểm tra', dueAt: '2027-01-01T10:00:00Z', status: 'OPEN', classroom: { name: 'Lịch sử 11A' } }

test('mobile upload and receipt paper edges stay inset without clipping focus or changing desktop geometry', async () => {
  const css = await readFile(new URL('../../../src/styles/student-folio.css', import.meta.url), 'utf8')
  assert.match(css, /@media \(max-width:560px\)\s*\{[\s\S]*?\.student-kinetic-shell \.student-page :is\(\.student-submit-card,\.student-success-panel\) > \.kf-paper-edge \{ right:0; \}/)
})

test('125 classes and 500 assignments render only 20 class selectors and 25 native assignment links', () => {
  for (const count of [0, 1, 3, 12, 50, 125]) {
    const classes = Array.from({ length: count }, (_, i) => ({ id: `class-${i}`, code: '11A', subject: 'Lịch sử', assignments: Array.from({ length: 500 }, (_, j) => ({ ...assignment, id: `a-${i}-${j}` })) }))
    const html = render(Archive, { classes })
    assert.ok((html.match(/data-class-id=/g) || []).length <= 20)
    assert.equal((html.match(/data-assignment-id=/g) || []).length, count ? 25 : 0)
    assert.equal((html.match(/href="\/student\/assignments\//g) || []).length, count ? 50 : 0)
    assert.equal((html.match(/id="student-class-sheet"/g) || []).length, count ? 1 : 0)
    assert.doesNotMatch(html, /\/classes\/|ai-evaluation|Phân tích bằng AI/)
  }
})

test('history is bounded to 20 attempts, preserves distinct IDs and finalized feedback as read-only', () => {
  for (const count of [0, 1, 20, 100, 1000]) {
    const submissions = Array.from({ length: count }, (_, i) => ({ id: `s-${i}`, attemptNumber: i + 1, fileName: 'Trùng tên.png', status: 'approved', result: { finalStatus: 'completed', feedback: 'Nhận xét rất dài '.repeat(100) } }))
    const html = render(History, { submissions, status: 'success' })
    assert.equal((html.match(/data-submission-id=/g) || []).length, Math.min(20, count))
    assert.doesNotMatch(html, /textarea|Chốt kết quả|Completed|Needs Completion/)
    if (count) { assert.match(html, /Hoàn thành/); assert.match(html, /Nhận xét rất dài/) }
  }
})

test('upload pending disables file and submit, retains selected filename and genuine validation error', () => {
  const html = render(Form, { assignment, availability: { isOpen: true }, form: { fileName: 'ảnh bài ghi.png' }, errors: { file: 'Sai định dạng' }, request: { status: 'loading' }, onFileChange() {}, onSubmit() {} })
  assert.match(html, /accept="image\/png,image\/jpeg"/)
  assert.match(html, /disabled=""[^>]*name="file"|name="file"[^>]*disabled=""/)
  assert.match(html, /Sai định dạng/)
  assert.match(html, /ảnh bài ghi.png/)
  assert.match(html, /aria-busy="true"/)
  assert.doesNotMatch(html, /image\/webp|application\/pdf/)
})

test('protected pending has neutral placeholders and no identity, file or result', () => {
  const html = render(Pending, { standalone: true })
  assert.match(html, /role="status"/)
  assert.match(html, /aria-hidden="true"/)
  assert.doesNotMatch(html, /data-class-id|data-submission-id|img|textarea/)
})

test('class folio connects a real selected ID to a physical tab, metadata and numbered loaded records', () => {
  const html = render(Archive, { classes: [{ id: 'class-real', code: '11A2', subject: 'Lịch sử', semester: 'Học kỳ 1', schoolYear: '2026–2027', assignments: [assignment] }] })
  assert.match(html, /class="sf-dossier-tab"/)
  assert.match(html, /class="sf-dossier-content"/)
  assert.match(html, /class="sf-record-number" aria-hidden="true">01/)
  assert.match(html, /<dt>Học kỳ<\/dt><dd>Học kỳ 1/)
  assert.match(html, /data-class-id="class-real"/)
})

test('submission folio begins with verified assignment context, not a numbered progress stepper', () => {
  const html = render(Workspace, { assignment, service: { listMySubmissions: async () => [], createSubmission: async () => ({}) } })
  assert.match(html, /class="sf-assignment-context"/)
  assert.match(html, /<h1[^>]*>Bài kiểm tra<\/h1>/)
  assert.match(html, /Lịch sử 11A/)
  assert.doesNotMatch(html, /sf-folio-tab/)
  assert.doesNotMatch(html, /student-progress-number|state-kicker|Teacher Seal|Chốt kết quả/)
  assert.match(html, /id="note-file"/)
})

test('one or three classes keep the same searchable index and selected dossier as larger archives', () => {
  for (const count of [1, 3, 12, 125]) {
    const html = render(Archive, { classes: Array.from({ length: count }, (_, i) => ({ id: `real-${i}`, code: `11A${i}`, subject: 'Lịch sử', assignments: [] })) })
    assert.match(html, /class="sf-class-list"/)
    assert.match(html, /class="sf-index-heading"/)
    assert.doesNotMatch(html, /sf-small-archive|sf-folder-tab/)
    assert.equal((html.match(/aria-pressed="true"/g) || []).length, 1)
    assert.equal((html.match(/data-class-id=/g) || []).length, Math.min(count, 20))
  }
})

test('class search stays outside the framed class index while its header and records stay together', () => {
  const html = render(Archive, { classes: [{ id: 'real-class', code: '11A2', subject: 'Lịch sử', assignments: [] }] })
  assert.match(html, /class="sf-archive-toolbar">[\s\S]*id="student-class-search"[\s\S]*<\/div><div class="sf-learning-archive"/)
  const index = html.slice(html.indexOf('<section class="sf-class-index"'), html.indexOf('<section class="sf-class-sheet"'))
  assert.match(index, /sf-index-heading/)
  assert.match(index, /data-class-id="real-class"/)
  assert.doesNotMatch(index, /student-class-search/)
})

test('expired OPEN assignments display closed in both archive and assignment context', () => {
  const expired = { ...assignment, dueAt: '2000-10-02T18:55:00+07:00', status: 'OPEN', statusLabel: 'Đang mở', statusTone: 'active' }
  const archive = render(Archive, { classes: [{ id: 'c', code: '11A2', subject: 'Lịch sử', assignments: [expired] }] })
  assert.match(archive, /class="sf-status">Đã đóng<\/span>/)
  assert.doesNotMatch(archive, /Đang mở/)
  const workspace = render(Workspace, { assignment: expired, service: { listMySubmissions: async () => [] } })
  assert.match(workspace, /<dt>Trạng thái bài<\/dt><dd>Đã đóng<\/dd>/)
  assert.doesNotMatch(workspace, /Đang mở|id="note-file"/)
  assert.match(workspace, /Đã hết hạn nộp bài/)
})

test('Student archive distinguishes future open, manually closed and invalid deadlines without trusting stale labels', () => {
  const rows = [
    { ...assignment, id: 'open', dueAt: '2099-01-01T00:00:00Z', statusTone: 'active' },
    { ...assignment, id: 'closed', dueAt: '2099-01-01T00:00:00Z', statusTone: 'closed' },
    { ...assignment, id: 'invalid', dueAt: 'invalid', statusLabel: 'Đang mở', statusTone: 'active' },
  ]
  const html = render(Archive, { classes: [{ id: 'c', code: '11A2', assignments: rows }] })
  const labels = [...html.matchAll(/class="sf-status">([^<]+)<\/span>/g)].map(match => match[1])
  assert.deepEqual(labels, ['Đang mở', 'Đã đóng', 'Đã đóng'])
})
