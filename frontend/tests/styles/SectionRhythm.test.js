import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const styles = (name) => readFile(new URL(`../../src/styles/${name}`, import.meta.url), 'utf8')

test('Student dashboard uses deliberate section bands with bounded entrance motion', async () => {
  const css = await styles('student-campus-board.css')

  assert.match(css, /\.cs-student-welcome[^}]*background:\s*var\(--ec-color-ink-navy\)/s)
  assert.match(css, /\.cs-student-open-zone::before[^}]*background:\s*var\(--ec-color-paper\)/s)
  assert.match(css, /\.cs-student-class-board::before[^}]*var\(--ec-color-mint\)/s)
  assert.match(css, /\.cs-student-assignment-board::before[^}]*background:\s*var\(--ec-color-paper\)/s)
  assert.match(css, /animation:\s*cs-region-in\s+260ms/)
  assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*animation:\s*none/)
})

test('Teacher dashboard keeps a navy intro and Paper class workspace without changing Review Board', async () => {
  const dashboard = await styles('teacher-campus-board.css')
  const review = await styles('teacher-review-board.css')

  assert.match(dashboard, /\.cs-teacher-page-heading[^}]*background:\s*var\(--ec-color-ink-navy\)/s)
  assert.match(dashboard, /\.cs-teacher-main-panel::before[^}]*background:\s*var\(--ec-color-paper\)/s)
  assert.match(dashboard, /animation:\s*cs-teacher-region-in\s+260ms/)
  assert.doesNotMatch(review, /animation-timeline:\s*view/)
})

test('Admin alternates only restrained operational sections and never animates rows', async () => {
  const css = await styles('admin-kinetic.css')

  assert.match(css, /\.admin-filter-card[^}]*background:\s*var\(--ec-color-surface-subtle\)/s)
  assert.match(css, /\.ar-overview[^}]*background:\s*var\(--ec-color-paper\)/s)
  assert.match(css, /@keyframes\s+ar-section-enter/)
  assert.doesNotMatch(css, /\.admin-data-table tbody tr[^}]*animation:/s)
})

test('Landing uses solid Campus section bands instead of a full-page gradient', async () => {
  const css = await styles('landing-dossier.css')

  const pageRule = css.match(/\.living-dossier\s*\{([^}]+)\}/)?.[1] ?? ''
  assert.match(pageRule, /background:\s*var\(--ec-color-cloud\)/)
  assert.doesNotMatch(pageRule, /gradient/)
  assert.match(css, /\.living-dossier-main::before[^}]*var\(--ec-color-sky\)/s)
  assert.match(css, /\.living-dossier-footer[^}]*background:\s*var\(--ec-color-ink-navy\)/s)
})
