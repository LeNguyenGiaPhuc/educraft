import { apiClient } from './apiClient.js'
import { pathSegment } from './serviceUtils.js'

function getRelatedRecord(value) {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function getClassName(classroom) {
  return [classroom?.subject, classroom?.code].filter(Boolean).join(' ')
}

function mapClassroom(classroom) {
  const relatedClass = getRelatedRecord(classroom)
  if (!relatedClass) return null

  return {
    id: relatedClass.id,
    code: relatedClass.code,
    name: getClassName(relatedClass),
    subject: relatedClass.subject,
    semester: relatedClass.semester,
    schoolYear: relatedClass.school_year,
  }
}

export function mapStudentAssignment(assignment = {}) {
  const classroom = mapClassroom(assignment.classroom ?? assignment.class)

  return {
    id: assignment.id,
    classId: assignment.class_id,
    classCode: classroom?.code,
    title: assignment.title,
    dueAt: assignment.due_at,
    coverageThreshold: assignment.coverage_threshold,
    status: assignment.status,
    statusLabel: assignment.status === 'OPEN' ? 'Đang mở' : 'Đã đóng',
    statusTone: assignment.status === 'OPEN' ? 'active' : 'closed',
    classroom,
    className: classroom?.name ?? '',
  }
}

export function mapStudentDashboard(rows = []) {
  if (!Array.isArray(rows)) return []

  return rows.map((row) => {
    const classroom = mapClassroom(row)

    return {
      id: row.id,
      name: classroom?.name ?? row.code ?? '',
      code: row.code,
      subject: row.subject,
      semester: row.semester,
      schoolYear: row.school_year,
      status: row.status,
      studentNumber: row.student_number,
      assignments: Array.isArray(row.assignments)
        ? row.assignments.map((assignment) => mapStudentAssignment({
            ...assignment,
            classroom: row,
          }))
        : [],
    }
  })
}

export function createStudentService({ api = apiClient } = {}) {
  return {
    async getDashboard() {
      const rows = await api.get('/api/student/dashboard')
      return mapStudentDashboard(rows)
    },

    async getAssignment(assignmentId) {
      const assignment = await api.get(
        `/api/student/assignments/${pathSegment(assignmentId)}`,
      )
      return mapStudentAssignment(assignment)
    },
  }
}

export const studentService = createStudentService()
