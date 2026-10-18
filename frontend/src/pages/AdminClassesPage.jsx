import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { useAdminScope, useRegistryPage } from '../components/admin/registryHooks.js'
import RegistryPagination from '../components/admin/RegistryPagination.jsx'
import { filterAdminClasses } from '../data/adminClass.js'
import AdminClassForm from '../components/AdminClassForm.jsx'
import { adminClassService } from '../services/adminClassService.js'
import { adminAccountService } from '../services/adminAccountService.js'
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
  const scope = useAdminScope()
  const [showClassForm, setShowClassForm] = useState(false)
  const [notice, setNotice] = useState('')
  const [query, setQuery] = useState('')
  const [teacher, setTeacher] = useState('all')
  const [status, setStatus] = useState('all')
  const [classes, setClasses] = useState([])
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadData = useCallback(() => {
    return scope.read('load',fetchClassesPageData,{
      success:({classRows,teacherRows})=>{setError(null);setClasses(classRows.map(normalizeClass));setTeachers(teacherRows.map(normalizeTeacher))},
      error:error=>setError(error.message ?? 'Không thể tải danh sách lớp.'),settled:()=>setLoading(false)
    })
  },[scope])
  useEffect(()=>{void loadData()},[loadData])
  const filteredClasses = filterAdminClasses(classes, query, teacher, status)
  const page = useRegistryPage(filteredClasses,25,JSON.stringify([query,teacher,status]))
  const teacherById = new Map(teachers.map(row=>[row.id,row.full_name]))

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

      {notice && <div className="admin notice-bar" role="status">{notice}</div>}

      <section className="admin-filter-card">
        <div className="admin-filter-row">
          <label className="search-box">
            <span>Tìm kiếm</span>
            <input
              value={query}
              placeholder="Tìm theo mã lớp hoặc môn học"
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

          <label className="search-box">
            <span>Trạng thái</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="all">Tất cả</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="ARCHIVED">Đã lưu trữ</option>
            </select>
          </label>
        </div>
      </section>

      {loading ? (
        <section className="admin-state-panel" aria-live="polite"><h2>Đang tải danh sách lớp...</h2></section>
      ) : (
        <section className="admin-table-panel ar-class-register" aria-label="Danh mục lớp đã tải">
          <div className="admin-table-heading"><div><h2>Danh mục lớp</h2><p>{filteredClasses.length} kết quả trong dữ liệu đã tải</p></div></div>
          <div className="ar-class-index">
          {page.items.length===0 ? <div className="admin-empty-panel"><h2>Không tìm thấy lớp phù hợp.</h2><p>Thử đổi mã lớp, môn học hoặc bộ lọc giáo viên.</p></div> : page.items.map((classroom,index)=>(
            <Link className="ar-class-record" data-record-id={classroom.id} key={classroom.id} to={`/admin/classes/${classroom.id}`}>
              <span className="ar-record-index" aria-hidden="true">{String(page.start+index+1).padStart(2,'0')}</span>
              <div><strong>{classroom.code ?? classroom.id}</strong><h3>{classroom.subject}</h3><p>{classroom.semester} · {classroom.school_year}</p></div>
              <div><span className="ar-record-label">Giáo viên phụ trách</span><span>{teacherById.get(classroom.teacher_id) ?? 'Chưa phân công'}</span></div>
              <div><span className={`class-status ${classroom.status==='ACTIVE'?'class-status-active':'class-status-inactive'}`}>{classroom.status==='ACTIVE'?'Đang hoạt động':classroom.status==='ARCHIVED'?'Đã lưu trữ':classroom.status}</span><span className="ar-open-record">Mở hồ sơ →</span></div>
            </Link>
          ))}
          </div>
          <RegistryPagination view={page} label="Phân trang lớp học" />
        </section>
      )}

      {showClassForm && (
        <AdminClassForm teachers={teachers} onCancel={() => setShowClassForm(false)} onSaved={onCreate} />
      )}
    </section>
  )
}

export default AdminClassesPage
