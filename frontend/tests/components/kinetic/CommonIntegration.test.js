import assert from 'node:assert/strict'
import { before, after, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { createServer } from 'vite'
import { registryFieldErrors } from '../../../src/data/adminRegistry.js'

let vite, Field, Pending, ErrorState, RoleRoute, AuthContext, Login
before(async () => {
  vite = await createServer({ root: fileURLToPath(new URL('../../..', import.meta.url)), appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } })
  Field = (await vite.ssrLoadModule('/src/components/kinetic/FormField.jsx')).default
  Pending = (await vite.ssrLoadModule('/src/components/CommonPendingState.jsx')).default
  ErrorState = (await vite.ssrLoadModule('/src/components/PageErrorState.jsx')).default
  RoleRoute = (await vite.ssrLoadModule('/src/components/RoleRoute.jsx')).default
  AuthContext = (await vite.ssrLoadModule('/src/contexts/AuthContext.js')).default
  Login = (await vite.ssrLoadModule('/src/pages/LoginPage.jsx')).default
})
after(async () => { await vite?.close() })
const render = element => renderToStaticMarkup(element)

test('all class server field aliases describe their own invalid native control', () => {
  const errors = registryFieldErrors({ code: ['Sai mã lớp'], subject: ['Sai môn học'], teacher_id: ['Sai giáo viên'], semester: ['Sai học kỳ'], school_year: ['Sai năm học'], status: ['Sai trạng thái'] })
  for (const [key, message] of Object.entries(errors)) {
    const control = React.createElement(key === 'teacherId' || key === 'status' ? 'select' : 'input', { id: key, 'aria-describedby': `${key}-help`, disabled: key === 'id' })
    const html = render(React.createElement(Field, { label: key, error: message }, control))
    assert.ok(html.includes(`aria-invalid="true"`))
    assert.ok(html.includes(`aria-describedby="${key}-help ${key}-error"`))
    assert.ok(html.includes(`id="${key}-error">${message}</small>`))
    assert.ok(html.includes(`for="${key}"`))
  }
})
test('valid fields have unique IDs and no dangling error description', () => {
  const html = render(React.createElement('div', null, ...['Môn học', 'Học kỳ'].map(label => React.createElement(Field, { key: label, label }, React.createElement('input')))))
  const ids = [...html.matchAll(/<input\b[^>]*?\sid="([^"]+)"/g)].map(match => match[1])
  assert.equal(new Set(ids).size, 2)
  assert.doesNotMatch(html, /aria-describedby/)
  assert.equal((html.match(/aria-invalid="false"/g) ?? []).length, 2)
})
test('account field errors preserve API aliases and describe their own control', () => {
  const errors = registryFieldErrors({ email: ['Sai email'], username: ['Sai tài khoản'], full_name: ['Sai tên'], role: ['Sai vai trò'] })
  for (const [key, message] of Object.entries(errors)) {
    const html = render(React.createElement(Field, { label: key, error: message }, React.createElement('input', { id: key })))
    assert.ok(html.includes(`aria-describedby="${key}-error"`))
    assert.ok(html.includes(`id="${key}-error">${message}</small>`))
  }
})
test('common pending is neutral and announces the real blocking operation', () => {
  const html = render(React.createElement(Pending, { message: 'Đang kiểm tra phiên đăng nhập…' }))
  assert.match(html, /role="status" aria-busy="true"/)
  assert.match(html, /aria-hidden="true"/)
  assert.doesNotMatch(html, /input|data-record-id|teacher_id|student_id/)
})
test('standalone error theme is opt-in and preserves existing role error markup', () => {
  const props = { title: 'Không thể mở', message: 'Lỗi kết nối', returnTo: '/student' }
  const wrap = standalone => render(React.createElement(MemoryRouter, null, React.createElement(ErrorState, { ...props, standalone })))
  assert.doesNotMatch(wrap(false), /kf-common-page/)
  assert.match(wrap(true), /kf-common-page/)
  assert.match(wrap(true), /href="\/student"/)
})
test('wrong-role, pending and guest routes never render the protected outlet', () => {
  for (const role of ['TEACHER', 'STUDENT', 'ADMIN']) {
    for (const state of [{ user: null, isLoading: false }, { user: { role }, isLoading: true }, ...['TEACHER', 'STUDENT', 'ADMIN'].filter(r => r !== role).map(r => ({ user: { role: r }, isLoading: false }))]) {
      const html = render(React.createElement(AuthContext.Provider, { value: state }, React.createElement(MemoryRouter, { initialEntries: ['/protected'] }, React.createElement(Routes, null, React.createElement(Route, { element: React.createElement(RoleRoute, { allowedRoles: [role] }) }, React.createElement(Route, { path: '/protected', element: React.createElement('p', null, 'PRIVATE-RECORD') }))))))
      assert.doesNotMatch(html, /PRIVATE-RECORD/)
    }
  }
})
test('login keeps native labelled controls, reveal and empty credentials in shared Kinetic scope', () => {
  const html = render(React.createElement(AuthContext.Provider, { value: { user: null } }, React.createElement(MemoryRouter, null, React.createElement(Login))))
  assert.match(html, /class="login-panel kf-login"/)
  assert.match(html, /aria-labelledby="login-title"/)
  assert.match(html, /autoComplete="username"[^>]*id="login-email"/)
  assert.match(html, /type="password"/)
  assert.match(html, /aria-label="Hiện mật khẩu"/)
  assert.match(html, /href="http:\/\/localhost:3000\/api\/auth\/google"/)
  assert.match(html, />Đăng nhập với Google</)
  assert.doesNotMatch(html, /login-panel-index|login-panel-note/)
})
