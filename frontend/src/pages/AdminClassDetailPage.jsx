import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import AdminModal from '../components/AdminModal.jsx'
import StudentImportPanel from '../components/StudentImportPanel.jsx'
import AdminClassForm from '../components/AdminClassForm.jsx'
import { getNextStudentNumber } from '../data/adminClassRoster.js'
import { adminClassService } from '../services/adminClassService.js'
import { adminAccountService } from '../services/adminAccountService.js'
import { ApiError } from '../services/apiClient.js'
import { ROLES } from '../services/authService.js'

function StudentAddModal({ students, onCancel, onAdd }) {
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState('')

  const matched = students.filter((student) => (
    (student.username ?? '').toLowerCase().includes(query.toLowerCase()) || (student.name ?? '').toLowerCase().includes(query.toLowerCase())
  ))

  return (
    <AdminModal className="large" labelledBy="student-modal-title" onClose={onCancel}>
        <div className="admin-modal-header">
          <div>
            <span className="panel-subtitle">Học sinh</span>
            <h2 id="student-modal-title">Thêm học sinh vào lớp</h2>
          </div>
          <button aria-label="Đóng cửa sổ" className="icon-button" data-modal-initial-focus title="Đóng" type="button" onClick={onCancel}>×</button>
        </div>

        <div className="admin-filter-row">
          <label className="search-box">
            <span>Tìm kiếm</span>
            <input value={query} placeholder="Tìm theo tên tài khoản hoặc họ tên..." onChange={(event) => setQuery(event.target.value)} />
          </label>
        </div>

        <div className="admin-student-picker">
          {matched.length === 0 ? <div className="empty-row">Không tìm thấy học sinh phù hợp.</div> : matched.map((student) => (
            <label className="student-picker-row" key={student.id}>
              <input name="student" type="radio" checked={selectedId === student.id} onChange={() => setSelectedId(student.id)} />
              <span><strong>{student.username}</strong><small>{student.name}</small></span>
            </label>
          ))}
        </div>

        <div className="admin-form-actions">
          <button className="button button-outline" type="button" onClick={onCancel}>Hủy</button>
          <button className="button button-primary" disabled={!selectedId} type="button" onClick={() => onAdd(selectedId)}>Thêm vào lớp</button>
        </div>
    </AdminModal>
  )
}

function normalizeClass(row = {}) {
  return {
    id: row.id,
    code: row.code,
    subject: row.subject,
    semester: row.semester,
    school_year: row.school_year,
    teacher_id: row.teacher_id ?? null,
    status: String(row.status ?? '').toLowerCase(),
    name: row.subject ?? row.code,
  }
}

function normalizeStudent(row = {}) {
  return {
    id: row.id,
    username: row.username ?? row.email ?? 'student',
    name: row.full_name ?? row.name ?? 'Học sinh',
    email: row.email ?? '—',
    status: String(row.status ?? '').toLowerCase(),
    importedStudentNumber: row.student_number ?? '—',
    student_number: row.student_number ?? '—',
  }
}

function normalizeTeacher(row = {}) {
  return {
    id: row.id,
    full_name: row.full_name ?? row.name ?? '',
    role: row.role,
    status: row.status,
  }
}

function normalizeAccount(row = {}) {
  return {
    id: row.id,
    username: row.username ?? row.email ?? '',
    name: row.full_name ?? row.name ?? row.email ?? '',
    role: row.role,
    status: row.status,
    classIds: Array.isArray(row.class_ids) ? row.class_ids : [],
  }
}

async function fetchClassDetailData(classId) {
  const [classRow, studentRows, teacherRows, studentAccounts] = await Promise.all([
    adminClassService.getClass(classId),
    adminClassService.listStudents(classId),
    adminAccountService.listAccounts({ role: ROLES.TEACHER, status: 'ACTIVE' }),
    adminAccountService.listAccounts({ role: ROLES.STUDENT, status: 'ACTIVE' }),
  ])

  const mappedClass = normalizeClass(classRow)
  const mappedStudents = (studentRows ?? []).map(normalizeStudent)
  const mappedTeachers = (teacherRows ?? []).map(normalizeTeacher)
  const mappedStudentAccounts = (studentAccounts ?? []).map(normalizeAccount)

  return {
    classroom: mappedClass,
    students: mappedStudents,
    teachers: mappedTeachers,
    availableStudents: mappedStudentAccounts.filter((student) => !mappedStudents.some((row) => row.id === student.id)),
  }
}

