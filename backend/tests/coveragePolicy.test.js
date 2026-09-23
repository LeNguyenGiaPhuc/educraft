import assert from 'node:assert/strict'
import test from 'node:test'

import { deriveSuggestedStatus } from '../src/modules/ai-evaluations/coveragePolicy.js'

test('coverage exactly at the assignment threshold is completed', () => {
  assert.equal(
    deriveSuggestedStatus({ coverageScore: 80, coverageThreshold: 80 }),
    'COMPLETED',
  )
})

test('coverage below the assignment threshold needs completion', () => {
  assert.equal(
    deriveSuggestedStatus({ coverageScore: 79.99, coverageThreshold: 80 }),
    'NEEDS_COMPLETION',
  )
})

test('invalid assignment thresholds are rejected instead of silently changing the rule', () => {
  assert.throws(
    () => deriveSuggestedStatus({ coverageScore: 80, coverageThreshold: 101 }),
    (error) => error.code === 'AI_COVERAGE_THRESHOLD_INVALID',
  )
})
