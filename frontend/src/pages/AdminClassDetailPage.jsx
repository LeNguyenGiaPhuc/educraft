import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { useAdminScope, useRegistryPage } from '../components/admin/registryHooks.js'
import RegistryPagination from '../components/admin/RegistryPagination.jsx'
import { searchRegistry } from '../data/adminRegistry.js'
import ClassRoster from '../components/admin/ClassRoster.jsx'
import AdminModal from '../components/AdminModal.jsx'
import StudentImportPanel from '../components/StudentImportPanel.jsx'
import AdminClassForm from '../components/AdminClassForm.jsx'
import { getNextStudentNumber } from '../data/adminClassRoster.js'
import {
  getClassStatusAction,
  getClassStatusLabel,
  getDeleteClassConfirmation,
} from '../data/adminClass.js'
import { adminClassService } from '../services/adminClassService.js'
import { adminAccountService } from '../services/adminAccountService.js'
import { ROLES } from '../services/authService.js'

export function StudentAddModal({ students, onCancel, onAdd, message = '' }) {
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [pending,setPending] = useState(false)
  const scope=useAdminScope()

  const matched=searchRegistry(students,query,['username','name'])
  const page=useRegistryPage(matched,30,query)
  const selected=students.find(student=>student.id===selectedId)
  function submit() {
    if(!students.some(row=>row.id===selectedId))return
    return scope.mutate('add',async()=>{setPending(true);return onAdd(selectedId)},{settled:()=>setPending(false)})
  }

  return (
    <AdminModal className="large" labelledBy="student-modal-title" onClose={onCancel}>
        <div className="admin-modal-header">
          <div>
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

        <div className="admin-student-picker" role="region" aria-label="Học sinh có thể thêm" tabIndex={0}>
          {matched.length === 0 ? <div className="empty-row">Không tìm thấy học sinh phù hợp.</div> : page.items.map((student) => (
            <label className="student-picker-row" key={student.id}>
              <input name="student" type="radio" value={student.id} disabled={pending} checked={selectedId === student.id} onChange={() => setSelectedId(student.id)} />
              <span><strong>{student.username}</strong><small>{student.name}</small></span>
            </label>
          ))}
        </div>

        {message && <p className="form-field-error" role="alert">{message}</p>}
        {selected && <p className="ar-selected-candidate" role="status">Đang chọn: <strong>{selected.username}</strong> · {selected.name}</p>}
        <RegistryPagination view={page} label="Phân trang học sinh có thể thêm" />
        <div className="admin-form-actions">
          <button className="button button-outline" type="button" onClick={onCancel}>Hủy</button>
          <button className="button button-primary" disabled={!selectedId || pending} type="button" onClick={submit}>{pending ? 'Đang thêm...' : 'Thêm vào lớp'}</button>
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
    status: String(row.status ?? '').toUpperCase(),
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

  const memberIds=new Set(mappedStudents.map(row=>row.id))
  return {
    classroom: mappedClass,
    students: mappedStudents,
    teachers: mappedTeachers,
    availableStudents: mappedStudentAccounts.filter((student) => !memberIds.has(student.id)),
  }
}

function ClassRegistryDossier({ classId }) {
  const scope = useAdminScope()
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
  const [studentError,setStudentError] = useState('')
  const [busy,setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadData=useCallback(()=>{
    return scope.read('load',()=>fetchClassDetailData(classId),{
      success:data=>{setError(null);setClassroom(data.classroom);setStudents(data.students);setTeachers(data.teachers);setAvailableStudents(data.availableStudents)},
      error:error=>setError(error.message ?? 'Không thể tải chi tiết lớp.'),settled:()=>setLoading(false)
    })
  },[classId,scope])
  useEffect(()=>{void loadData()},[loadData])
  const matchingStudents=searchRegistry(students,query,['username','name'])
  const page=useRegistryPage(matchingStudents,30,query)

  async function addStudent(studentId) {
    if (!studentId) {
      return
    }

    return scope.mutate('membership',()=>{setBusy(true);setStudentError('');return adminClassService.addStudent(classId,{student_id:studentId,student_number:getNextStudentNumber(students)})},{
      success:async()=>{setShowStudentModal(false);setNotice('Đã thêm học sinh vào lớp.');await loadData()},
      error:error=>setStudentError(error.message ?? 'Không thể thêm học sinh.'),settled:()=>setBusy(false)
    })
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

    return scope.mutate('membership',()=>{setBusy(true);return adminClassService.removeStudent(classroom.id,{student_id:student.id})},{
      success:async()=>{setNotice(`Đã gỡ ${student.name} khỏi lớp.`);await loadData()},
      error:error=>setNotice(error.message ?? 'Không thể gỡ học sinh khỏi lớp.'),settled:()=>setBusy(false)
    })
  }

  async function handleDeleteClass() {
    if (!classroom) {
      return
    }

    const confirmed = window.confirm(getDeleteClassConfirmation(classroom))

    if (!confirmed) {
      return
    }

    return scope.mutate('delete-class',()=>{setBusy(true);return adminClassService.deleteClass(classroom.id)},{
      success:()=>navigate('/admin/classes'),error:error=>setNotice(error.message ?? 'Không thể xóa lớp học này.'),settled:()=>setBusy(false)
    })
  }

  async function handleClassStatus() {
    if (!classroom) return
    const action = getClassStatusAction(classroom.status)
    const confirmed = window.confirm(`${action.label} ${classroom.code}?`)
    if (!confirmed) return

    return scope.mutate('class-status',()=>{setBusy(true);return adminClassService.updateClass(classroom.id,{status:action.nextStatus})},{
      success:async()=>{setNotice(action.nextStatus==='ARCHIVED'?'Đã lưu trữ lớp.':'Đã khôi phục lớp.');await loadData()},
      error:error=>setNotice(error.message ?? 'Không thể cập nhật trạng thái lớp.'),settled:()=>setBusy(false)
    })
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
      {notice && <div className="admin notice-bar" role="status">{notice}</div>}
      {busy && <p role="status">Đang cập nhật hồ sơ lớp…</p>}
      <div className="ar-class-dossier"><div className="ar-volume-tab">Hồ sơ lớp đang mở</div>
      <div className="admin-page-header">
        <div className="admin-page-title">
          <h1 className="ar-class-title">{classroom.code}</h1>
          <p>{classroom.subject} · {classroom.semester} · {classroom.school_year}</p>
        </div>
        <div className="admin-page-actions">
          <Link className="button button-outline" to="/admin/classes">← Quay lại</Link>
          <button className="button button-outline" type="button" onClick={() => setShowEditForm(true)}>Chỉnh sửa</button>
          <button className="button button-outline" disabled={busy} type="button" onClick={handleClassStatus}>{getClassStatusAction(classroom.status).label}</button>
          <button className="button button-danger" type="button" onClick={handleDeleteClass}>Xóa lớp</button>
          <button className="button button-outline" type="button" onClick={() => setShowImportPanel(true)}>Import Excel</button>
          <button className="button button-primary" type="button" onClick={() => setShowStudentModal(true)}>+ Thêm học sinh</button>
        </div>
      </div>

      <section className="admin-class-detail-card">
        <div className="admin-detail-grid">
          <div>
            <h2>Hồ sơ lớp</h2>
            <dl className="admin-class-facts">
              <div><dt>Trạng thái</dt><dd>{getClassStatusLabel(classroom.status)}</dd></div><div><dt>Mã lớp</dt><dd>{classroom.code ?? classroom.id}</dd></div>
              <div><dt>Giáo viên phụ trách</dt><dd>{teacher?.full_name ?? 'Chưa phân công'}</dd></div>
              <div><dt>Học kỳ</dt><dd>{classroom.semester}</dd></div>
              <div><dt>Năm học</dt><dd>{classroom.school_year}</dd></div>
              <div><dt>Học sinh đã tải</dt><dd>{students.length}</dd></div>
            </dl>
          </div>
        </div>
      </section>

      </div>
      <ClassRoster students={students} query={query} setQuery={setQuery} page={page} onRemove={handleRemoveStudent} />

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
        <StudentAddModal message={studentError} students={availableStudents} onCancel={() => setShowStudentModal(false)} onAdd={addStudent} />
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

export default function AdminClassDetailPage() {
  const {classId}=useParams()
  return <ClassRegistryDossier key={classId} classId={classId} />
}
