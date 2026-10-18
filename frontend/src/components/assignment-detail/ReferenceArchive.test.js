import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

let vite
let components
before(async () => {
  vite = await createServer({ appType: 'custom', logLevel: 'silent', root: fileURLToPath(new URL('../../..', import.meta.url)), server: { middlewareMode: true } })
  components = await vite.ssrLoadModule('/src/components/assignment-detail/ReferenceCard.jsx')
})
after(async () => { await vite.close() })

test('reference archive uses semantic compact records without downloading document images', () => {
  const references = Array.from({ length: 100 }, (_, i) => ({ id: `reference-${i}`, fileName: `Tài liệu ${i} ${'tên-dài-'.repeat(30)}.png`, url: `https://example.test/${i}`, uploadedAt: '2026-10-14T01:00:00Z' }))
  const html = renderToStaticMarkup(React.createElement(components.ReferenceCard, { assignment: { id: 'assignment-a' }, references, onChanged() {} }))
  assert.match(html, /tk-reference-archive/)
  assert.match(html, /aria-label="Danh sách bài mẫu đã tải"/)
  assert.equal((html.match(/class="reference-entry teacher-reference-entry"/g) ?? []).length, 100)
  for (const reference of references) assert.ok(html.includes(reference.url) && html.includes(reference.fileName))
  assert.doesNotMatch(html, /<img|state-kicker/)
  assert.match(html, /100 bài mẫu/)
})

test('reference editor keeps validation relationship and pending controls accessible', () => {
  const html = renderToStaticMarkup(React.createElement(components.ReferenceEditor, {
    editor: { mode: 'replace', referenceId: 'ref-2', file: { name: 'bài-mẫu.png' }, error: 'File không hợp lệ', status: 'loading' },
    onCancel() {}, onFileChange() {}, onSubmit() {},
  }))
  assert.match(html, /aria-describedby="reference-file-ref-2-help reference-file-ref-2-error"/)
  assert.match(html, /aria-invalid="true"/)
  assert.match(html, /aria-busy="true"/)
  assert.match(html, /Đang lưu/)
  assert.match(html, /image\/png,image\/jpeg,image\/webp/)
  assert.match(html, /tối đa 5 MB/)
  assert.match(html, /type="file" disabled=""/)
})

test('reference surface CSS is Teacher-scoped with bounded local scroll and reduced motion', async () => {
  const css = await readFile(new URL('../../styles/teacher-reference-archive.css', import.meta.url), 'utf8')
  assert.match(css, /max-height: 480px/)
  assert.match(css, /overflow-y: auto/)
  assert.match(css, /prefers-reduced-motion/)
  assert.match(css, /overflow-wrap: anywhere/)
  assert.match(css, /\.teacher-kinetic-shell \.tk-reference-archive/)
})
