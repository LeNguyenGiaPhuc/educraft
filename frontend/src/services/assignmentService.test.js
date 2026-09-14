import assert from 'node:assert/strict'
import test from 'node:test'

import { createAssignmentService } from './assignmentService.js'

function fakeApi() {
  const calls = []
  const api = {}

  for (const method of ['get', 'post', 'patch', 'delete']) {
    api[method] = async (path, body) => {
      calls.push({ method, path, body })
      return { method, path, body }
    }
  }

  return { api, calls }
}

test('provides assignment CRUD methods with the backend paths', async () => {
  const { api, calls } = fakeApi()
  const assignments = createAssignmentService({ api })

  await assignments.listAssignments('class/1')
  await assignments.createAssignment('class/1', { title: 'Test 01' })
  await assignments.getAssignment('assignment/1')
  await assignments.updateAssignment('assignment/1', { status: 'OPEN' })
  await assignments.deleteAssignment('assignment/1')

  assert.deepEqual(calls, [
    { method: 'get', path: '/api/classes/class%2F1/assignments', body: undefined },
    {
      method: 'post',
      path: '/api/classes/class%2F1/assignments',
      body: { title: 'Test 01' },
    },
    { method: 'get', path: '/api/assignments/assignment%2F1', body: undefined },
    {
      method: 'patch',
      path: '/api/assignments/assignment%2F1',
      body: { status: 'OPEN' },
    },
    { method: 'delete', path: '/api/assignments/assignment%2F1', body: undefined },
  ])
})
