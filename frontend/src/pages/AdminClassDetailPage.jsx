import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { ADMIN_STATE, addStudentsToAdminClass, deleteAdminClass, getAdminWorkspace } from '../data/mockAdminStore.js'
import { ROLES } from '../data/mockAuthStore.js'

function StudentAddModal({ classId, students, onCancel, onAdd }) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState([])

  const matched = students.filter((student) => (
    student.username.toLowerCase().includes(query.toLowerCase()) || student.name.toLowerCase().includes(query.toLowerCase())
  ))

  function toggle(studentId) {
    setSelected((current) => current.includes(studentId)
      ? current.filter((id) => id !== studentId)
      : [...current, studentId])
  }

  return (
    <div className="admin-modal-backdrop">
      <div className="admin-modal large">
        <div className="admin-modal-header">
          <div>
            <span className="panel-subtitle">Học sinh</span>
            <h2>Thêm học sinh vào lớp</h2>
          </div>
          <button className="icon-button" type="button" onClick={onCancel}>×</button>
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
              <input type="checkbox" checked={selected.includes(student.id)} onChange={() => toggle(student.id)} />
              <span><strong>{student.username}</strong><small>{student.name}</small></span>
            </label>
          ))}
        </div>

        <div className="admin-form-actions">
          <button className="button button-outline" type="button" onClick={onCancel}>Hủy</button>
          <button className="button button-primary" type="button" onClick={() => onAdd(selected)}>Thêm vào lớp</button>
        </div>
      </div>
    </div>
  )
}

function AdminClassDetailPage() {
  const { classId } = useParams()
  const navigate = useNavigate()
  const snapshot = getAdminWorkspace(ADMIN_STATE.SUCCESS)
  const [query, setQuery] = useState('')
  const [showStudentModal, setShowStudentModal] = useState(false)

  if (snapshot.status === 'error') {
    return <section className="admin-empty-panel"><p className="state-kicker">Chi tiết lớp</p><h1>Không thể mở lớp</h1><p>{snapshot.message}</p></section>
  }

  const classroom = snapshot.data?.classes?.find((item) => item.id === classId.toUpperCase())
  const allUsers = snapshot.data?.users ?? []
  const teacher = classroom?.teacher ?? null
  const students = classroom?.students ?? []

  const searchQuery = query.trim().toLowerCase()
  const matchingStudents = students.filter((student) => {
    return !searchQuery || student.username.toLowerCase().includes(searchQuery) || student.name.toLowerCase().includes(searchQuery)
  })

  const availableStudents = allUsers.filter((user) => {
    return user.role === ROLES.STUDENT && !user.classIds?.includes(classId.toUpperCase())
  })

  function addStudents(ids) {
    if (!ids.length) {
      return
    }

    addStudentsToAdminClass(classId.toUpperCase(), ids)
    setShowStudentModal(false)
    window.location.reload()
  }

  function handleDeleteClass() {
    if (!classroom) {
      return
    }

    const confirmed = window.confirm(`Bạn có chắc chắn muốn xóa lớp ${classroom.id} không?`)

    if (!confirmed) {
      return
    }

    const result = deleteAdminClass(classroom.id)

    if (result.status === 'success') {
      navigate('/admin/classes')
      return
    }

    window.alert(result.errors?.form ?? 'Không thể xóa lớp học này.')
  }

  if (!classroom) {
    return <section className="admin-empty-panel"><p className="state-kicker">Chi tiết lớp</p><h1>Không tìm thấy lớp</h1><Link className="button button-primary" to="/admin/classes">Quay lại</Link></section>
  }

  return (
    <section className="admin-page">
      <div className="admin-page-header">
        <div>
          <p className="state-kicker">Chi tiết lớp</p>
          <h1>{classroom.name}</h1>
        </div>
        <div className="admin-page-actions">
          <Link className="button button-outline" to="/admin/classes">← Quay lại</Link>
          <button className="button button-danger" type="button" onClick={handleDeleteClass}>Xóa lớp</button>
          <button className="button button-primary" type="button" onClick={() => setShowStudentModal(true)}>+ Thêm học sinh</button>
        </div>
      </div>

      <section className="admin-class-detail-card">
        <div className="admin-detail-grid">
          <div>
            <span className="panel-subtitle">Thông tin lớp</span>
            <div className="class-detail-title">{classroom.name}</div>
            <p><strong>Mã lớp:</strong> {classroom.id}</p>
            <p><strong>Giáo viên:</strong> {teacher?.name ?? 'Chưa phân công'}</p>
            <p><strong>Số lượng học sinh:</strong> {students.length}</p>
          </div>
        </div>
      </section>

      <section className="admin-panel">
        <div className="admin-panel-heading">
          <div>
            <span className="panel-subtitle">Danh sách học sinh</span>
            <h2>{classroom.name}</h2>
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
                <th>Tên tài khoản</th>
                <th>Họ tên</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {matchingStudents.length === 0 ? (
                <tr><td colSpan="4" className="empty-row">Lớp này chưa có học sinh.</td></tr>
              ) : matchingStudents.map((student) => (
                <tr key={student.id}>
                  <td><strong>{student.username}</strong></td>
                  <td>{student.name}</td>
                  <td><span className="status-badge status-active">Hoạt động</span></td>
                  <td><button className="button button-ghost" type="button">Xem</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {showStudentModal && (
        <StudentAddModal classId={classId} students={availableStudents} onCancel={() => setShowStudentModal(false)} onAdd={addStudents} />
      )}
    </section>
  )
}

export default AdminClassDetailPage