function AdminClassDetailPage() {
  const { classId } = useParams()
  const navigate = useNavigate()
  const [classroom, setClassroom] = useState(null)
  const [students, setStudents] = useState([])
  const [teachers, setTeachers] = useState([])
  const [availableStudents, setAvailableStudents] = useState([])
  const [query, setQuery] = useState('')
  const [showStudentModal, setShowStudentModal] = useState(false)
  const [showImportPanel, setShowImportPanel] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  async function loadData() {
    setLoading(true)
    setError(null)

    try {
      const [classRow, studentRows, teacherRows, studentAccounts] = await Promise.all([
        adminClassService.getClass(classId),
        adminClassService.listStudents(classId),
        adminAccountService.listAccounts({ role: ROLES.TEACHER, status: 'ACTIVE' }),
        adminAccountService.listAccounts({ role: ROLES.STUDENT, status: 'ACTIVE' }),
      ])

      const mappedClass = normalizeClass(classRow)
      const mappedStudents = (studentRows ?? []).map(normalizeStudent)
      const mappedTeachers = (teacherRows ?? []).map(normalizeTeacher)
      const mappedStudentsAccounts = (studentAccounts ?? []).map(normalizeAccount)

      setClassroom(mappedClass)
      setStudents(mappedStudents)
      setTeachers(mappedTeachers)
      setAvailableStudents(mappedStudentsAccounts.filter((student) => !mappedStudents.some((row) => row.id === student.id)))
    } catch (caughtError) {
      const message = caughtError instanceof ApiError ? caughtError.message : caughtError?.message ?? 'Không thể tải chi tiết lớp.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true

    fetchClassDetailData(classId)
      .then((data) => {
        if (!active) return
        setClassroom(data.classroom)
        setStudents(data.students)
        setTeachers(data.teachers)
        setAvailableStudents(data.availableStudents)
      })
      .catch((caughtError) => {
        if (!active) return
        const message = caughtError instanceof ApiError ? caughtError.message : caughtError?.message ?? 'Không thể tải chi tiết lớp.'
        setError(message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [classId])

  const searchQuery = query.trim().toLowerCase()
  const matchingStudents = students.filter((student) => {
    return !searchQuery || (student.username ?? '').toLowerCase().includes(searchQuery) || (student.name ?? '').toLowerCase().includes(searchQuery)
  })

  async function addStudent(studentId) {
    if (!studentId) {
      return
    }

    try {
      await adminClassService.addStudent(classId, {
        student_id: studentId,
        student_number: getNextStudentNumber(students),
      })

      setShowStudentModal(false)
      setNotice('Đã thêm học sinh vào lớp.')
      await loadData()
    } catch (caughtError) {
      const message = caughtError instanceof ApiError ? caughtError.message : caughtError?.message ?? 'Không thể thêm học sinh.'
      setNotice(message)
    }
  }

  function handleImported(result) {
    setShowImportPanel(false)
    const created = result.created ?? result.addedCount ?? 0
    const assigned = result.assigned ?? result.assignedCount ?? 0
    const skipped = result.skipped ?? result.skippedCount ?? 0
    setNotice(`Đã import: ${created} tài khoản mới, ${assigned} tài khoản có sẵn, bỏ qua ${skipped} học sinh.`)
    loadData()
  }

  async function handleRemoveStudent(student) {
    const confirmed = window.confirm(`Xóa ${student.name} khỏi lớp ${classroom.id}?`)

    if (!confirmed) {
      return
    }

    try {
      await adminClassService.removeStudent(classroom.id, { student_id: student.id })
      setNotice(`Đã xóa ${student.name} khỏi lớp.`)
      await loadData()
    } catch (caughtError) {
      const message = caughtError instanceof ApiError ? caughtError.message : caughtError?.message ?? 'Không thể xóa học sinh khỏi lớp.'
      setNotice(message)
    }
  }

  async function handleDeleteClass() {
    if (!classroom) {
      return
    }

    const assignmentCount = classroom.assignmentCount ?? 0
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn xóa lớp ${classroom.id} không?\n\n` +
      `Sẽ xóa ${students.length} học sinh khỏi lớp và ${assignmentCount} bài kiểm tra liên quan. ` +
      'Tài khoản học sinh vẫn được giữ lại.',
    )

    if (!confirmed) {
      return
    }

    try {
      await adminClassService.deleteClass(classroom.id)
      navigate('/admin/classes')
    } catch (caughtError) {
      const message = caughtError instanceof ApiError ? caughtError.message : caughtError?.message ?? 'Không thể xóa lớp học này.'
      setNotice(message)
    }
  }

  if (error) {
    return <section className="admin-state-panel" role="alert"><h1>Không thể mở lớp</h1><p>{error}</p></section>
  }

  if (loading && !classroom) {
    return <section className="admin-state-panel" aria-live="polite"><h1>Đang tải lớp...</h1></section>
  }

  if (!classroom) {
    return <section className="admin-state-panel"><h1>Không tìm thấy lớp</h1><Link className="button button-primary" to="/admin/classes">Quay lại</Link></section>
  }

  const teacher = teachers.find((row) => row.id === classroom.teacher_id) ?? null

  return (
    <section className="admin-page">
      {notice && <div className="admin notice-bar">{notice}</div>}
      <div className="admin-page-header">
        <div className="admin-page-title">
          <h1>{classroom.name}</h1>
          <p>{classroom.code} · {classroom.semester} · {classroom.school_year}</p>
        </div>
        <div className="admin-page-actions">
          <Link className="button button-outline" to="/admin/classes">← Quay lại</Link>
          <button className="button button-outline" type="button" onClick={() => setShowEditForm(true)}>Chỉnh sửa</button>
          <button className="button button-danger" type="button" onClick={handleDeleteClass}>Xóa lớp</button>
          <button className="button button-outline" type="button" onClick={() => setShowImportPanel(true)}>Import Excel</button>
          <button className="button button-primary" type="button" onClick={() => setShowStudentModal(true)}>+ Thêm học sinh</button>
        </div>
      </div>

      <section className="admin-class-detail-card">
        <div className="admin-detail-grid">
          <div>
            <h2>Thông tin lớp</h2>
            <dl className="admin-class-facts">
              <div><dt>Mã lớp</dt><dd>{classroom.code ?? classroom.id}</dd></div>
              <div><dt>Giáo viên phụ trách</dt><dd>{teacher?.full_name ?? 'Chưa phân công'}</dd></div>
              <div><dt>Học kỳ</dt><dd>{classroom.semester}</dd></div>
              <div><dt>Năm học</dt><dd>{classroom.school_year}</dd></div>
              <div><dt>Số học sinh</dt><dd>{students.length}</dd></div>
            </dl>
          </div>
        </div>
      </section>

      <section className="admin-panel">
        <div className="admin-panel-heading">
          <div>
            <h2>Danh sách học sinh <span className="admin-count-badge">{students.length}</span></h2>
            <p className="admin-section-note">Thêm từng học sinh hoặc nhập danh sách đã kiểm tra từ file Excel.</p>
          </div>
          <label className="search-box compact">
            <span>Tìm kiếm</span>
            <input value={query} placeholder="Tìm kiếm theo tên tài khoản hoặc tên học sinh..." onChange={(event) => setQuery(event.target.value)} />
          </label>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>STT</th>
                <th>Tên tài khoản</th>
                <th>Họ tên</th>
                <th>Email</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {matchingStudents.length === 0 ? (
                <tr><td colSpan="6" className="empty-row">Lớp này chưa có học sinh.</td></tr>
              ) : matchingStudents.map((student) => (
                <tr key={student.id}>
                  <td data-label="STT">{student.importedStudentNumber ?? '—'}</td>
                  <td data-label="Tên tài khoản"><strong>{student.username}</strong></td>
                  <td data-label="Họ tên">{student.name}</td>
                  <td data-label="Email">{student.email ?? '—'}</td>
                  <td data-label="Trạng thái"><span className={`status-badge status-${student.status ?? 'active'}`}>
                    {student.status === 'pending' ? 'Chờ kích hoạt' : student.status === 'locked' ? 'Khóa' : 'Hoạt động'}
                  </span></td>
                  <td data-label="Thao tác">
                    <button className="button button-ghost" type="button" onClick={() => handleRemoveStudent(student)}>Xóa</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {showImportPanel && (
        <AdminModal
          className="large"
          labelledBy="student-import-title"
          onClose={() => setShowImportPanel(false)}
        >
          <StudentImportPanel
            classId={classId}
            onCancel={() => setShowImportPanel(false)}
            onImported={handleImported}
          />
        </AdminModal>
      )}

      {showStudentModal && (
        <StudentAddModal students={availableStudents} onCancel={() => setShowStudentModal(false)} onAdd={addStudent} />
      )}

      {showEditForm && (
        <AdminClassForm
          initialClass={classroom}
          teachers={teachers}
          onCancel={() => setShowEditForm(false)}
          onSaved={(savedClass) => {
            setShowEditForm(false)
            setNotice(`Đã cập nhật lớp ${savedClass.id}.`)
            loadData()
          }}
        />
      )}
    </section>
  )
}

export default AdminClassDetailPage
