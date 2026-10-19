import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'
import { validateAssignmentForm as validateCreateForm } from '../../src/data/assignmentForm.js'
import { validateAssignmentTitle as validateEditTitle } from '../../src/data/assignmentTitle.js'
let vite, Create, Edit, Success
before(async () => {
  vite = await createServer({ root: fileURLToPath(new URL('../..', import.meta.url)), appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } })
  const createModule = await vite.ssrLoadModule('/src/pages/CreateAssignmentPage.jsx')
  const editModule = await vite.ssrLoadModule('/src/components/assignment-detail/AssignmentEditor.jsx')
  Create = createModule.CreateAssignmentForm
  Edit = editModule.default
  Success = createModule.AssignmentSuccess
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
test('create and edit accept 160 title characters and reject 161', () => {
  const classrooms = [{ id: 'c', name: 'Lịch sử', studentCount: 30 }]
  const validForm = { title: 'a'.repeat(160), classId: 'c', dueAt: '2026-11-20T17:00', threshold: '80' }
  assert.equal(typeof validateCreateForm, 'function')
  assert.equal(typeof validateEditTitle, 'function')
  assert.equal(validateCreateForm(validForm, classrooms).title, undefined)
  assert.equal(validateCreateForm({ ...validForm, title: 'a'.repeat(161) }, classrooms).title, 'Tên bài kiểm tra không vượt quá 160 ký tự.')
  assert.equal(validateEditTitle('a'.repeat(160)), null)
  assert.equal(validateEditTitle('a'.repeat(161)), 'Tên bài kiểm tra không vượt quá 160 ký tự.')
})
after(async () => { await vite?.close() })
const render = (View, props) => renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(View, props)))
test('create paper preserves 125 native class options, labels, maxlength and validation states', () => {
  const classrooms = Array.from({ length: 125 }, (_, i) => ({ id: `c-${i}`, name: 'Lịch sử chuyên đề '.repeat(6) + i, studentCount: 30 }))
  const html = render(Create, { classroom: classrooms[0], classrooms, form: { title: '', classId: 'c-0', dueAt: '', threshold: '80' }, errors: { title: 'Nhập tên bài kiểm tra.' }, submission: { status: 'error', message: 'Lỗi mạng' }, onChange: () => {}, onSubmit: () => {} })
  assert.match(html, /tk-assignment-paper/)
  assert.match(html, /maxLength="160"/i)
  assert.equal((html.match(/<option/g) ?? []).length, 126)
  assert.match(html, /aria-invalid="true"/)
  assert.match(html, /Lỗi mạng/)
  assert.match(html, /value="c-124"/)
  assert.match(html, /Bài mẫu được thêm sau khi tạo bài kiểm tra/)
  assert.match(html, /class="tk-form-next-step"/)
})
test('edit paper keeps deadline/status/threshold and the shared title limit without a class switch', () => {
  const html = render(Edit, { assignment: { id: 'a', title: 'Bài kiểm tra', dueAt: '2026-10-20T10:00:00Z', coverageThreshold: 80, status: 'OPEN' }, onSaved: () => {}, onCancel: () => {} })
  assert.match(html, /tk-assignment-editor/)
  assert.match(html, /2026-10-20T17:00/)
  assert.match(html, /maxLength="160"/i)
  assert.doesNotMatch(html, /name="classId"/i)
  assert.match(html, /value="DRAFT"/)
  assert.match(html, /value="CLOSED"/)
})
