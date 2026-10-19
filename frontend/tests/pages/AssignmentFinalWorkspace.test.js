import assert from 'node:assert/strict'
import { before, after, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { readFile } from 'node:fs/promises'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { createServer } from 'vite'
let vite, Workspace, Pending, Evidence
before(async () => {
  vite = await createServer({ appType: 'custom', logLevel: 'silent', root: fileURLToPath(new URL('../..', import.meta.url)), server: { middlewareMode: true } })
  Workspace = (await vite.ssrLoadModule('/src/pages/AssignmentDetailPage.jsx')).AssignmentDetailWorkspace
  Pending = (await vite.ssrLoadModule('/src/components/teacher/TeacherPendingState.jsx')).default
  Evidence = (await vite.ssrLoadModule('/src/components/assignment-detail/SubmissionEvidence.jsx')).default
})
after(async () => { await vite?.close() })
const render = element => renderToStaticMarkup(React.createElement(MemoryRouter, null, element))
const submission = i => ({ id: `attempt-${i}`, studentName: 'Nguyễn Văn An', studentCode: 'HS-1', attemptNumber: i + 1, fileName: `tài liệu dài ${i}.png`, fileUrl: `https://example.test/attempt-${i}.png`, status: 'submitted' })
test('integrated review at 0/1/30/300/1000 retains bounded queue and only selected evidence images', () => {
  for (const count of [0,1,30,300,1000]) {
    const detail = { id: 'assignment-A', title: 'Bài kiểm tra', classroom: { id: 'class-A', name: 'Lịch sử' }, threshold: '80%', coverageThreshold: 80, references: Array.from({length: 100}, (_, i) => ({ id: `reference-${i}`, fileName: `mẫu-${i}.png`, url: `https://example.test/ref-${i}.png` })), submissions: Array.from({length: count}, (_, i) => submission(i)) }
    const html = render(React.createElement(Workspace, { detail, onRefresh() {} }))
    assert.equal((html.match(/class="submission-list-item /g) ?? []).length, Math.min(30,count))
    assert.equal((html.match(/<img /g) ?? []).length, count ? 2 : 0)
    if (count) { assert.match(html, /attempt-0.png/); assert.doesNotMatch(html, /src="https:\/\/example.test\/attempt-1.png/); assert.match(html, /Nhận xét của giáo viên/) }
    else assert.match(html, /Chưa có bài để duyệt/)
    assert.match(html, /Không thể xóa bài kiểm tra đã có bài mẫu hoặc bài nộp/)
    assert.match(html, /href="\/classes\/class-A"/)
    assert.doesNotMatch(html, /Mỗi lớp học|một hồ sơ\./)
    if (count) {
      assert.match(html, /class="tk-selected-review"/)
      assert.match(html, /class="tk-selected-review-context"/)
    }
  }
})
test('neutral auth pending state contains no class, student or account identity', () => {
  const html = render(React.createElement(Pending, { standalone: true }))
  assert.match(html, /aria-busy="true"/)
  assert.match(html, /teacher-kinetic-shell/)
  assert.doesNotMatch(html, /class-A|HS-1|Nguyễn|Đăng xuất|<img/)
})
test('missing evidence URL shows honest unavailable state while references remain accessible', () => {
  const html = render(React.createElement(Evidence, { submission: { ...submission(0), fileUrl: '' }, references: [] }))
  assert.match(html, /Không có đường dẫn ảnh/)
  assert.match(html, /Chưa có ảnh bài mẫu/)
  assert.doesNotMatch(html, /<img/)
})
test('final state and detail stylesheet selectors stay Teacher-scoped; fixtures are absent from production bootstrap', async () => {
  for (const name of ['teacher-final-states.css','teacher-assignment-detail.css']) {
    const css = await readFile(new URL(`../../src/styles/${name}`, import.meta.url), 'utf8')
    const rules = [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{/g)].map(m => m[1].trim()).filter(s => !s.startsWith('@'))
    assert.ok(rules.every(s => s.startsWith('.teacher-kinetic-shell')), name)
  }
  const app = await readFile(new URL('../../src/App.jsx', import.meta.url), 'utf8')
  assert.doesNotMatch(app, /fixtures|synthetic|final-preview/)
})
