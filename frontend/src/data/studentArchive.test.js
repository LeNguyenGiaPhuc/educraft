import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildStudentArchive, studentPage } from './studentArchive.js'

test('class search uses only loaded code/subject, handles Vietnamese, and retains ID selection', () => {
  const rows = [{ id: 'a', code: '11A', subject: 'Địa lý', semester: 'Học kỳ hai', assignments: [] }, { id: 'b', code: '11A', subject: 'Lịch sử', assignments: [] }]
  const view = buildStudentArchive({ classes: rows, classQuery: 'DIA LY', selectedId: 'b' })
  assert.deepEqual(view.classes.items.map(row => row.id), ['a'])
  assert.equal(view.selected.id, 'b')
  assert.equal(buildStudentArchive({ classes: rows, classQuery: 'học kỳ' }).classes.matchCount, 0)
})

test('all stress sizes preserve API order and make every loaded class reachable in pages of 20', () => {
  for (const count of [0, 1, 3, 12, 50, 125]) {
    const rows = Array.from({ length: count }, (_, i) => ({ id: `class-${i}`, code: 'Trùng tên', subject: 'Lịch sử', assignments: [] }))
    const visited = []
    for (let page = 1; page <= Math.max(1, Math.ceil(count / 20)); page++) {
      const view = buildStudentArchive({ classes: rows, classPage: page, selectedId: rows.at(-1)?.id })
      assert.ok(view.classes.items.length <= 20)
      visited.push(...view.classes.items.map(row => row.id))
      assert.equal(view.selected?.id, rows.at(-1)?.id)
    }
    assert.deepEqual(visited, rows.map(row => row.id))
  }
})

test('assignment search and pages are scoped to the selected class, preserve every ID and clamp pages', () => {
  for (const count of [0, 1, 25, 100, 500]) {
    const assignments = Array.from({ length: count }, (_, i) => ({ id: `assignment-${i}`, title: i === 0 ? 'Cách mạng tư sản' : 'Bài ghi' }))
    const classes = [{ id: 'a', assignments }, { id: 'b', assignments: [{ id: 'other', title: 'Cách mạng tư sản' }] }]
    const ids = []
    for (let page = 1; page <= Math.max(1, Math.ceil(count / 25)); page++) {
      const view = buildStudentArchive({ classes, selectedId: 'a', assignmentPage: page })
      assert.ok(view.assignments.items.length <= 25)
      ids.push(...view.assignments.items.map(row => row.id))
    }
    assert.deepEqual(ids, assignments.map(row => row.id))
    const result = buildStudentArchive({ classes, selectedId: 'a', assignmentQuery: 'CACH MANG', assignmentPage: 900 })
    assert.equal(result.assignments.page, 1)
    assert.deepEqual(result.assignments.items.map(row => row.id), count ? ['assignment-0'] : [])
  }
})

test('history pagination keeps all 1000 distinct attempts in API order with no grouping', () => {
  for (const count of [0,1,20,100,1000]) {
    const rows = Array.from({ length: count }, (_, i) => ({ id: `attempt-${i}`, fileName: 'Tên trùng.png' }))
    const visited = []
    for (let page = 1; page <= Math.max(1,Math.ceil(count / 20)); page++) {
      const view = studentPage(rows,page,20)
      assert.ok(view.items.length <= 20)
      visited.push(...view.items.map(row => row.id))
    }
    assert.deepEqual(visited, rows.map(row => row.id))
    assert.equal(new Set(visited).size, count)
  }
})
