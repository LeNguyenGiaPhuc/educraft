import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import AdminClassForm from '../components/AdminClassForm.jsx'
import { adminClassService } from '../services/adminClassService.js'
import { adminAccountService } from '../services/adminAccountService.js'
import { ApiError } from '../services/apiClient.js'
import { ROLES } from '../services/authService.js'

function normalizeClass(row) {
  return {
    id: row.id,
    code: row.code,
    subject: row.subject,
    semester: row.semester,
    school_year: row.school_year,
    teacher_id: row.teacher_id,
    status: row.status,
  }
}

function normalizeTeacher(row) {
  return {
    id: row.id,
    full_name: row.full_name ?? row.name ?? '',
    role: row.role,
    status: row.status,
  }
}

async function fetchClassesPageData() {
  const [classRows, teacherRows] = await Promise.all([
    adminClassService.listClasses(),
    adminAccountService.listAccounts({ role: ROLES.TEACHER, status: 'ACTIVE' }),
  ])

  return { classRows, teacherRows }
}

function AdminClassesPage() {
  const [showClassForm, setShowClassForm] = useState(false)
  const [notice, setNotice] = useState('')
  const [query, setQuery] = useState('')
  const [teacher, setTeacher] = useState('all')
  const [classes, setClasses] = useState([])
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function loadData() {
    setLoading(true)
    setError(null)

    try {
      const [classRows, teacherRows] = await Promise.all([
        adminClassService.listClasses(),
        adminAccountService.listAccounts({ role: ROLES.TEACHER, status: 'ACTIVE' }),
      ])

      const mappedClasses = classRows.map(normalizeClass)
      const mappedTeachers = teacherRows.map(normalizeTeacher)

      setClasses(mappedClasses)
      setTeachers(mappedTeachers)
    } catch (caughtError) {
      const message = caughtError instanceof ApiError ? caughtError.message : caughtError?.message ?? 'Không thể tải danh sách lớp.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true

    fetchClassesPageData()
      .then(({ classRows, teacherRows }) => {
        if (!active) return
        setClasses(classRows.map(normalizeClass))
        setTeachers(teacherRows.map(normalizeTeacher))
      })
      .catch((caughtError) => {
        if (!active) return
        const message = caughtError instanceof ApiError ? caughtError.message : caughtError?.message ?? 'Không thể tải danh sách lớp.'
        setError(message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const filteredClasses = classes.filter((classroom) => {
    const normalizedQuery = query.trim().toLowerCase()
    const matchesQuery = !normalizedQuery || classroom.code?.toLowerCase().includes(normalizedQuery) || classroom.subject?.toLowerCase().includes(normalizedQuery)
    const matchesTeacher = teacher === 'all' || classroom.teacher_id === teacher

    return matchesQuery && matchesTeacher
  })

  function onCreate(savedClass) {
    setShowClassForm(false)
    setNotice(`Đã tạo lớp ${savedClass.code ?? savedClass.id}.`)
    loadData()
  }

  if (error) {
    return <section className="admin-state-panel" role="alert"><h1>Không thể tải danh sách lớp</h1><p>{error}</p></section>
  }

  return (
    <section className="admin-page">
      <div className="admin-page-header">
        <div className="admin-page-title">
          <h1>Quản lý lớp học</h1>
          <p>Tìm lớp, xem giáo viên phụ trách và cập nhật danh sách học sinh.</p>
        </div>
        <button className="button button-primary" type="button" onClick={() => setShowClassForm(true)}>+ Tạo lớp</button>
      </div>

      {notice && <div className="admin notice-bar">{notice}</div>}

      <section className="admin-filter-card">
        <div className="admin-filter-row">
          <label className="search-box">
            <span>Tìm kiếm</span>
            <input
              value={query}
              placeholder="Tìm theo mã lớp, tên lớp hoặc giáo viên"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>

          <label className="search-box">
            <span>Giáo viên phụ trách</span>
            <select value={teacher} onChange={(event) => setTeacher(event.target.value)}>
              <option value="all">Tất cả</option>
              {teachers.map((person) => (
                <option key={person.id} value={person.id}>{person.full_name}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {loading ? (
        <section className="admin-state-panel" aria-live="polite"><h2>Đang tải danh sách lớp...</h2></section>
      ) : (
        <section className="admin-class-list">
          {filteredClasses.length === 0 ? (
            <div className="admin-empty-panel"><h2>Không tìm thấy lớp phù hợp.</h2><p>Thử đổi nội dung tìm kiếm hoặc bộ lọc giáo viên.</p></div>
          ) : filteredClasses.map((classroom) => {
            const teacherName = teachers.find((person) => person.id === classroom.teacher_id)?.full_name ?? 'Chưa phân công'
            const classCode = classroom.code ?? classroom.id

            return (
              <Link className="admin-class-card" key={classroom.id} to={`/admin/classes/${classroom.id}`}>
                <div className="admin-class-card-top">
                  <span className="class-code">{classCode}</span>
                  <span className={`class-status ${classroom.status === 'ACTIVE' ? 'class-status-active' : 'class-status-inactive'}`}><span aria-hidden="true" />{classroom.status === 'ACTIVE' ? 'Đang hoạt động' : classroom.status}</span>
                </div>
                <div className="admin-class-card-body">
                  <h3>{classroom.subject}</h3>
                  <p>Giáo viên: {teacherName}</p>
                  <p>{classroom.semester} · {classroom.school_year}</p>
                </div>
              </Link>
            )
          })}
        </section>
      )}

      {showClassForm && (
        <AdminClassForm teachers={teachers} onCancel={() => setShowClassForm(false)} onSaved={onCreate} />
      )}
    </section>
  )
}

export default AdminClassesPage
