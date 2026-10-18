import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const currentDirectory = join(dirname(fileURLToPath(import.meta.url)), '../../src/pages')

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
  assert.match(source, /Hồ sơ minh họa/)
  assert.match(source, /Gợi ý chỉ để tham khảo/)
  assert.match(source, /Giáo viên chốt kết quả cuối cùng/)
  assert.match(source, /Quản trị|Quản trị viên/)
  assert.match(source, /Giáo viên/)
  assert.match(source, /Học sinh/)
  assert.doesNotMatch(source, /href="#blueprint-/)
})

test('production login source contains no plaintext demo credentials', () => {
  const source = readFileSync(join(currentDirectory, 'LoginPage.jsx'), 'utf8')

  assert.doesNotMatch(source, /(?:admin|teacher|student)@educraft\.test/)
  assert.doesNotMatch(source, /(?:admin|teacher|student)123/)
  assert.match(source, /import\.meta\.env\??\.DEV/)
  assert.match(source, /demoAccounts\.length > 0/)
})

test('Google login starts through the EduCraft backend without frontend token handling', () => {
  const source = readFileSync(join(currentDirectory, 'LoginPage.jsx'), 'utf8')

  assert.match(source, /Đăng nhập với Google/)
  assert.match(source, /authService\.getGoogleLoginUrl\(\)/)
  assert.doesNotMatch(source, /access_token|refresh_token|localStorage/)
})

