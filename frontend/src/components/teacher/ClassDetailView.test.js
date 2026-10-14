import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'
let vite, View, Count
before(async () => {
  vite = await createServer({ root: fileURLToPath(new URL('../../../', import.meta.url)), appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } })
  View = (await vite.ssrLoadModule('/src/components/teacher/ClassDetailView.jsx')).default
  Count = (await vite.ssrLoadModule('/src/components/teacher/AssignmentArchive.jsx')).SubmissionCount
})
test('count micro-states never substitute zero for loading/error and retry remains assignment-specific', () => {
  const renderCount = entry => renderToStaticMarkup(React.createElement(Count, { entry, assignment: { id: 'a-7', title: 'Lịch sử' }, onRetry: () => {} }))
  assert.match(renderCount(undefined), /Đang tải/)
  assert.doesNotMatch(renderCount(undefined), /0 lượt nộp/)
  assert.match(renderCount({ status: 'error' }), /Thử tải lại lượt nộp: Lịch sử/)
  assert.doesNotMatch(renderCount({ status: 'error' }), /0 lượt nộp/)
  assert.match(renderCount({ status: 'success', count: 0 }), /0 lượt nộp/)
  assert.match(renderCount({ status: 'success', count: 7 }), /7 lượt nộp/)
})
after(async () => { await vite?.close() })
const render = state => renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(View, { state, activeTab: 'assignments', onTabChange: () => {} })))
test('semantic assignment archive bounds rows without losing real detail links at every scale', () => {
  for (const count of [0, 1, 20, 100, 500]) {
    const html = render({ status: 'success', classroom: { id: 'class-id', code: '11A2', subject: 'Lịch sử', status: 'ACTIVE', students: [], studentCount: 0, assignmentCount: count }, assignments: Array.from({ length: count }, (_, i) => ({ id: `a-${i}`, title: 'Tên bài kiểm tra dài '.repeat(10), statusCode: 'OPEN', status: 'Đang mở', submission: 'Chưa có dữ liệu', threshold: '80%', dueDate: 'Chưa có hạn nộp' })) })
    assert.equal((html.match(/class="tk-assignment-record"/g) ?? []).length, Math.min(count, 25))
    assert.match(html, /role="tablist"/)
    assert.match(html, /id="students-panel"[^>]*hidden/)
    if (count) assert.match(html, /href="\/classes\/class-id\/assignments\/a-0"/)
  }
})
test('roster remains read-only with all 300 loaded students; loading and error are explicit', () => {
  const html = render({ status: 'success', assignments: [], classroom: { id: 'class-id', students: Array.from({ length: 300 }, (_, i) => ({ id: `s-${i}`, code: `HS-${i}`, name: `Học sinh ${i}` })), studentCount: 300, assignmentCount: 0 } })
  assert.match(html, /HS-299/)
  assert.doesNotMatch(html, /Import|Thêm học sinh|Xóa học sinh/)
  assert.match(render({ status: 'loading' }), /aria-busy="true"/)
  assert.match(render({ status: 'error', message: 'Lỗi kiểm thử' }), /role="alert"/)
})
