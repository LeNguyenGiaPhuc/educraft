import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { formatAssignmentDeadline, getAssignmentAvailability } from '../../data/assignmentDeadline.js'
import { buildStudentArchive } from '../../data/studentArchive.js'
import StudentPagination from './StudentPagination.jsx'
import '../../styles/student-folio.css'
import '../../styles/student-campus-board.css'

const CLASS_ACCENTS = ['blue', 'mint', 'lavender', 'yellow']

function getFeaturedOpenAssignments(classes, limit = 3) {
  const featured = []
  for (const classroom of classes) {
    for (const assignment of classroom.assignments ?? []) {
      if (getAssignmentAvailability(assignment).isOpen) {
        featured.push({ assignment, classroom })
        if (featured.length === limit) return featured
      }
    }
  }
  return featured
}

function StudentLearningArchive({ classes = [] }) {
  const [browse, setBrowse] = useState({
    selectedId: classes[0]?.id,
    classQuery: '',
    classPage: 1,
    assignmentQuery: '',
    assignmentPage: 1,
  })
  const view = useMemo(() => buildStudentArchive({ classes, ...browse }), [classes, browse])
  const selected = view.selected
  const featuredAssignments = useMemo(() => getFeaturedOpenAssignments(classes), [classes])

  function select(id) {
    setBrowse((current) => ({
      ...current,
      selectedId: id,
      assignmentQuery: '',
      assignmentPage: 1,
    }))
  }

  if (!classes.length) {
    return (
      <section className="sf-paper sf-empty sf-empty-campus">
        <span className="sf-empty-mark" aria-hidden="true">✦</span>
        <div>
          <h2>Chưa có lớp học nào</h2>
          <p>Các lớp bạn tham gia sẽ xuất hiện ở đây.</p>
        </div>
      </section>
    )
  }

  return (
    <div className="sf-archive cs-student-campus-board">
      <section className="cs-student-open-zone" aria-labelledby="student-open-title">
        <div className="cs-open-zone-heading">
          <div>
            <span className="sf-section-kicker">Ưu tiên hôm nay</span>
            <h2 id="student-open-title">Bài đang mở</h2>
          </div>
          <span>{featuredAssignments.length ? `${featuredAssignments.length} bài đầu tiên theo dữ liệu đã tải` : 'Không có bài đang mở'}</span>
        </div>
        {featuredAssignments.length ? (
          <div className="cs-open-task-layout">
            {featuredAssignments.map(({ assignment, classroom }, index) => (
              <article className={`cs-open-task${index === 0 ? ' is-primary' : ''}`} key={`${classroom.id}:${assignment.id}`}>
                <span className="cs-open-task-subject">{classroom.subject || classroom.code}</span>
                <h3>{assignment.title}</h3>
                <p>{classroom.code} · Hạn nộp {formatAssignmentDeadline(assignment)}</p>
                <Link aria-label={`Mở bài ${assignment.title}`} to={`/student/assignments/${encodeURIComponent(assignment.id)}`}>
                  Mở bài <span aria-hidden="true">→</span>
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="cs-open-zone-empty" role="status">
            <strong>Hiện chưa có bài nào đang mở.</strong>
            <span>Bạn vẫn có thể xem lớp và các bài đã đóng ở bên dưới.</span>
          </div>
        )}
      </section>

      <section className="cs-student-class-board" aria-labelledby="student-classes-title">
        <div className="cs-board-heading">
          <div>
            <span className="sf-section-kicker">Campus Board</span>
            <h2 id="student-classes-title">Lớp của bạn</h2>
          </div>
          <span>{view.classes.matchCount} kết quả đã tải</span>
        </div>
        <div className="cs-board-search">
          <label htmlFor="student-class-search">Tìm lớp của bạn</label>
          <div className="sf-search-field">
            <span aria-hidden="true">⌕</span>
            <input
              id="student-class-search"
              type="search"
              value={browse.classQuery}
              placeholder="Mã lớp hoặc môn học"
              onChange={(event) => setBrowse((current) => ({
                ...current,
                classQuery: event.target.value,
                classPage: 1,
              }))}
            />
          </div>
        </div>

        <div className="sf-class-list cs-student-class-grid">
          {view.classes.items.map((row, index) => {
            const isSelected = row.id === selected?.id
            const openCount = (row.assignments ?? []).filter((assignment) => getAssignmentAvailability(assignment).isOpen).length
            return (
              <button
                className={`sf-class-row sf-class-card cs-student-class-card${isSelected ? ' is-selected' : ''}`}
                data-class-id={row.id}
                data-accent={CLASS_ACCENTS[(view.classes.start + index) % CLASS_ACCENTS.length]}
                aria-pressed={isSelected}
                aria-controls="student-class-sheet"
                key={row.id}
                onClick={() => select(row.id)}
                type="button"
              >
                <span className="sf-class-position" aria-hidden="true">
                  {String(view.classes.start + index + 1).padStart(2, '0')}
                </span>
                <span className="sf-class-card-main">
                  <strong>{row.code}</strong>
                  <span>{row.subject}</span>
                </span>
                <small>{[row.semester, row.schoolYear].filter(Boolean).join(' · ') || 'Chưa có niên khóa'}</small>
                <span className="cs-class-open-count">{openCount} bài đang mở</span>
                <span className="sf-class-card-arrow" aria-hidden="true">→</span>
                {isSelected && <span className="sf-selected-label"><span aria-hidden="true">✓</span> Đang xem</span>}
              </button>
            )
          })}
          {!view.classes.matchCount && (
            <p className="sf-empty sf-search-empty">
              Không có lớp khớp tìm kiếm. Lớp đang xem vẫn được giữ nguyên.
            </p>
          )}
        </div>
        <StudentPagination
          label="Phân trang lớp học"
          view={view.classes}
          onPage={(classPage) => setBrowse((current) => ({ ...current, classPage }))}
        />
      </section>

      <section className="cs-student-assignment-board" id="student-class-sheet" aria-labelledby="student-class-title">
        <header className="cs-assignment-board-heading">
          <div>
            <div>
              <span className="sf-section-kicker">Bài trong lớp đang xem</span>
              <h2 id="student-class-title">{selected.code} · {selected.subject}</h2>
            </div>
            <p>{[selected.semester, selected.schoolYear].filter(Boolean).join(' · ') || 'Chưa có niên khóa'}</p>
          </div>
          <span>{selected.assignments.length} bài đã tải</span>
        </header>
        <div className="cs-assignment-tools">
          <div>
            <label htmlFor="student-assignment-search">Tìm bài trong lớp đang xem</label>
            <div className="sf-search-field sf-assignment-search">
              <span aria-hidden="true">⌕</span>
              <input
                id="student-assignment-search"
                type="search"
                placeholder="Tên bài kiểm tra"
                value={browse.assignmentQuery}
                onChange={(event) => setBrowse((current) => ({
                  ...current,
                  assignmentQuery: event.target.value,
                  assignmentPage: 1,
                }))}
              />
            </div>
          </div>
        </div>

        {view.assignments.items.length ? (
          <ol className="sf-assignment-list cs-student-assignment-list" start={view.assignments.start + 1}>
            {view.assignments.items.map((row, index) => {
              const availability = getAssignmentAvailability(row)
              return (
                <li className="sf-assignment-card" key={row.id} data-assignment-id={row.id}>
                  <span className="sf-record-number" aria-hidden="true">
                    {String(view.assignments.start + index + 1).padStart(2, '0')}
                  </span>
                  <div className="sf-assignment-card-content">
                    <h3>{row.title}</h3>
                    <p>Hạn nộp: {formatAssignmentDeadline(row)}</p>
                  </div>
                  <span className={`sf-status sf-status-${availability.isOpen ? 'open' : 'closed'}`}>
                    <span aria-hidden="true" />
                    {availability.isOpen ? 'Đang mở' : 'Đã đóng'}
                  </span>
                  <Link
                    className="sf-open-assignment"
                    aria-label={`Mở bài ${row.title}`}
                    to={`/student/assignments/${encodeURIComponent(row.id)}`}
                  >
                    Mở bài <span aria-hidden="true">→</span>
                  </Link>
                </li>
              )
            })}
          </ol>
        ) : (
          <div className="sf-empty sf-assignment-empty">
            <span aria-hidden="true">✦</span>
            <p>{browse.assignmentQuery ? 'Không có bài khớp tìm kiếm.' : 'Chưa có bài kiểm tra trong lớp này.'}</p>
          </div>
        )}

        <StudentPagination
          label="Phân trang bài kiểm tra"
          view={view.assignments}
          onPage={(assignmentPage) => setBrowse((current) => ({ ...current, assignmentPage }))}
        />
      </section>
    </div>
  )
}

export default StudentLearningArchive
