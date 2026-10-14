import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
let vite, Create, Edit, Success
before(async () => {
  vite = await createServer({ root: fileURLToPath(new URL('../../', import.meta.url)), appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } })
  Create = (await vite.ssrLoadModule('/src/pages/CreateAssignmentPage.jsx')).CreateAssignmentForm
  Edit = (await vite.ssrLoadModule('/src/components/assignment-detail/AssignmentEditor.jsx')).default
  Success = (await vite.ssrLoadModule('/src/pages/CreateAssignmentPage.jsx')).AssignmentSuccess
})
test('submission states preserve values, busy button and server-confirmed success links', () => {
  const classroom = { id: 'c', name: 'Lịch sử 11A2', studentCount: 30 }
  const html = render(Create, { classroom, classrooms: [classroom], form: { title: 'Nháp đang nhập', classId: 'c', dueAt: '2026-11-20T17:00', threshold: '80' }, errors: {}, submission: { status: 'loading' }, onChange: () => {}, onSubmit: () => {} })
  assert.match(html, /Nháp đang nhập/)
  assert.match(html, /aria-busy="true"/)
  assert.match(html, /disabled=""/)
  const success = render(Success, { classroom, submission: { data: { title: 'Bài đã tạo' } }, onCreateAnother: () => {} })
  assert.match(success, /href="\/classes\/c"/)
  assert.match(success, /Tạo bài khác/)
})
test('validation, deadline, create/edit submit handlers remain identical to pre-redesign source', () => {
  const repo = fileURLToPath(new URL('../../../', import.meta.url))
  const read = path => readFileSync(new URL(path, new URL('../../../', import.meta.url)), 'utf8').replaceAll('\r\n','\n')
  const old = path => execFileSync('git', ['show', `HEAD:${path}`], { cwd: repo, encoding: 'utf8' }).replaceAll('\r\n','\n')
  const createPath = 'frontend/src/pages/CreateAssignmentPage.jsx', editPath = 'frontend/src/components/assignment-detail/AssignmentEditor.jsx'
  const between = (text, start, end) => text.slice(text.indexOf(start), text.indexOf(end, text.indexOf(start)))
  const current = read(createPath), previous = old(createPath)
  assert.equal(between(current, 'function getDefaultAssignmentForm', 'function fieldDescribedBy'), between(previous, 'function getDefaultAssignmentForm', 'function fieldDescribedBy'))
  assert.equal(between(current, 'function CreateAssignmentWorkspace', '\n  return ('), between(previous, 'function CreateAssignmentWorkspace', '\n  return ('))
  assert.equal(between(read(editPath), '  const [form', '\n  return ('), between(old(editPath), '  const [form', '\n  return ('))
})
after(async () => { await vite?.close() })
const render = (View, props) => renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(View, props)))
test('create paper preserves 125 native class options, labels, maxlength and validation states', () => {
  const classrooms = Array.from({ length: 125 }, (_, i) => ({ id: `c-${i}`, name: 'Lịch sử chuyên đề '.repeat(6) + i, studentCount: 30 }))
  const html = render(Create, { classroom: classrooms[0], classrooms, form: { title: '', classId: 'c-0', dueAt: '', threshold: '80' }, errors: { title: 'Nhập tên bài kiểm tra.' }, submission: { status: 'error', message: 'Lỗi mạng' }, onChange: () => {}, onSubmit: () => {} })
  assert.match(html, /tk-assignment-paper/)
  assert.match(html, /maxLength="120"/i)
  assert.equal((html.match(/<option/g) ?? []).length, 126)
  assert.match(html, /aria-invalid="true"/)
  assert.match(html, /Lỗi mạng/)
  assert.match(html, /value="c-124"/)
})
test('edit paper keeps deadline/status/threshold and does not add a title limit or class switch', () => {
  const html = render(Edit, { assignment: { id: 'a', title: 'Bài kiểm tra', dueAt: '2026-10-20T10:00:00Z', coverageThreshold: 80, status: 'OPEN' }, onSaved: () => {}, onCancel: () => {} })
  assert.match(html, /tk-assignment-editor/)
  assert.match(html, /2026-10-20T17:00/)
  assert.doesNotMatch(html, /maxLength|name="classId"/i)
  assert.match(html, /value="DRAFT"/)
  assert.match(html, /value="CLOSED"/)
})
