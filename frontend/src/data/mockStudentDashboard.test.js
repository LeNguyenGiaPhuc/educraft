import assert from 'node:assert/strict'
import test from 'node:test'

import { createStoredAssignment } from './mockAssignmentStore.js'
import { getClassDetailSnapshot } from './mockClassDetail.js'
import { createStoredClass, deleteStoredClass } from './mockClassStore.js'
import { getMockUser } from './mockSession.js'
import { getStudentDashboardSnapshot } from './mockStudentDashboard.js'
import { mergeStudentRows } from './mockStudentStore.js'

function createMemoryStorage() {
  const values = new Map()

  return {
    getItem(key) {
      return values.get(key) ?? null
    },
    setItem(key, value) {
      values.set(key, value)
    },
  }
}

const student = getMockUser('student')

test('shows only the fixture student class and its activities with existing deadlines and statuses', () => {
  const snapshot = getStudentDashboardSnapshot(student, createMemoryStorage())

  assert.equal(snapshot.status, 'success')
  assert.deepEqual(snapshot.data.map((classroom) => classroom.id), ['10A1'])
  assert.deepEqual(snapshot.data[0].assignments, [
    {
      id: 'nam-xuong',
      title: 'Bài ghi Chuyện người con gái Nam Xương',
      classId: '10A1',
      className: 'Ngữ văn 10A1',
      dueDate: '18/09/2026, 23:59',
      status: 'Đang mở',
      statusTone: 'active',
    },
    {
      id: 'nghi-luan',
      title: 'Bài ghi Văn bản nghị luận',
      classId: '10A1',
      className: 'Ngữ văn 10A1',
      dueDate: '12/09/2026, 23:59',
      status: 'Đã đóng',
      statusTone: 'closed',
    },
  ])
})

test('returns no dashboard data for nonstudent or incomplete identities', () => {
  for (const user of [null, getMockUser('teacher'), { ...student, studentId: null }]) {
    const snapshot = getStudentDashboardSnapshot(user, createMemoryStorage())
    assert.equal(snapshot.status, 'error')
    assert.equal(Object.hasOwn(snapshot, 'data'), false)
  }
})

test('returns an empty dashboard when the student has no memberships', () => {
  assert.deepEqual(
    getStudentDashboardSnapshot({ ...student, studentId: 'UNKNOWN' }, createMemoryStorage()),
    { status: 'success', data: [] },
  )
})

test('uses imported rosters to scope different students independently', () => {
  const storage = createMemoryStorage()
  mergeStudentRows('10A1', [{ code: 'HS260102', name: 'Trần Hoàng Bảo' }], storage)
  mergeStudentRows('10A2', [{ code: student.studentId, name: student.name }], storage)

  const snapshot = getStudentDashboardSnapshot(student, storage)
  assert.deepEqual(snapshot.data.map((classroom) => classroom.id), ['10A2'])
  assert.deepEqual(snapshot.data[0].assignments.map((assignment) => assignment.id), ['lich-su-1'])
  assert.equal(snapshot.data[0].assignments[0].className, 'Lịch sử 10A2')

  const otherStudent = { ...student, id: 'mock-student-hs260102', studentId: 'HS260102', name: 'Trần Hoàng Bảo' }
  const otherSnapshot = getStudentDashboardSnapshot(otherStudent, storage)
  assert.deepEqual(otherSnapshot.data.map((classroom) => classroom.id), ['10A1'])
})

test('includes stored activities only in classes the student belongs to', () => {
  const storage = createMemoryStorage()
  const ownAssignment = createStoredAssignment({
    classId: '10A1', title: 'Bài ghi của lớp em', dueAt: '2026-09-20T10:00', threshold: '80',
  }, storage)
  const otherAssignment = createStoredAssignment({
    classId: '10A2', title: 'Bài ghi lớp khác', dueAt: '2026-09-20T10:00', threshold: '80',
  }, storage)
  mergeStudentRows('11A1', [{ code: student.studentId, name: student.name }], storage)

  const snapshot = getStudentDashboardSnapshot(student, storage)
  assert.deepEqual(snapshot.data.map((classroom) => classroom.id), ['10A1', '11A1'])
  const ownClass = snapshot.data.find((classroom) => classroom.id === '10A1')
  assert.deepEqual(ownClass.assignments.map((assignment) => assignment.id), ['nam-xuong', 'nghi-luan', ownAssignment.id])
  assert.equal(ownClass.assignments.at(-1).dueDate, '20/09/2026, 10:00')
  assert.equal(snapshot.data.flatMap((classroom) => classroom.assignments).some((assignment) => assignment.id === otherAssignment.id), false)
  assert.deepEqual(snapshot.data[1].assignments.map((assignment) => assignment.id), ['sinh-hoc-1'])
})

test('keeps a joined class visible when it has no activities', () => {
  const storage = createMemoryStorage()
  createStoredClass({
    id: '12B1', subject: 'Toán', semester: 'Học kỳ 1', schoolYear: 'Năm học 2026–2027',
  }, storage)
  mergeStudentRows('12B1', [{ code: student.studentId, name: student.name }], storage)

  const classroom = getStudentDashboardSnapshot(student, storage).data.find((item) => item.id === '12B1')
  assert.equal(classroom.name, 'Toán 12B1')
  assert.deepEqual(classroom.assignments, [])
})

test('does not return a deleted class or its fixture activities', () => {
  const storage = createMemoryStorage()
  deleteStoredClass('10A1', storage)

  assert.deepEqual(getStudentDashboardSnapshot(student, storage), { status: 'success', data: [] })
})

test('projects only dashboard fields even if stored assignments contain teacher data', () => {
  const storage = createMemoryStorage()
  storage.setItem('educraft.assignments', JSON.stringify([{
    id: 'stored-with-private-fields',
    classId: '10A1',
    title: 'Bài ghi mới',
    dueDate: '20/09/2026, 10:00',
    status: 'Đang mở',
    statusTone: 'active',
    submission: '42/42 học sinh đã nộp',
    submissions: [{ studentId: 'HS260102', score: 90 }],
    reference: { fileName: 'teacher.png' },
    feedback: 'Nhận xét riêng',
    threshold: '80%',
  }]))

  const snapshot = getStudentDashboardSnapshot(student, storage)
  for (const classroom of snapshot.data) {
    assert.deepEqual(Object.keys(classroom).sort(), ['assignments', 'id', 'name', 'schoolYear', 'semester'])
    for (const assignment of classroom.assignments) {
      assert.deepEqual(Object.keys(assignment).sort(), ['classId', 'className', 'dueDate', 'id', 'status', 'statusTone', 'title'])
    }
  }
  assert.equal(JSON.stringify(snapshot).includes('HS260102'), false)
  assert.equal(JSON.stringify(snapshot).includes('42/42'), false)
})

test('reads without writing and returns objects independent of the teacher snapshot', () => {
  const storage = {
    getItem() { return null },
    setItem() { throw new Error('Dashboard must not write storage') },
  }
  const teacherBefore = getClassDetailSnapshot('10A1', storage)
  const snapshot = getStudentDashboardSnapshot(student, storage)
  snapshot.data[0].name = 'Changed locally'
  snapshot.data[0].assignments[0].title = 'Changed locally'
  snapshot.data[0].assignments.pop()

  assert.deepEqual(getClassDetailSnapshot('10A1', storage), teacherBefore)
  assert.equal(getStudentDashboardSnapshot(student, storage).data[0].assignments.length, 2)
})
