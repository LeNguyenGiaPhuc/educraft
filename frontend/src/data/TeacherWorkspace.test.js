import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { fileURLToPath } from 'node:url'

import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { createServer } from 'vite'

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

test('teacher dashboard shows assignment work without class management controls', async () => {
  const { default: DashboardPage } = await vite.ssrLoadModule('/src/pages/DashboardPage.jsx')
  const markup = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      null,
      React.createElement(DashboardPage),
    ),
  )

  assert.match(markup, /Tạo bài kiểm tra/)
  assert.doesNotMatch(markup, /Quản lý lớp|Đóng quản lý|Tạo lớp/)
})

test('teacher can view a class roster without student import controls', async () => {
  const previousWindow = globalThis.window
  globalThis.window = { location: { search: '?tab=students&import=1' } }

  try {
    const { default: ClassDetailPage } = await vite.ssrLoadModule('/src/pages/ClassDetailPage.jsx')
    const markup = renderToStaticMarkup(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/classes/10A1?tab=students&import=1'] },
        React.createElement(
          Routes,
          null,
          React.createElement(Route, {
            element: React.createElement(ClassDetailPage),
            path: '/classes/:classId',
          }),
        ),
      ),
    )

    assert.match(markup, /Danh sách học sinh/)
    assert.doesNotMatch(markup, /Nhập danh sách Excel|Đóng nhập file|Nhập dữ liệu hàng loạt/)
  } finally {
    if (previousWindow === undefined) {
      delete globalThis.window
    } else {
      globalThis.window = previousWindow
    }
  }
})
