import assert from 'node:assert/strict'
import test from 'node:test'

import { pageRegistry } from './adminRegistry.js'
import { filterAdminClasses, sortAdminClasses } from './adminClass.js'

test('sorts loaded classes while default and equal values preserve API order', () => {
  const classes = [
    { id: 'class-3', code: '12A1', subject: 'Văn' },
    { id: 'class-1', code: '10A2', subject: 'Địa lý' },
    { id: 'class-2', code: '10A1', subject: 'Địa lý' },
  ]

  assert.deepEqual(sortAdminClasses(classes, 'default').map((row) => row.id), [
    'class-3',
    'class-1',
    'class-2',
  ])
  assert.deepEqual(sortAdminClasses(classes, 'code-asc').map((row) => row.id), [
    'class-2',
    'class-1',
    'class-3',
  ])
  assert.deepEqual(sortAdminClasses(classes, 'code-desc').map((row) => row.id), [
    'class-3',
    'class-1',
    'class-2',
  ])
  assert.deepEqual(sortAdminClasses(classes, 'subject-asc').map((row) => row.id), [
    'class-1',
    'class-2',
    'class-3',
  ])
  assert.deepEqual(classes.map((row) => row.id), ['class-3', 'class-1', 'class-2'])
})

test('filters Vietnamese class data before sorting and paginating 25 rows', () => {
  const matching = Array.from({ length: 27 }, (_, index) => ({
    id: `class-${index}`,
    code: `12A${String(26 - index).padStart(2, '0')}`,
    subject: 'Địa lý',
    teacher_id: 'teacher-1',
    status: 'ACTIVE',
  }))
  const loaded = [
    ...matching,
    { id: 'archived', code: '12A99', subject: 'Địa lý', teacher_id: 'teacher-1', status: 'ARCHIVED' },
    { id: 'other-teacher', code: '12A98', subject: 'Địa lý', teacher_id: 'teacher-2', status: 'ACTIVE' },
  ]

  const filtered = filterAdminClasses(loaded, 'DIA LY', 'teacher-1', 'ACTIVE')
  const sorted = sortAdminClasses(filtered, 'code-asc')
  const page = pageRegistry(sorted, 1, 25)

  assert.equal(filtered.length, 27)
  assert.equal(page.items.length, 25)
  assert.equal(page.items[0].id, 'class-26')
  assert.equal(page.items[24].id, 'class-2')
  assert.equal(new Set(page.items.map((row) => row.id)).size, 25)
})
