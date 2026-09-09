const teacherClasses = Object.freeze([
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

export function getDashboardSnapshot(state = 'success') {
  if (state === 'loading') {
    return { status: 'loading' }
  }

  if (state === 'empty') {
    return { status: 'success', data: [] }
  }

  if (state === 'error') {
    return {
      status: 'error',
      message: 'Không thể tải danh sách lớp lúc này.',
    }
  }

  return { status: 'success', data: teacherClasses }
}
