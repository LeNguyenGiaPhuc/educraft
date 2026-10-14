import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
let vite, Guard
before(async () => {
  vite = await createServer({ root: fileURLToPath(new URL('../../../', import.meta.url)), appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } })
  Guard = (await vite.ssrLoadModule('/src/components/RequireTeacherClass.jsx')).default
})
after(async () => { await vite?.close() })
test('guard loading renders neutral kinetic folio without class identity or interactive fake controls', () => {
  const html = renderToStaticMarkup(React.createElement(MemoryRouter, { initialEntries: ['/classes/private-class-id'] }, React.createElement(Routes, null, React.createElement(Route, { path: '/classes/:classId', element: React.createElement(Guard) }))))
  assert.match(html, /tk-guard-loading/)
  assert.match(html, /role="status"/)
  assert.match(html, /aria-busy="true"/)
  assert.match(html, /aria-hidden="true"/)
  assert.match(html, /Bài kiểm tra/)
  assert.match(html, /Học sinh/)
  assert.doesNotMatch(html, /private-class-id|state-panel|<button|<input|<table/)
})
test('permission effect and error/success branches match existing guard byte-for-byte', () => {
  const path = fileURLToPath(new URL('../RequireTeacherClass.jsx', import.meta.url))
  const source = readFileSync(path, 'utf8').replaceAll('\r\n', '\n')
  const previous = execFileSync('git', ['show', 'HEAD:frontend/src/components/RequireTeacherClass.jsx'], { encoding: 'utf8', cwd: fileURLToPath(new URL('../../../../', import.meta.url)) }).replaceAll('\r\n', '\n')
  const effect = text => text.slice(text.indexOf('  useEffect('), text.indexOf("  if (state.classId"))
  const outcomes = text => text.slice(text.indexOf("  if (state.status === 'error')"))
  assert.equal(effect(source), effect(previous))
  assert.equal(outcomes(source), outcomes(previous))
})
