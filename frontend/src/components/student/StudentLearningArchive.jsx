import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { buildStudentArchive } from '../../data/studentArchive.js'
import { formatAssignmentDeadline, getAssignmentAvailability } from '../../data/assignmentDeadline.js'
import PaperEdge from '../kinetic/PaperEdge.jsx'
import StudentPagination from './StudentPagination.jsx'
import '../../styles/student-folio.css'

/* KINETIC / Operate: a learning index inside one open academic folder.
   Chartreuse stock, navy ink, Archivo titles and chalk reading surfaces.
   Select a real class ID, find a loaded assignment and open its existing route.
   No marketing hero, invented metrics, AI, or Teacher review behavior. */
function StudentLearningArchive({ classes = [] }) {
  const [browse, setBrowse] = useState({ selectedId: classes[0]?.id, classQuery: '', classPage: 1, assignmentQuery: '', assignmentPage: 1 })
  const view = useMemo(() => buildStudentArchive({ classes, ...browse }), [classes, browse])
  const selected = view.selected
  function select(id) { setBrowse(current => ({ ...current, selectedId: id, assignmentQuery: '', assignmentPage: 1 })) }
  const selector = (row, index) => <button type="button" data-class-id={row.id} aria-pressed={row.id === selected?.id} aria-controls="student-class-sheet" className="sf-class-row" key={row.id} onClick={() => select(row.id)}>
    <span className="sf-class-position" aria-hidden="true">{String(view.classes.start + index + 1).padStart(2, '0')}</span>
    <strong>{row.code}</strong><span>{row.subject}</span><small>{row.semester} · {row.schoolYear}</small>
    {row.id === selected?.id && <span className="sf-selected-label">Đang xem</span>}
  </button>
  if (!classes.length) return <section className="sf-paper sf-empty"><h2>Chưa có lớp học nào</h2><p>Các lớp bạn tham gia sẽ xuất hiện ở đây.</p></section>
  return <div className="sf-archive">
    <div className="sf-archive-toolbar">
      <label htmlFor="student-class-search">Tìm trong lớp đã tải</label><input id="student-class-search" type="search" value={browse.classQuery} placeholder="Mã lớp hoặc môn học" onChange={event => setBrowse(current => ({ ...current, classQuery: event.target.value, classPage: 1 }))} />
    </div><div className="sf-learning-archive">
    <section className="sf-class-index" aria-label="Danh mục lớp đã tải">
      <div className="sf-index-heading"><h2>Danh mục lớp</h2><span>{view.classes.matchCount} kết quả đã tải</span></div>
      <div className="sf-class-list">
        {view.classes.items.map(selector)}
        {!view.classes.matchCount && <p className="sf-empty">Không có lớp khớp tìm kiếm. Hồ sơ đang xem được giữ nguyên.</p>}
      </div>
      <StudentPagination label="Phân trang lớp học" view={view.classes} onPage={classPage => setBrowse(current => ({ ...current, classPage }))} />
    </section>
    <section className="sf-class-sheet" id="student-class-sheet" aria-labelledby="student-class-title">
      <div className="sf-dossier-tab">Đang xem · {selected.code}</div>
      <span className="sf-paper-underlay" aria-hidden="true" />
      <PaperEdge trigger={selected.id} rotation="0deg" />
      <div className="sf-dossier-content">
      <header className="sf-dossier-heading"><div><h2 id="student-class-title">{selected.code}</h2><p>{selected.subject}</p></div><dl className="sf-class-context"><div><dt>Học kỳ</dt><dd>{selected.semester}</dd></div><div><dt>Năm học</dt><dd>{selected.schoolYear}</dd></div></dl></header>
      <div className="sf-assignment-heading"><h3>Bài kiểm tra</h3><span>{selected.assignments.length} bài đã tải</span></div>
      <label htmlFor="student-assignment-search">Tìm tên bài trong lớp đang xem</label>
      <input id="student-assignment-search" type="search" placeholder="Tên bài kiểm tra" value={browse.assignmentQuery} onChange={event => setBrowse(current => ({ ...current, assignmentQuery: event.target.value, assignmentPage: 1 }))} />
      {view.assignments.items.length ? <ol className="sf-assignment-list" start={view.assignments.start + 1}>{view.assignments.items.map((row, index) => <li key={row.id} data-assignment-id={row.id}>
        <span className="sf-record-number" aria-hidden="true">{String(view.assignments.start + index + 1).padStart(2, '0')}</span>
        <div><h4><Link to={`/student/assignments/${encodeURIComponent(row.id)}`}>{row.title}</Link></h4><p>Hạn nộp: {formatAssignmentDeadline(row)}</p></div>
        <span className="sf-status">{getAssignmentAvailability(row).isOpen ? 'Đang mở' : 'Đã đóng'}</span>
        <Link className="sf-open-assignment" aria-label={`Mở bài ${row.title}`} to={`/student/assignments/${encodeURIComponent(row.id)}`}>Mở bài</Link>
      </li>)}</ol> : <div className="sf-empty"><p>{browse.assignmentQuery ? 'Không có bài khớp tìm kiếm.' : 'Chưa có bài kiểm tra trong lớp này.'}</p></div>}
      <StudentPagination label="Phân trang bài kiểm tra" view={view.assignments} onPage={assignmentPage => setBrowse(current => ({ ...current, assignmentPage }))} />
      </div>
    </section>
  </div></div>
}
export default StudentLearningArchive
