import assert from 'node:assert/strict'
import test from 'node:test'
import { assignmentDetailFailure } from '../../src/data/assignmentDetailState.js'
test('same assignment refresh failure retains detail identity and mounted drafts; initial/other assignment failures are fatal', () => {
  const detail = { id: 'A' }
  const current = { status: 'success', assignmentId: 'A', detail }
  const result = assignmentDetailFailure(current, 'A', 'network')
  assert.equal(result.detail, detail)
  assert.equal(result.status, 'success')
  assert.equal(result.refreshError, 'network')
  assert.equal(assignmentDetailFailure(current, 'B', 'denied').detail, null)
  for (const status of [401,403,404]) assert.equal(assignmentDetailFailure(current, 'A', 'access invalid', status).detail, null)
  assert.equal(assignmentDetailFailure({ status: 'loading' }, 'A', 'network').status, 'error')
})
