import 'dotenv/config'

import { loadEnv } from '../src/config/env.js'
import { createAiProvider } from '../src/createDependencies.js'
import { aiCheckerCases } from '../evals/aiCheckerCases.js'

function hasExpectedCategories(actual, expected) {
  const actualCategories = new Set(actual.map((finding) => finding.category))
  return expected.every((category) => actualCategories.has(category))
}

async function run() {
  const config = loadEnv()
  const provider = createAiProvider(config)
  const requestedIds = new Set(process.argv.slice(2))
  const casesToRun = requestedIds.size === 0
    ? aiCheckerCases
    : aiCheckerCases.filter((item) => requestedIds.has(item.id))
  const results = []

  if (casesToRun.length === 0) {
    throw new Error('Không tìm thấy test case được yêu cầu.')
  }

  for (const item of casesToRun) {
    const checkerResult = await provider.check({
      reference_transcription: item.reference_transcription,
      student_transcription: item.student_transcription,
      ...item.suggestion,
    })
    const passed = checkerResult.status === item.expected_status
      && hasExpectedCategories(checkerResult.findings, item.expected_categories)

    const actualCategories = checkerResult.findings.map((finding) => finding.category)
    results.push({ id: item.id, passed, actual_status: checkerResult.status })
    console.log(`${passed ? 'PASS' : 'FAIL'} ${item.id}: ${checkerResult.status}`)
    if (!passed) {
      console.log(`  expected categories: ${item.expected_categories.join(', ') || '(none)'}`)
      console.log(`  actual categories: ${actualCategories.join(', ') || '(none)'}`)
    }
  }

  const passedCount = results.filter((item) => item.passed).length
  console.log(`\n${passedCount}/${results.length} checker cases passed.`)
  if (passedCount !== results.length) process.exitCode = 1
}

run().catch((error) => {
  console.error(`Checker evaluation could not finish: ${error.code ?? error.message}`)
  process.exitCode = 1
})
