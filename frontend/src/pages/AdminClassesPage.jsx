import { useState } from 'react'
import { Link } from 'react-router-dom'

import AdminClassForm from '../components/AdminClassForm.jsx'
import {
  ADMIN_STATE,
  filterAdminClasses,
  getAdminWorkspace,
  getTeachers,
} from '../data/mockAdminStore.js'

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

  const filteredClasses = filterAdminClasses(classes, { query, teacher })

  function onCreate(savedClass) {
    setShowClassForm(false)
    setNotice(`Đã tạo lớp ${savedClass.id}.`)
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
              <span className="class-status"><span aria-hidden="true" />Đang hoạt động</span>
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
        <AdminClassForm teachers={teachers} onCancel={() => setShowClassForm(false)} onSaved={onCreate} />
      )}
    </section>
  )
}

export default AdminClassesPage
