import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import {
  buildClassArchiveModel,
  CLASS_PAGE_SIZE,
} from './classArchiveState.js'
import ClassDossier from './ClassDossier.jsx'

const EMPTY_CLASSES = []

function classLabel(classroom) {
  return classroom.subject || classroom.name || classroom.code || 'Lớp chưa đặt tên'
}

function classMeta(classroom) {
  return [classroom.semester, classroom.schoolYear].filter(Boolean).join(' · ') || 'Chưa có niên khóa'
}

function ArchiveSearch({ query, onChange, onClear }) {
  return (
    <div className="tk-archive-search">
      <label htmlFor="teacher-class-search">Tìm trong lớp đã tải</label>
      <div className="tk-search-field">
        <span className="tk-search-icon" aria-hidden="true" />
        <input
          id="teacher-class-search"
          type="search"
          value={query}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Mã lớp, môn học, học kỳ..."
          autoComplete="off"
        />
        {query && (
          <button className="tk-search-clear" type="button" onClick={onClear}>
            Xóa tìm kiếm
          </button>
        )}
      </div>
    </div>
  )
}

function FolderTabs({ classes, selectedClassId, onSelect }) {
  if (classes.length < 2 || classes.length > 3) {
    return null
  }

  return (
    <div className="tk-folder-tabs" aria-label="Chọn hồ sơ lớp">
      {classes.map((classroom, index) => (
        <button
          className={`tk-folder-tab${classroom.id === selectedClassId ? ' is-selected' : ''}`}
          key={classroom.id}
          type="button"
          aria-current={classroom.id === selectedClassId ? 'true' : undefined}
          onClick={() => onSelect(classroom.id)}
        >
          <span className="tk-folder-tab-index">0{index + 1}</span>
          <span>{classroom.code || classLabel(classroom)}</span>
        </button>
      ))}
    </div>
  )
}

function ArchiveRow({ classroom, number, selectedClassId, onSelect }) {
  const selected = classroom.id === selectedClassId

  return (
    <li className="tk-index-item">
      <div className={`tk-index-row${selected ? ' is-selected' : ''}`}>
        <button
          className="tk-index-select"
          type="button"
          aria-current={selected ? 'true' : undefined}
          aria-label={`${selected ? 'Đang mở' : 'Xem'} hồ sơ ${classLabel(classroom)}`}
          onClick={() => onSelect(classroom.id)}
        >
          <span className="tk-index-number">{String(number).padStart(2, '0')}</span>
          <span className="tk-index-copy">
            <strong>{classroom.code || classLabel(classroom)}</strong>
            <span>{classLabel(classroom)}</span>
            <small>{classMeta(classroom)}</small>
          </span>
          <span className="tk-index-state" aria-hidden="true" />
        </button>
        <Link
          className="tk-index-open"
          to={`/classes/${classroom.id}`}
          aria-label={`Mở lớp ${classLabel(classroom)}`}
        >
          Mở lớp
        </Link>
      </div>
    </li>
  )
}

function ArchivePagination({ model, onPageChange }) {
  if (model.pageCount <= 1) {
    return null
  }

  return (
    <nav className="tk-pagination" aria-label="Phân trang lớp học">
      <span>
        {model.start + 1}–{model.end} / {model.matches.length} kết quả
      </span>
      <div className="tk-pagination-buttons">
        <button
          className="tk-page-button"
          type="button"
          disabled={model.page === 1}
          onClick={() => onPageChange(model.page - 1)}
        >
          Trước
        </button>
        <span aria-current="page">Trang {model.page} / {model.pageCount}</span>
        <button
          className="tk-page-button"
          type="button"
          disabled={model.page === model.pageCount}
          onClick={() => onPageChange(model.page + 1)}
        >
          Sau
        </button>
      </div>
    </nav>
  )
}

function ClassArchive({ classes }) {
  const loadedClasses = Array.isArray(classes) ? classes : EMPTY_CLASSES
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [selectedClassId, setSelectedClassId] = useState(loadedClasses[0]?.id ?? null)
  const effectiveSelectedClassId = loadedClasses.some((classroom) => classroom.id === selectedClassId)
    ? selectedClassId
    : loadedClasses[0]?.id ?? null

  const model = useMemo(
    () => buildClassArchiveModel({
      classes: loadedClasses,
      page,
      query,
      selectedClassId: effectiveSelectedClassId,
    }),
    [effectiveSelectedClassId, loadedClasses, page, query],
  )

  function handleQueryChange(nextQuery) {
    setQuery(nextQuery)
    setPage(1)
  }

  const showFolderTabs = loadedClasses.length >= 2 && loadedClasses.length <= 3 && !query.trim()

  return (
    <section className="tk-archive" aria-labelledby="teacher-class-archive-title">
      <div className="tk-archive-heading">
        <div>
          <p className="tk-kicker">TEACHER / FIELD NOTES</p>
          <h2 id="teacher-class-archive-title">Tủ hồ sơ lớp học</h2>
          <p>Chọn một hồ sơ để xem nhanh thông tin lớp, hoặc mở thẳng không gian làm việc.</p>
        </div>
        <div className="tk-archive-count" aria-live="polite">
          <strong>{model.matches.length}</strong>
          <span>{query ? 'kết quả' : 'lớp đã tải'}</span>
        </div>
      </div>

      <div className="tk-archive-toolbar">
        <ArchiveSearch
          query={query}
          onChange={handleQueryChange}
          onClear={() => handleQueryChange('')}
        />
        <p className="tk-archive-scope">
          Tìm trong {model.totalLoaded} lớp đã tải · {CLASS_PAGE_SIZE} lớp mỗi trang
        </p>
      </div>

      {showFolderTabs && (
        <FolderTabs
          classes={loadedClasses}
          selectedClassId={selectedClassId}
          onSelect={setSelectedClassId}
        />
      )}

      <div className="tk-archive-layout">
        <div className="tk-index-panel">
          <div className="tk-index-heading">
            <span>INDEX / LỚP ĐƯỢC PHÂN CÔNG</span>
            <span>{model.totalLoaded} bản ghi</span>
          </div>

          {model.items.length > 0 ? (
            <ol className="tk-class-index">
              {model.items.map((classroom, index) => (
                <ArchiveRow
                  classroom={classroom}
                  key={classroom.id}
                  number={model.start + index + 1}
                  selectedClassId={selectedClassId}
                  onSelect={setSelectedClassId}
                />
              ))}
            </ol>
          ) : (
            <div className="tk-index-empty" role="status">
              <strong>Không tìm thấy lớp phù hợp.</strong>
              <span>Thử mã lớp, môn học, học kỳ hoặc năm học khác.</span>
              <button type="button" onClick={() => handleQueryChange('')}>Xóa tìm kiếm</button>
            </div>
          )}

          <ArchivePagination model={model} onPageChange={setPage} />
        </div>

        <ClassDossier
          selectedClass={model.selectedClass}
          selectedOutsideResults={model.selectedOutsideResults}
        />
      </div>
    </section>
  )
}

export default ClassArchive
