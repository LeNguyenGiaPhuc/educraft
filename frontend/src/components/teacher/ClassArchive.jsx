import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { buildClassArchiveModel, CLASS_PAGE_SIZE } from './classArchiveState.js'

const EMPTY_CLASSES = []

function classLabel(classroom) {
  return classroom.subject || classroom.name || classroom.code || 'Lớp chưa đặt tên'
}

function accessibleClassLabel(classroom) {
  return [classroom.code, classLabel(classroom), classroom.semester, classroom.schoolYear]
    .filter(Boolean)
    .join(' · ')
}

function ArchivePagination({ model, onPageChange }) {
  if (model.pageCount <= 1) return null
  return (
    <nav className="cs-class-pagination" aria-label="Phân trang lớp học">
      <span>{model.start + 1}–{model.end} / {model.matches.length} kết quả</span>
      <div>
        <button type="button" disabled={model.page === 1} onClick={() => onPageChange(model.page - 1)}>Trước</button>
        <span aria-current="page">Trang {model.page} / {model.pageCount}</span>
        <button type="button" disabled={model.page === model.pageCount} onClick={() => onPageChange(model.page + 1)}>Sau</button>
      </div>
    </nav>
  )
}

function ClassArchive({ classes }) {
  const loadedClasses = Array.isArray(classes) ? classes : EMPTY_CLASSES
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const model = useMemo(
    () => buildClassArchiveModel({ classes: loadedClasses, page, query }),
    [loadedClasses, page, query],
  )

  function handleQueryChange(nextQuery) {
    setQuery(nextQuery)
    setPage(1)
  }

  return (
    <section className="cs-class-command-board" aria-labelledby="teacher-class-board-title">
      <header className="cs-class-board-heading">
        <div>
          <span>Không gian lớp học</span>
          <h2 id="teacher-class-board-title">Danh sách lớp</h2>
        </div>
        <p aria-live="polite">
          {query ? `${model.matches.length} kết quả` : `${model.totalLoaded} lớp đã tải`} · {CLASS_PAGE_SIZE} lớp mỗi trang
        </p>
      </header>

      <div className="cs-class-search">
        <label htmlFor="teacher-class-search">Tìm trong lớp đã tải</label>
        <div>
          <span aria-hidden="true" />
          <input
            id="teacher-class-search"
            type="search"
            value={query}
            onChange={(event) => handleQueryChange(event.target.value)}
            placeholder="Mã lớp, môn học, học kỳ, năm học…"
            autoComplete="off"
          />
          {query && <button type="button" onClick={() => handleQueryChange('')}>Xóa</button>}
        </div>
      </div>

      {model.items.length ? (
        <div className="cs-teacher-class-grid">
          {model.items.map((classroom, index) => (
            <article className="cs-teacher-class-card" data-class-id={classroom.id} key={classroom.id}>
              <div className="cs-class-card-index" aria-hidden="true">
                {String(model.start + index + 1).padStart(2, '0')}
              </div>
              <div className="cs-class-card-copy">
                <span>{classroom.status === 'ACTIVE' ? 'Đang hoạt động' : 'Không hoạt động'}</span>
                <h3>{classroom.code || classLabel(classroom)}</h3>
                <p>{classLabel(classroom)}</p>
                <small>{[classroom.semester, classroom.schoolYear].filter(Boolean).join(' · ') || 'Chưa có niên khóa'}</small>
              </div>
              <dl>
                <div><dt>Học sinh</dt><dd>{classroom.studentCount}</dd></div>
                <div><dt>Bài kiểm tra</dt><dd>{classroom.assignmentCount}</dd></div>
              </dl>
              <Link to={`/classes/${classroom.id}`} aria-label={`Mở lớp ${accessibleClassLabel(classroom)}`}>
                Mở lớp <span aria-hidden="true">→</span>
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <div className="cs-class-board-empty" role="status">
          <span aria-hidden="true" />
          <h3>Không tìm thấy lớp phù hợp</h3>
          <p>Thử mã lớp, môn học, học kỳ hoặc năm học khác.</p>
          {query && <button type="button" onClick={() => handleQueryChange('')}>Xóa tìm kiếm</button>}
        </div>
      )}

      <ArchivePagination model={model} onPageChange={setPage} />
    </section>
  )
}

export default ClassArchive
