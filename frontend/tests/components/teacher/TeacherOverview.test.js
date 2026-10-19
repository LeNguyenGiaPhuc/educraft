import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { createServer } from 'vite'

let vite
let Overview
before(async () => {
  vite = await createServer({ appType: 'custom', logLevel: 'silent', root: fileURLToPath(new URL('../../..', import.meta.url)), server: { middlewareMode: true } })
  Overview = (await vite.ssrLoadModule('/src/components/teacher/TeacherOverview.jsx')).default
})
after(async () => { await vite?.close() })
function render(snapshot) { return renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(Overview, { snapshot, onRetry() {} }))) }
function classes(count) {
  return Array.from({ length: count }, (_, index) => ({ id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`, code: '11A2', subject: 'Lịch sử', semester: 'Học kỳ 1', schoolYear: index % 2 ? '2025–2026' : '2026–2027', status: 'ACTIVE', studentCount: 30, assignmentCount: 2 }))
}
test('all stress sizes render a bounded Class Command Board with native direct links', () => {
  for (const count of [0, 1, 3, 12, 50, 100, 125]) {
    const html = render({ status: 'success', data: classes(count) })
    assert.match(html, /Lớp được phân công/)
    assert.match(html, new RegExp(`${count} lớp trong không gian làm việc`))
    assert.doesNotMatch(html, /Mỗi lớp học|một hồ sơ\.|tk-intro|TEACHER \/ FIELD NOTES/)
    assert.match(html, /class="cs-class-command-board(?:\s|")/)
    assert.equal((html.match(/data-class-id=/g) || []).length, Math.min(20, count))
    assert.doesNotMatch(html, /teacher-class-dossier|tk-folder-tab|tk-folder-sheet/)
    for (let index = 1; index <= Math.min(20, count); index++) {
      assert.ok(html.includes(`/classes/00000000-0000-4000-8000-${String(index).padStart(12, '0')}`))
    }
    if (count) assert.match(html, /class="cs-teacher-class-card"/)
  }
})
test('long duplicate names do not replace ID identity and can use the compact index', () => {
  const data = classes(3).map(item => ({ ...item, code: 'LỚP-CHUYÊN-ĐỀ-LỊCH-SỬ-VĂN-HÓA-VIỆT-NAM-2026', subject: 'Lịch sử '.repeat(20) }))
  const html = render({ status: 'success', data })
  assert.equal((html.match(/data-class-id=/g) || []).length, 3)
  assert.match(html, /LỚP-CHUYÊN-ĐỀ/)
})
test('loading, retry and empty states keep the create action', () => {
  for (const status of ['loading', 'error', 'success']) {
    const html = render({ status, data: [], message: 'Mạng không khả dụng' })
    assert.match(html, /href="\/assignments\/new"/)
    if (status === 'error') { assert.match(html, /Mạng không khả dụng/); assert.match(html, /Thử tải lại/) }
    if (status === 'loading') assert.match(html, /aria-busy="true"/)
    if (status === 'success') assert.match(html, /Chưa có lớp học nào/)
  }
})

test('Break the Frame class workspace is a direct page region with stable editorial rows', async () => {
  const css = await readFile(new URL('../../../src/styles/teacher-campus-board.css', import.meta.url), 'utf8')
  const boardRule = css.match(/\.campus-studio-teacher-dashboard \.cs-class-command-board\s*\{([^}]+)\}/)?.[1]
  const gridRule = css.match(/\.campus-studio-teacher-dashboard \.cs-teacher-class-grid\s*\{([^}]+)\}/)?.[1]

  assert.match(boardRule ?? '', /box-shadow:\s*none/)
  assert.match(boardRule ?? '', /border-radius:\s*0/)
  assert.match(gridRule ?? '', /grid-template-columns:\s*minmax\(0,\s*1fr\)/)
})

test('Teacher hero pairs its truthful count with a presentation-only lesson planner motif', () => {
  const html = render({ status: 'success', data: classes(3) })

  assert.match(html, /class="cs-teacher-hero-side"/)
  assert.match(html, /3 lớp trong không gian làm việc/)
  assert.match(html, /class="cs-teacher-planner" aria-hidden="true"/)
})

test('Teacher dashboard uses real class records and no giant decorative classroom filler', () => {
  const html = render({ status: 'success', data: classes(3) })

  assert.doesNotMatch(html, /cs-classroom-visual|cs-board-frame|cs-board-desk/)
  assert.match(html, /class="cs-teacher-command-rail"/)
  assert.match(html, /class="cs-teacher-class-grid"/)
})
