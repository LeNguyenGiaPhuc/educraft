import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

const app = await readFile(new URL('../../src/App.jsx', import.meta.url), 'utf8')
const main = await readFile(new URL('../../src/main.jsx', import.meta.url), 'utf8')
const indexCss = await readFile(new URL('../../src/index.css', import.meta.url), 'utf8')
const tokensCss = await readFile(new URL('../../src/styles/tokens.css', import.meta.url), 'utf8')
const blueprintCss = await readFile(new URL('../../src/styles/blueprint.css', import.meta.url), 'utf8')

test('design tokens load before the global base stylesheet', () => {
  const tokensImport = main.indexOf("import './styles/tokens.css'")
  const indexImport = main.indexOf("import './index.css'")

  assert.ok(tokensImport >= 0)
  assert.ok(indexImport > tokensImport)
  assert.doesNotMatch(app, /import '\.\/styles\/tokens\.css'/)
})

test('tokens expose campus primitives, semantics, components, and legacy aliases', () => {
  for (const token of [
    '--ec-color-ink-navy',
    '--ec-color-paper',
    '--ec-color-learning-blue',
    '--ec-font-display',
    '--ec-space-4',
    '--ec-radius-md',
    '--ec-shadow-card',
    '--ec-motion-duration-fast',
    '--ec-color-background',
    '--ec-color-text',
    '--ec-button-height',
    '--ec-card-radius',
    '--ec-input-height',
    '--ec-badge-radius',
  ]) {
    assert.match(tokensCss, new RegExp(`${token.replaceAll('-', '\\-')}\\s*:`), token)
  }

  assert.match(tokensCss, /--page-bg:\s*var\(--ec-color-background\)/)
  assert.match(tokensCss, /--surface:\s*var\(--ec-color-surface\)/)
  assert.match(tokensCss, /--ink:\s*var\(--ec-color-text\)/)
  assert.match(tokensCss, /--accent:\s*var\(--ec-color-primary\)/)
  assert.match(tokensCss, /--control-height:\s*var\(--ec-control-height\)/)
})

test('base and blueprint styles do not redefine global foundation values', () => {
  for (const css of [indexCss, blueprintCss]) {
    assert.doesNotMatch(css, /--page-bg\s*:/)
    assert.doesNotMatch(css, /--surface\s*:/)
    assert.doesNotMatch(css, /--ink\s*:/)
    assert.doesNotMatch(css, /--accent\s*:/)
    assert.doesNotMatch(css, /--radius-md\s*:/)
  }
})

test('global focus and reduced-motion behavior use the shared foundation', () => {
  assert.match(indexCss, /:focus-visible\s*\{[^}]*var\(--ec-focus-ring\)/s)
  assert.match(indexCss, /@media\s*\(prefers-reduced-motion:\s*reduce\)/)
  assert.match(tokensCss, /--ec-control-height:\s*44px/)
  assert.match(tokensCss, /--ec-color-danger:\s*#[0-9a-f]{6}/i)
})

test('UI-0 keeps the previously rendered semantic status colors', () => {
  assert.match(tokensCss, /--ec-color-success:\s*#006c4a/i)
  assert.match(tokensCss, /--ec-color-warning:\s*#92400e/i)
  assert.match(tokensCss, /--ec-color-danger:\s*#ba1a1a/i)
})
