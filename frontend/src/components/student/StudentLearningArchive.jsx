import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { formatAssignmentDeadline, getAssignmentAvailability } from '../../data/assignmentDeadline.js'
import { buildStudentArchive } from '../../data/studentArchive.js'
import PaperEdge from '../kinetic/PaperEdge.jsx'
import StudentPagination from './StudentPagination.jsx'
import '../../styles/student-folio.css'

const CLASS_ACCENTS = ['blue', 'mint', 'lavender', 'yellow']

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
    <div className="sf-archive">
      <div className="sf-archive-toolbar">
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

      <div className="sf-learning-archive">
        <section className="sf-class-index" aria-label="Danh mục lớp đã tải">
          <div className="sf-index-heading">
            <div>
              <span className="sf-section-kicker">Lớp học</span>
              <h2>Lớp của bạn</h2>
            </div>
            <span>{view.classes.matchCount} kết quả đã tải</span>
          </div>

          <div className="sf-class-list">
            {view.classes.items.map((row, index) => (
              <button
                className="sf-class-row sf-class-card"
                data-class-id={row.id}
                data-accent={CLASS_ACCENTS[(view.classes.start + index) % CLASS_ACCENTS.length]}
                aria-pressed={row.id === selected?.id}
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
                <small>{row.semester} · {row.schoolYear}</small>
                <span className="sf-class-card-arrow" aria-hidden="true">→</span>
                {row.id === selected?.id && <span className="sf-selected-label">Đang xem</span>}
              </button>
            ))}
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

        <section className="sf-class-sheet" id="student-class-sheet" aria-labelledby="student-class-title">
          <div className="sf-dossier-tab">
            <span aria-hidden="true">✦</span>
            Lớp đang xem · {selected.code}
          </div>
          <span className="sf-paper-underlay" aria-hidden="true" />
          <PaperEdge trigger={selected.id} rotation="0deg" />

          <div className="sf-dossier-content">
            <header className="sf-dossier-heading">
              <div>
                <span className="sf-section-kicker">Không gian môn học</span>
                <h2 id="student-class-title">{selected.code}</h2>
                <p>{selected.subject}</p>
              </div>
              <dl className="sf-class-context">
                <div><dt>Học kỳ</dt><dd>{selected.semester}</dd></div>
                <div><dt>Năm học</dt><dd>{selected.schoolYear}</dd></div>
              </dl>
            </header>

            <div className="sf-assignment-heading">
              <div>
                <span className="sf-section-kicker">Bài học cần làm</span>
                <h3>Bài kiểm tra</h3>
              </div>
              <span>{selected.assignments.length} bài đã tải</span>
            </div>

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

            {view.assignments.items.length ? (
              <ol className="sf-assignment-list" start={view.assignments.start + 1}>
                {view.assignments.items.map((row, index) => {
                  const availability = getAssignmentAvailability(row)
                  return (
                    <li className="sf-assignment-card" key={row.id} data-assignment-id={row.id}>
                      <span className="sf-record-number" aria-hidden="true">
                        {String(view.assignments.start + index + 1).padStart(2, '0')}
                      </span>
                      <div className="sf-assignment-card-content">
                        <h4>{row.title}</h4>
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
          </div>
        </section>
      </div>
    </div>
  )
}

export default StudentLearningArchive
