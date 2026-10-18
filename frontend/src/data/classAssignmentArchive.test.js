import test from 'node:test'
import assert from 'node:assert/strict'
import { buildAssignmentArchive, mapClassAssignment } from './classAssignmentArchive.js'

const records = count => Array.from({ length: count }, (_, i) => ({ id: `assignment-${i}`, title: `Lịch sử Việt Nam ${i}`, status: ['OPEN', 'DRAFT', 'CLOSED'][i % 3], coverage_threshold: 80 }))

test('archive renders at most 25 entries for every approved scale', () => {
  for (const count of [0, 1, 20, 100, 500]) {
    const rows = records(count).map(record => mapClassAssignment(record, 0))
    const model = buildAssignmentArchive({ rows })
    assert.equal(model.items.length, Math.min(count, 25))
    assert.equal(model.loadedCount, count)
    const seen = Array.from({ length: model.pageCount }, (_, i) => buildAssignmentArchive({ rows, page: i + 1 }).items).flat()
    assert.deepEqual(seen.map(row => row.id), rows.map(row => row.id))
  }
})

test('accent-insensitive title search, exact status filter and clamped pages preserve API order', () => {
  const rows = records(100).map(record => mapClassAssignment(record))
  const result = buildAssignmentArchive({ rows, query: 'LICH SU VIET NAM', status: 'OPEN', page: 999 })
  assert.equal(result.matchCount, 34)
  assert.equal(result.page, 2)
  assert.deepEqual(result.items.map(row => row.id), rows.filter(row => row.statusCode === 'OPEN').slice(25).map(row => row.id))
  assert.equal(buildAssignmentArchive({ rows, query: 'không tồn tại' }).items.length, 0)
})

test('zero attempts differs from failed or unavailable attempt counts', () => {
  assert.equal(mapClassAssignment({}, 0).submission, '0 lượt nộp')
  assert.equal(mapClassAssignment({}).submission, 'Chưa có dữ liệu')
  assert.equal(mapClassAssignment({}, NaN).submissionCount, null)
})

