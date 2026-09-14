import assert from 'node:assert/strict'
import test from 'node:test'

import { createAiEvaluationService } from './aiEvaluationService.js'

test('creates and reads a submission AI evaluation', async () => {
  const calls = []
  const api = {
    post: async (path, body) => {
      calls.push({ method: 'post', path, body })
      return { id: 'evaluation-1' }
    },
    get: async (path, body) => {
      calls.push({ method: 'get', path, body })
      return { id: 'evaluation-1' }
    },
  }
  const evaluations = createAiEvaluationService({ api })

  await evaluations.createEvaluation('submission-1')
  await evaluations.getEvaluation('submission-1')

  assert.deepEqual(calls, [
    { method: 'post', path: '/api/submissions/submission-1/ai-evaluation', body: undefined },
    { method: 'get', path: '/api/submissions/submission-1/ai-evaluation', body: undefined },
  ])
})
