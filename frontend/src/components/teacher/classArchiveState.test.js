import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildClassArchiveModel,
  CLASS_PAGE_SIZE,
  filterTeacherClasses,
  normalizeTeacherSearch,
} from './classArchiveState.js'

function classes(count) {
  return Array.from({ length: count }, (_, index) => ({
    id: `class-${index + 1}`,
    code: `10A${index + 1}`,
    subject: index % 2 ? 'Lịch sử' : 'Ngữ văn',
    semester: index % 2 ? 'Học kỳ 2' : 'Học kỳ 1',
    schoolYear: '2026-2027',
  }))
}

test('normalizes Vietnamese accents, case, and đ consistently', () => {
  assert.equal(normalizeTeacherSearch('  ĐỊA lý — HỌC KỲ  '), 'dia ly — hoc ky')
  assert.equal(normalizeTeacherSearch('Đặng'), 'dang')
})

test('searches only the loaded class fields and preserves API order', () => {
  const loaded = classes(3)
  const result = filterTeacherClasses(loaded, 'lich su')

  assert.deepEqual(result.map((classroom) => classroom.id), ['class-2'])
  assert.deepEqual(filterTeacherClasses(loaded, ''), loaded)
})

test('paginates twenty classes without changing the selected ID', () => {
  const loaded = classes(45)
  const model = buildClassArchiveModel({
    classes: loaded,
    page: 2,
    selectedClassId: 'class-1',
  })

  assert.equal(CLASS_PAGE_SIZE, 20)
  assert.equal(model.page, 2)
  assert.equal(model.pageCount, 3)
  assert.equal(model.items.length, 20)
  assert.equal(model.items[0].id, 'class-21')
  assert.equal(model.selectedClass.id, 'class-1')
})

test('falls back to the first loaded ID when the selected class disappears', () => {
  const model = buildClassArchiveModel({
    classes: classes(2),
    selectedClassId: 'class-no-longer-loaded',
  })

  assert.equal(model.selectedClass.id, 'class-1')
})

test('keeps the selected dossier when search hides it', () => {
  const model = buildClassArchiveModel({
    classes: classes(3),
    query: 'lich su',
    selectedClassId: 'class-1',
  })

  assert.equal(model.selectedClass.id, 'class-1')
  assert.equal(model.selectedOutsideResults, true)
  assert.deepEqual(model.items.map((classroom) => classroom.id), ['class-2'])
})
