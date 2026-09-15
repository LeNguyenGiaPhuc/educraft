import { apiClient } from './apiClient.js'
import { pathSegment } from './serviceUtils.js'

function mapTeacherStudent(student = {}) {
  return {
    id: student.id,
    code: student.student_code ?? '',
    name: student.full_name ?? student.username ?? student.email ?? 'Chưa có tên',
    number: student.student_number ?? null,
    status: student.status ?? null,
    latestSubmission: 'Chưa có dữ liệu',
  }
}

function mapTeacherClass(classroom = {}) {
  return {
    id: classroom.id,
    code: classroom.code ?? '',
    name: [classroom.subject, classroom.code].filter(Boolean).join(' '),
    subject: classroom.subject ?? '',
    semester: classroom.semester ?? '',
    schoolYear: classroom.school_year ?? '',
    status: classroom.status ?? 'ACTIVE',
    studentCount: Number(classroom.student_count ?? 0),
    assignmentCount: Number(classroom.assignment_count ?? 0),
    ...(Array.isArray(classroom.students)
      ? { students: classroom.students.map(mapTeacherStudent) }
      : {}),
  }
}

export function createTeacherClassService({ api = apiClient } = {}) {
  return {
    async listClasses() {
      const classrooms = await api.get('/api/teacher/classes')
      return (classrooms ?? []).map(mapTeacherClass)
    },

    async getClass(classId) {
      const classroom = await api.get(`/api/teacher/classes/${pathSegment(classId)}`)
      return mapTeacherClass(classroom)
    },
  }
}

export { mapTeacherClass, mapTeacherStudent }

export const teacherClassService = createTeacherClassService()
