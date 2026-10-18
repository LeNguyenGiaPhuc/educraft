import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { aiCheckerCases } from '../evals/aiCheckerCases.js'

test('AI checker evaluation set contains 20 valid and uniquely named cases', () => {
  assert.equal(aiCheckerCases.length, 20)
  assert.equal(new Set(aiCheckerCases.map((item) => item.id)).size, 20)

  for (const item of aiCheckerCases) {
    assert.ok(item.reference_transcription.trim())
    assert.ok(item.student_transcription.trim())
    assert.ok(['PASSED', 'NEEDS_TEACHER_REVIEW'].includes(item.expected_status))
    assert.ok(Array.isArray(item.expected_categories))
  }
})

test('AI checker command loads backend environment variables before reading config', async () => {
  const source = await readFile(
    new URL('../scripts/runAiCheckerEval.js', import.meta.url),
    'utf8',
  )

  assert.ok(source.indexOf("import 'dotenv/config'") < source.indexOf("import { loadEnv }"))
  assert.match(source, /process\.argv\.slice\(2\)/)
  assert.match(source, /actual categories:/)
})
