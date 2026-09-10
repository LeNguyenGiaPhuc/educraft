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
        threshold: '80%',
        submission: '38/42 học sinh đã nộp',
        status: 'Đang mở',
        statusTone: 'active',
      },
      {
        id: 'nghi-luan',
        title: 'Bài ghi Văn bản nghị luận',
        dueDate: '12/09/2026, 23:59',
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
        threshold: '80%',
        submission: '24/41 học sinh đã nộp',
        status: 'Đang mở',
        statusTone: 'active',
      },
    ],
    students: [],
  },
})

export function getClassDetailSnapshot(classId) {
  const data = classDetails[classId]

  if (!data) {
    return {
      status: 'error',
      message: 'Không tìm thấy lớp học này.',
    }
  }

  return { status: 'success', data }
}

export function getClassTabView(classroom, tab = 'assignments') {
  if (tab === 'students') {
    return { kind: 'students', rows: classroom.students }
  }

  return { kind: 'assignments', rows: classroom.assignments }
}
