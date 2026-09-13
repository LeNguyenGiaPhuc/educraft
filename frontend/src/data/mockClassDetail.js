import { getStoredAssignments } from './mockAssignmentStore.js'
import { getTeacherClass, getTeacherClasses } from './mockClassStore.js'
import { getStoredReference } from './mockReferenceStore.js'
import { getStoredSubmissions } from './mockSubmissionStore.js'
import { getClassStudentCount, getClassStudents } from './mockStudentStore.js'

const classDetails = Object.freeze({
  '10A1': {
    id: '10A1',
    subject: 'Ngữ văn',
    name: 'Ngữ văn 10A1',
    semester: 'Học kỳ 1',
    schoolYear: 'Năm học 2026–2027',
    studentCount: 42,
    assignments: [
      {
        id: 'nam-xuong',
        title: 'Bài ghi Chuyện người con gái Nam Xương',
        dueDate: '18/09/2026, 23:59',
        dueAt: '2026-09-18T23:59:00+07:00',
        threshold: '80%',
        submission: '38/42 học sinh đã nộp',
        status: 'Đang mở',
        statusTone: 'active',
      },
      {
        id: 'nghi-luan',
        title: 'Bài ghi Văn bản nghị luận',
        dueDate: '12/09/2026, 23:59',
        dueAt: '2026-09-12T23:59:00+07:00',
        threshold: '75%',
        submission: '42/42 học sinh đã nộp',
        status: 'Đã đóng',
        statusTone: 'closed',
      },
    ],
    students: [
      {
        number: '01',
        name: 'Nguyễn An Bình',
        code: 'HS260101',
        latestSubmission: '18/09/2026',
      },
      {
        number: '02',
        name: 'Trần Hoàng Bảo',
        code: 'HS260102',
        latestSubmission: '17/09/2026',
      },
      {
        number: '03',
        name: 'Lê Cẩm Chi',
        code: 'HS260103',
        latestSubmission: 'Chưa nộp',
        statusTone: 'warning',
      },
    ],
  },
  '10A2': {
    id: '10A2',
    subject: 'Lịch sử',
    name: 'Lịch sử 10A2',
    semester: 'Học kỳ 1',
    schoolYear: 'Năm học 2026–2027',
    studentCount: 39,
    assignments: [
      {
        id: 'lich-su-1',
        title: 'Bài ghi Các nền văn minh cổ đại',
        dueDate: '22/09/2026, 23:59',
        dueAt: '2026-09-22T23:59:00+07:00',
        threshold: '75%',
        submission: '31/39 học sinh đã nộp',
        status: 'Đang mở',
        statusTone: 'active',
      },
    ],
    students: [],
  },
  '11A1': {
    id: '11A1',
    subject: 'Sinh học',
    name: 'Sinh học 11A1',
    semester: 'Học kỳ 1',
    schoolYear: 'Năm học 2026–2027',
    studentCount: 41,
    assignments: [
      {
        id: 'sinh-hoc-1',
        title: 'Bài ghi Trao đổi chất ở thực vật',
        dueDate: '26/09/2026, 23:59',
        dueAt: '2026-09-26T23:59:00+07:00',
        threshold: '80%',
        submission: '24/41 học sinh đã nộp',
        status: 'Đang mở',
        statusTone: 'active',
      },
    ],
    students: [],
  },
})

const mockAssignmentSubmissions = Object.freeze({
  'nam-xuong': Object.freeze([
    Object.freeze({
      id: 'mock-submission-nam-xuong-001',
      assignmentId: 'nam-xuong',
      studentId: 'HS260101',
      fileName: 'bai-ghi-nam-xuong-hs260101.png',
      fileSizeBytes: 2400000,
      submittedAt: '2026-09-17T15:30:00+07:00',
      status: 'submitted',
    }),
    Object.freeze({
      id: 'mock-submission-nam-xuong-002',
      assignmentId: 'nam-xuong',
      studentId: 'HS260102',
      fileName: 'bai-ghi-nam-xuong-hs260102.jpg',
      fileSizeBytes: 2100000,
      submittedAt: '2026-09-17T14:10:00+07:00',
      status: 'approved',
      finalStatus: 'needs_completion',
      feedback: 'Bài ghi đầy đủ, cần bổ sung phần kết luận.',
    }),
  ]),
})

export function getMockAssignmentSubmissions(assignmentId) {
  return (mockAssignmentSubmissions[assignmentId] ?? []).map((submission) => ({
    ...submission,
  }))
}

export function getClassDetailSnapshot(classId, storage) {
  const classroom = getTeacherClass(classId, storage)

  if (!classroom) {
    return {
      status: 'error',
      message: 'Không tìm thấy lớp học này.',
    }
  }

  const fallbackStudents = [...(classDetails[classroom.id]?.students ?? [])]

  return {
    status: 'success',
    data: {
      ...classroom,
      studentCount: getClassStudentCount(classroom.id, classroom.studentCount, storage),
      assignments: [
        ...(classDetails[classroom.id]?.assignments ?? []),
        ...getStoredAssignments(classroom.id, storage),
      ],
      students: getClassStudents(classroom.id, fallbackStudents, storage),
    },
  }
}

export function getClassTabView(classroom, tab = 'assignments') {
  if (tab === 'students') {
    return { kind: 'students', rows: classroom.students }
  }

  return { kind: 'assignments', rows: classroom.assignments }
}

export function getAssignmentSnapshot(assignmentId, storage) {
  for (const classroom of getTeacherClasses(storage)) {
    const classId = classroom.id
    const assignments = [
      ...(classDetails[classId]?.assignments ?? []),
      ...getStoredAssignments(classId, storage),
    ]
    const assignment = assignments.find((item) => item.id === assignmentId)

    if (assignment) {
      return {
        status: 'success',
        data: {
          ...assignment,
          classroom: {
            id: classroom.id,
            subject: classroom.subject,
            name: classroom.name,
            semester: classroom.semester,
            schoolYear: classroom.schoolYear,
            studentCount: getClassStudentCount(classroom.id, classroom.studentCount, storage),
          },
        },
      }
    }
  }

  return {
    status: 'error',
    message: 'Không tìm thấy bài kiểm tra này.',
  }
}

export function getAssignmentDetailSnapshot(assignmentId, storage) {
  const assignmentSnapshot = getAssignmentSnapshot(assignmentId, storage)

  if (assignmentSnapshot.status === 'error') {
    return assignmentSnapshot
  }

  const storedSubmissions = getStoredSubmissions(assignmentId, storage)
  const storedSubmissionIds = new Set(storedSubmissions.map((submission) => submission.id))

  return {
    status: 'success',
    data: {
      ...assignmentSnapshot.data,
      reference: getStoredReference(assignmentId, storage),
      submissions: [
        ...getMockAssignmentSubmissions(assignmentId).filter(
          (submission) => !storedSubmissionIds.has(submission.id),
        ),
        ...storedSubmissions,
      ],
    },
  }
}
