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
test('all stress sizes retain one dossier, bounded rows and native direct links', () => {
  for (const count of [0, 1, 3, 12, 50, 100, 125]) {
    const html = render({ status: 'success', data: classes(count) })
    assert.match(html, /Lớp được phân công/)
    assert.doesNotMatch(html, /Mỗi lớp học|một hồ sơ\.|tk-intro|TEACHER \/ FIELD NOTES/)
    assert.equal((html.match(/id="teacher-class-dossier"/g) || []).length, count ? 1 : 0)
    assert.equal((html.match(/class="tk-index-row/g) || []).length, count > 3 ? Math.min(20, count) : 0)
    assert.equal((html.match(/class="tk-folder-tab"/g) || []).length, count > 0 && count <= 3 ? count : 0)
    for (let index = 1; index <= Math.min(20, count); index++) {
      assert.ok(html.includes(`/classes/00000000-0000-4000-8000-${String(index).padStart(12, '0')}`))
    }
    if (count) assert.match(html, /aria-pressed="true"/)
    if (count > 3) assert.ok(html.indexOf('class="tk-folder-sheet"') < html.indexOf('class="tk-index-panel"'))
  }
})
test('long duplicate names do not replace ID identity and can use the compact index', () => {
  const data = classes(3).map(item => ({ ...item, code: 'LỚP-CHUYÊN-ĐỀ-LỊCH-SỬ-VĂN-HÓA-VIỆT-NAM-2026', subject: 'Lịch sử '.repeat(20) }))
  const html = render({ status: 'success', data })
  assert.equal((html.match(/class="tk-index-row/g) || []).length, 3)
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
test('fixture uses identical production CSS import order and shared overview', async () => {
  const src = new URL('../../', import.meta.url)
  const main = await readFile(new URL('main.jsx', src), 'utf8')
  const app = await readFile(new URL('App.jsx', src), 'utf8')
  const fixture = await readFile(new URL('../../../tests/fixtures/teacher/phase1-preview.jsx', import.meta.url), 'utf8')
  const imports = code => [...code.matchAll(/import ['"]([^'"]+\.css)['"]/g)].map(match => match[1].replace(/^.*?src\//, '').replace(/^\.\//, ''))
  assert.deepEqual(imports(fixture), [...imports(main), ...imports(app)])
  assert.match(fixture, /<TeacherOverview snapshot=/)
})
