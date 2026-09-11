import { createStoredAssignment } from './mockAssignmentStore.js'
import { getTeacherClasses } from './mockClassStore.js'
import { getClassStudentCount } from './mockStudentStore.js'

const defaultDueAt = '2026-09-18T23:59'

export function getAssignmentClassOptions(storage) {
  return getTeacherClasses(storage).map((classroom) => {
    const studentCount = getClassStudentCount(classroom.id, classroom.studentCount, storage)

    return {
      id: classroom.id,
      label: `${classroom.name} (${studentCount} học sinh)`,
    }
  })
}

export function getDefaultAssignmentForm(classId, storage) {
  const options = getAssignmentClassOptions(storage)
  const selectedClass = options.some((option) => option.id === classId)
  const defaultClassId = selectedClass ? classId : (options[0]?.id ?? '')

  return {
    title: '',
    classId: defaultClassId,
    dueAt: defaultDueAt,
    threshold: '80',
  }
}

export function validateAssignmentForm(form = {}, storage) {
  const errors = {}
  const title = String(form.title ?? '').trim()
  const classId = String(form.classId ?? '').trim()
  const dueAt = String(form.dueAt ?? '').trim()
  const threshold = String(form.threshold ?? '').trim()

  if (!title) {
    errors.title = 'Nhập tên bài kiểm tra.'
  } else if (title.length > 120) {
    errors.title = 'Tên bài kiểm tra không vượt quá 120 ký tự.'
  }

  if (!getAssignmentClassOptions(storage).some((option) => option.id === classId)) {
    errors.classId = 'Chọn lớp học.'
  }

  if (!dueAt) {
    errors.dueAt = 'Chọn hạn nộp.'
  } else if (Number.isNaN(new Date(dueAt).getTime())) {
    errors.dueAt = 'Hạn nộp không hợp lệ.'
  }

  if (!threshold) {
    errors.threshold = 'Nhập ngưỡng đạt.'
  } else if (!Number.isFinite(Number(threshold)) || Number(threshold) < 0 || Number(threshold) > 100) {
    errors.threshold = 'Ngưỡng đạt phải từ 0 đến 100%.'
  }

  return errors
}

export function submitAssignmentDraft(form, outcome = 'success', delay = 0, storage) {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (outcome === 'error') {
        resolve({
          status: 'error',
          message: 'Không thể tạo bài kiểm tra lúc này. Vui lòng thử lại.',
        })
        return
      }

      createStoredAssignment(form, storage)

      resolve({
        status: 'success',
        data: {
          ...form,
          title: String(form.title ?? '').trim(),
          threshold: Number(form.threshold),
        },
      })
    }, delay)
  })
}
