import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

const css = await readFile(new URL('./teacher.css', import.meta.url), 'utf8')

test('teacher data table headers use a high-contrast dark surface', () => {
  assert.match(
    css,
    /\.teacher-data-table th\s*\{[^}]*background:\s*var\(--ink\)[^}]*color:\s*var\(--surface\)/s,
  )
})
