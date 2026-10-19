import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import AssignmentArchive from './AssignmentArchive.jsx'
import StudentRoster from './StudentRoster.jsx'
import { animateTeacherDossier } from './teacherMotion.js'
import '../../styles/teacher-class-detail.css'

const TABS = [{ id: 'assignments', label: 'Bài kiểm tra' }, { id: 'students', label: 'Học sinh' }]
function ClassFolderTabs({ activeTab, onTabChange }) {
  const tabRefs = useRef({})
  function onKeyDown(event, index) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : (index + 1) % TABS.length
    onTabChange(TABS[next].id)
    tabRefs.current[TABS[next].id]?.focus()
  }
  return <div className="tk-class-tabs" role="tablist" aria-label="Nội dung lớp học">
    {TABS.map((tab, index) => <button key={tab.id} ref={node => { tabRefs.current[tab.id] = node }}
      id={`${tab.id}-tab`} type="button" role="tab" aria-selected={activeTab === tab.id}
      aria-controls={`${tab.id}-panel`} tabIndex={activeTab === tab.id ? 0 : -1}
      onClick={() => onTabChange(tab.id)} onKeyDown={event => onKeyDown(event, index)}>{tab.label}</button>)}
  </div>
}
function ClassDetailView({ state, activeTab, onTabChange, countStore }) {
  const backplate = useRef(null)
  useEffect(() => animateTeacherDossier(backplate.current), [activeTab, state.status])
  if (state.status === 'error') return <main className="page-content teacher-page tk-class-detail"><div className="page-container">
    <section className="tk-state tk-error-state" role="alert"><h1>Không thể mở lớp học</h1><p>{state.message}</p><Link className="tk-button tk-button-primary" to="/">Về tổng quan</Link></section>
  </div></main>
  if (state.status === 'loading' || !state.classroom) return <main className="page-content teacher-page tk-class-detail"><div className="page-container">
    <section className="tk-state" aria-live="polite" aria-busy="true"><h1>Đang tải lớp học...</h1><p>Đang tải danh sách bài kiểm tra và học sinh.</p><span className="visually-hidden">Danh sách học sinh đang được tải</span></section>
  </div></main>
  const { classroom } = state
  return (
    <main className="page-content teacher-page tk-class-detail">
      <div className="page-container">
        <nav className="tk-class-breadcrumb" aria-label="Đường dẫn trang"><Link to="/">Về tổng quan</Link><span aria-hidden="true">/</span><span>{classroom.name}</span></nav>
        <section className="tk-class-dossier-heading" aria-labelledby="class-title">
          <div className="tk-class-header-main">
            <div className="tk-class-identity">
              <span className="tk-section-kicker">Không gian lớp học</span>
              <h1 id="class-title">{classroom.code || classroom.id}</h1>
              <p>{classroom.subject}</p>
            </div>
            <Link className="tk-button tk-button-primary" to={`/classes/${classroom.id}/assignments/new`}>
              Tạo bài kiểm tra<span className="tk-button-arrow" aria-hidden="true" />
            </Link>
          </div>
          <dl className="tk-class-facts">
            <div><dt>Học kỳ</dt><dd>{classroom.semester || 'Chưa có dữ liệu'}</dd></div>
            <div><dt>Năm học</dt><dd>{classroom.schoolYear || 'Chưa có dữ liệu'}</dd></div>
            <div><dt>Học sinh</dt><dd>{classroom.studentCount}</dd></div>
            <div><dt>Bài kiểm tra</dt><dd>{classroom.assignmentCount}</dd></div>
          </dl>
          <span className="tk-class-header-status">{classroom.status === 'ACTIVE' ? 'Đang hoạt động' : 'Không hoạt động'}</span>
        </section>
        <div className="tk-class-folder">
          <ClassFolderTabs activeTab={activeTab} onTabChange={onTabChange} />
          <div className="tk-class-backplate" ref={backplate} aria-hidden="true" />
          <div className="tk-class-paper">
            <section id="assignments-panel" role="tabpanel" aria-labelledby="assignments-tab" hidden={activeTab !== 'assignments'}>
              <AssignmentArchive classId={classroom.id} rows={state.assignments} countStore={countStore} countsEnabled={activeTab === 'assignments'} />
            </section>
            <section id="students-panel" role="tabpanel" aria-labelledby="students-tab" hidden={activeTab !== 'students'}>
              <StudentRoster rows={classroom.students ?? []} studentCount={classroom.studentCount} />
            </section>
          </div>
        </div>
      </div>
    </main>
  )
}
export default ClassDetailView
