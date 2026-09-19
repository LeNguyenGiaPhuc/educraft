import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const currentDirectory = dirname(fileURLToPath(import.meta.url))

function readLandingSource() {
  const sources = [readFileSync(join(currentDirectory, 'LoginPage.jsx'), 'utf8')]
  const landingDirectory = join(currentDirectory, '..', 'components', 'landing')

  if (existsSync(landingDirectory)) {
    for (const fileName of readdirSync(landingDirectory)) {
      if (fileName.endsWith('.jsx') || fileName.endsWith('.js')) {
        sources.push(readFileSync(join(landingDirectory, fileName), 'utf8'))
      }
    }
  }

  return sources.join('\n')
}

test('landing copy describes only capabilities available in the current prototype', () => {
  const source = readLandingSource()

  assert.doesNotMatch(source, /Bài nộp đa trang|2 trang JPG|Điểm chốt:\s*8\.5|quyết định điểm số/)
  assert.doesNotMatch(source, /ngăn chặn triệt để/)
  assert.doesNotMatch(source, /v1\.0\.0/)
  assert.match(source, /mô phỏng deterministic/)
})

