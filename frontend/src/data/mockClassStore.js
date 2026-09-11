import { deleteStoredAssignmentsForClass } from './mockAssignmentStore.js'
import { deleteStoredReferences } from './mockReferenceStore.js'
import { deleteStoredSubmissions } from './mockSubmissionStore.js'
import { deleteStoredStudentsForClass } from './mockStudentStore.js'

const CLASSES_STORAGE_KEY = 'educraft.classes'

const defaultTeacherClasses = Object.freeze([
  {
    id: '10A1',
    subject: 'Ngữ văn',
    name: 'Ngữ văn 10A1',
    semester: 'Học kỳ 1',
    schoolYear: 'Năm học 2026–2027',
    studentCount: 42,
    assignmentCount: 3,
    accent: 'green',
  },
  {
    id: '10A2',
    subject: 'Lịch sử',
    name: 'Lịch sử 10A2',
    semester: 'Học kỳ 1',
    schoolYear: 'Năm học 2026–2027',
    studentCount: 39,
    assignmentCount: 2,
    accent: 'navy',
  },
  {
    id: '11A1',
    subject: 'Sinh học',
    name: 'Sinh học 11A1',
    semester: 'Học kỳ 1',
    schoolYear: 'Năm học 2026–2027',
    studentCount: 41,
    assignmentCount: 1,
    accent: 'green',
  },
])

function getBrowserStorage() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return window.localStorage
  } catch {
    return null
  }
}

function cloneClasses(classes) {
  return classes.map((classroom) => ({ ...classroom }))
}

function readClasses(storage = getBrowserStorage()) {
  if (!storage) {
    return cloneClasses(defaultTeacherClasses)
  }

  try {
    const value = storage.getItem(CLASSES_STORAGE_KEY)

    if (value === null) {
      return cloneClasses(defaultTeacherClasses)
    }

    const classes = JSON.parse(value)
    return Array.isArray(classes) ? classes : cloneClasses(defaultTeacherClasses)
  } catch {
    return cloneClasses(defaultTeacherClasses)
  }
}

function writeClasses(classes, storage = getBrowserStorage()) {
  if (!storage) {
    return
  }

  storage.setItem(CLASSES_STORAGE_KEY, JSON.stringify(classes))
}

function normalizeClassForm(form = {}) {
  return {
    id: String(form.id ?? '').trim().toUpperCase(),
    subject: String(form.subject ?? '').trim(),
    semester: String(form.semester ?? '').trim(),
    schoolYear: String(form.schoolYear ?? '').trim(),
  }
}

function validateClassForm(form, { includeId = true } = {}) {
  const errors = {}

  if (includeId && !form.id) {
    errors.id = 'Vui lòng nhập mã lớp.'
  } else if (includeId && !/^[A-Z0-9_-]{2,12}$/.test(form.id)) {
    errors.id = 'Mã lớp gồm 2–12 ký tự chữ, số, gạch ngang hoặc gạch dưới.'
  }

  if (!form.subject) {
    errors.subject = 'Vui lòng nhập môn học.'
  } else if (form.subject.length > 80) {
    errors.subject = 'Tên môn học không được vượt quá 80 ký tự.'
  }

  if (!form.semester) {
    errors.semester = 'Vui lòng nhập học kỳ.'
  }

  if (!form.schoolYear) {
    errors.schoolYear = 'Vui lòng nhập năm học.'
  }

  return errors
}

export function getTeacherClasses(storage = getBrowserStorage()) {
  return cloneClasses(readClasses(storage))
}

export function getTeacherClass(classId, storage = getBrowserStorage()) {
  const normalizedId = String(classId ?? '').trim().toUpperCase()
  return getTeacherClasses(storage).find((classroom) => classroom.id === normalizedId) ?? null
}

export function createStoredClass(form, storage = getBrowserStorage()) {
  const normalizedForm = normalizeClassForm(form)
  const errors = validateClassForm(normalizedForm)
  const classes = readClasses(storage)

  if (classes.some((classroom) => classroom.id === normalizedForm.id)) {
    errors.id = 'Mã lớp này đã tồn tại.'
  }

  if (Object.keys(errors).length > 0) {
    return { status: 'error', errors }
  }

  const classroom = {
    id: normalizedForm.id,
    subject: normalizedForm.subject,
    name: `${normalizedForm.subject} ${normalizedForm.id}`,
    semester: normalizedForm.semester,
    schoolYear: normalizedForm.schoolYear,
    studentCount: 0,
    assignmentCount: 0,
    accent: 'green',
  }

  writeClasses([...classes, classroom], storage)
  return { status: 'success', data: { ...classroom } }
}

export function updateStoredClass(classId, form, storage = getBrowserStorage()) {
  const normalizedId = String(classId ?? '').trim().toUpperCase()
  const normalizedForm = normalizeClassForm({ ...form, id: normalizedId })
  const errors = validateClassForm(normalizedForm, { includeId: false })
  const classes = readClasses(storage)
  const index = classes.findIndex((classroom) => classroom.id === normalizedId)

  if (index === -1) {
    return {
      status: 'error',
      errors: { form: 'Không tìm thấy lớp học để cập nhật.' },
    }
  }

  if (Object.keys(errors).length > 0) {
    return { status: 'error', errors }
  }

  const classroom = {
    ...classes[index],
    subject: normalizedForm.subject,
    name: `${normalizedForm.subject} ${normalizedId}`,
    semester: normalizedForm.semester,
    schoolYear: normalizedForm.schoolYear,
  }
  const updatedClasses = [...classes]
  updatedClasses[index] = classroom

  writeClasses(updatedClasses, storage)
  return { status: 'success', data: { ...classroom } }
}

export function deleteStoredClass(classId, storage = getBrowserStorage()) {
  const normalizedId = String(classId ?? '').trim().toUpperCase()
  const classes = readClasses(storage)
  const classroom = classes.find((item) => item.id === normalizedId)

  if (!classroom) {
    return {
      status: 'error',
      errors: { form: 'Không tìm thấy lớp học để xóa.' },
    }
  }

  const removedAssignments = deleteStoredAssignmentsForClass(normalizedId, storage)
  const removedAssignmentIds = removedAssignments.map((assignment) => assignment.id)
  deleteStoredReferences(removedAssignmentIds, storage)
  deleteStoredSubmissions(removedAssignmentIds, storage)
  deleteStoredStudentsForClass(normalizedId, storage)

  writeClasses(
    classes.filter((item) => item.id !== normalizedId),
    storage,
  )
  return { status: 'success', data: { ...classroom } }
}
