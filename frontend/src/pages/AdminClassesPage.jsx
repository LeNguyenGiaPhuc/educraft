import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import {
  ADMIN_STATE,
  createAdminClass,
  filterAdminClasses,
  getAdminWorkspace,
  getTeachers,
} from '../data/mockAdminStore.js'

function ClassCreateModal({ teachers, onCancel, onSaved }) {
  const [form, setForm] = useState({
    id: '',
    name: '',
    teacherId: teachers[0]?.id ?? '',
    semester: 'Học kỳ 1',
    schoolYear: 'Năm học 2026–2027',
    studentIds: [],
  })

  function handleSubmit(event) {
    event.preventDefault()

    const result = createAdminClass({
      id: form.id,
      name: form.name,
      teacherId: form.teacherId,
      semester: form.semester,
      schoolYear: form.schoolYear,
      studentIds: form.studentIds,
    })

    if (result.status === 'error') {
      return
    }

    onSaved(result.data)
  }

  return (
    <div className="admin-modal-backdrop">
      <div className="admin-modal">
        <div className="admin-modal-header">
          <div>
            <span className="panel-subtitle">Lớp học</span>
            <h2>Tạo lớp</h2>
          </div>
          <button className="icon-button" type="button" onClick={onCancel}>×</button>
        </div>

        <form className="admin-form" onSubmit={handleSubmit} noValidate>
          <div className="form-grid">
            <label className="field-label">
              <span>Tên lớp</span>
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </label>

            <label className="field-label">
              <span>Mã lớp</span>
              <input value={form.id} onChange={(event) => setForm({ ...form, id: event.target.value.toUpperCase() })} />
            </label>

            <label className="field-label">
              <span>Giáo viên phụ trách</span>
              <select value={form.teacherId} onChange={(event) => setForm({ ...form, teacherId: event.target.value })}>
                {teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}
              </select>
            </label>
          </div>

          <div className="admin-form-actions">
            <button className="button button-outline" type="button" onClick={onCancel}>Hủy</button>
            <button className="button button-primary" type="submit">Tạo lớp</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AdminClassesPage() {
  const snapshot = getAdminWorkspace(ADMIN_STATE.SUCCESS)
  const [showClassForm, setShowClassForm] = useState(false)
  const [notice, setNotice] = useState('')
  const [query, setQuery] = useState('')
  const [teacher, setTeacher] = useState('all')

  if (snapshot.status === 'error') {
    return <section className="admin-empty-panel"><p className="state-kicker">Lớp học</p><h1>Không thể tải danh sách lớp</h1><p>{snapshot.message}</p></section>
  }

  const classes = snapshot.data?.classes ?? []
  const teachers = getTeachers(snapshot.data?.users ?? [])

  const filteredClasses = useMemo(() => {
    return filterAdminClasses(classes, { query, teacher })
  }, [classes, query, teacher])

  function onCreate(savedClass) {
    setShowClassForm(false)
    setNotice(`Đã tạo lớp ${savedClass.id}.`)
    window.location.reload()
  }

  return (
    <section className="admin-page">
      <div className="admin-page-header">
        <div>
          <p className="state-kicker">Quản lý hệ thống</p>
          <h1>Quản lý lớp học</h1>
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
                <option key={person.id} value={person.id}>{person.name}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="admin-class-list">
        {filteredClasses.length === 0 ? (
          <div className="admin-empty-panel"><p className="state-kicker">Chưa có lớp</p><h2>Không tìm thấy lớp phù hợp.</h2></div>
        ) : filteredClasses.map((classroom) => (
          <Link className="admin-class-card" key={classroom.id} to={`/admin/classes/${classroom.id}`}>
            <div className="admin-class-card-top">
              <span className="class-code">{classroom.id}</span>
              <span className="class-status"><span aria-hidden="true" />Active</span>
            </div>
            <div className="admin-class-card-body">
              <h3>{classroom.name}</h3>
              <p>Giáo viên: {classroom.teacher?.name ?? 'Chưa phân công'}</p>
              <p>{classroom.students?.length ?? 0} học sinh</p>
            </div>
          </Link>
        ))}
      </section>

      {showClassForm && (
        <ClassCreateModal teachers={teachers} onCancel={() => setShowClassForm(false)} onSaved={onCreate} />
      )}
    </section>
  )
}

export default AdminClassesPage
