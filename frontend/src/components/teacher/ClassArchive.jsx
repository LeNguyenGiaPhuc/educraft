import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { buildClassArchiveModel, CLASS_PAGE_SIZE } from './classArchiveState.js'
import ClassDossier from './ClassDossier.jsx'

const EMPTY_CLASSES = []
function classLabel(classroom) { return classroom.subject || classroom.name || classroom.code || 'Lớp chưa đặt tên' }
function accessibleClassLabel(classroom) {
  return [classroom.code, classLabel(classroom), classroom.semester, classroom.schoolYear].filter(Boolean).join(' · ')
}
function ArchiveSearch({ query, onChange }) {
  return (
    <div className="tk-archive-search">
      <label htmlFor="teacher-class-search">Tìm trong lớp đã tải</label>
      <div className="tk-search-field">
        <span className="tk-search-icon" aria-hidden="true" />
        <input id="teacher-class-search" type="search" value={query} onChange={(event) => onChange(event.target.value)}
          placeholder="Mã lớp, môn học, học kỳ, năm học…" autoComplete="off" />
        {query && <button className="tk-search-clear" type="button" onClick={() => onChange('')}>Xóa</button>}
      </div>
    </div>
  )
}
function FolderTabs({ classes, selectedClassId, onSelect }) {
  const position = Math.max(0, classes.findIndex((classroom) => classroom.id === selectedClassId))
  return (
    <div className="tk-folder-tabs" aria-label="Chọn hồ sơ lớp"
      style={{ '--tk-tab-count': classes.length, '--tk-tab-position': position }}>
      <span className="tk-folder-marker" aria-hidden="true" />
      {classes.map((classroom) => (
        <div className={`tk-folder-slot${classroom.id === selectedClassId ? ' is-selected' : ''}`} key={classroom.id}>
          <button className="tk-folder-tab" type="button" aria-pressed={classroom.id === selectedClassId}
            aria-controls="teacher-class-dossier" aria-label={`Xem hồ sơ ${accessibleClassLabel(classroom)}`} onClick={() => onSelect(classroom.id)}>
            <strong>{classroom.code || classLabel(classroom)}</strong>
            <span>{classroom.id === selectedClassId ? 'Hồ sơ đang mở' : 'Chọn hồ sơ'}</span>
          </button>
          <Link className="tk-folder-open" to={`/classes/${classroom.id}`} aria-label={`Mở lớp ${accessibleClassLabel(classroom)}`}>Mở lớp</Link>
        </div>
      ))}
    </div>
  )
}
function ArchiveRow({ classroom, number, selectedClassId, onSelect }) {
  const selected = classroom.id === selectedClassId
  return (
    <li className={`tk-index-row${selected ? ' is-selected' : ''}`}>
      <button className="tk-index-select" type="button" aria-pressed={selected} aria-controls="teacher-class-dossier"
        aria-label={`Xem hồ sơ ${accessibleClassLabel(classroom)}`} onClick={() => onSelect(classroom.id)}>
        <span className="tk-index-number" aria-hidden="true">{String(number).padStart(2, '0')}</span>
        <span className="tk-index-copy">
          <strong>{classroom.code || classLabel(classroom)}</strong><span>{classLabel(classroom)}</span>
          <small>{[classroom.semester, classroom.schoolYear].filter(Boolean).join(' · ') || 'Chưa có niên khóa'}</small>
          {selected && <span className="tk-index-selected-label">Đang chọn</span>}
        </span>
      </button>
      <Link className="tk-index-open" to={`/classes/${classroom.id}`} aria-label={`Mở lớp ${accessibleClassLabel(classroom)}`}>Mở lớp</Link>
    </li>
  )
}
function ArchivePagination({ model, onPageChange }) {
  if (model.pageCount <= 1) return null
  return (
    <nav className="tk-pagination" aria-label="Phân trang lớp học">
      <span>{model.start + 1}–{model.end} / {model.matches.length} kết quả</span>
      <div className="tk-pagination-buttons">
        <button className="tk-page-button" type="button" disabled={model.page === 1} onClick={() => onPageChange(model.page - 1)}>Trước</button>
        <span aria-current="page">{model.page} / {model.pageCount}</span>
        <button className="tk-page-button" type="button" disabled={model.page === model.pageCount} onClick={() => onPageChange(model.page + 1)}>Sau</button>
      </div>
    </nav>
  )
}
function ClassArchive({ classes }) {
  const loadedClasses = Array.isArray(classes) ? classes : EMPTY_CLASSES
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [selectedClassId, setSelectedClassId] = useState(loadedClasses[0]?.id ?? null)
  const model = useMemo(() => buildClassArchiveModel({ classes: loadedClasses, page, query, selectedClassId }),
    [loadedClasses, page, query, selectedClassId])
  const effectiveSelectedId = model.selectedClass?.id ?? null
  // Long tab labels use the compact index, never smaller typography to force a fit.
  const showFolderTabs = loadedClasses.length > 0 && loadedClasses.length <= 3 && !query.trim()
    && loadedClasses.every((classroom) => (classroom.code || classLabel(classroom)).length <= 18)
  function handleQueryChange(nextQuery) { setQuery(nextQuery); setPage(1) }
  return (
    <section className={`tk-archive${showFolderTabs ? ' is-folders' : ' is-index'}`} aria-label="Tủ hồ sơ lớp học">
      <div className="tk-archive-toolbar">
        <ArchiveSearch query={query} onChange={handleQueryChange} />
        <p className="tk-archive-scope" aria-live="polite"><strong>{model.totalLoaded} lớp đã tải</strong>
          <span>{query ? `${model.matches.length} kết quả · ` : ''}{CLASS_PAGE_SIZE} lớp mỗi trang</span></p>
      </div>
      <div className="tk-archive-layout">
        <div className="tk-folder-sheet">
          {showFolderTabs ? <FolderTabs classes={loadedClasses} selectedClassId={effectiveSelectedId} onSelect={setSelectedClassId} />
            : <div className="tk-sheet-tab">Hồ sơ đang mở</div>}
          <ClassDossier selectedClass={model.selectedClass} selectedOutsideResults={model.selectedOutsideResults} />
        </div>
        {!showFolderTabs && (
          <div className="tk-index-panel">
            <div className="tk-index-heading"><h2>Danh mục lớp</h2><span>{model.matches.length} kết quả</span></div>
            {model.items.length ? (
              <div className="tk-index-scroll" role="region" aria-label="Danh sách lớp trên trang hiện tại" tabIndex={0}>
                <ol className="tk-class-index">{model.items.map((classroom, index) => <ArchiveRow key={classroom.id} classroom={classroom}
                  number={model.start + index + 1} selectedClassId={effectiveSelectedId} onSelect={setSelectedClassId} />)}</ol>
              </div>
            ) : (
              <div className="tk-index-empty" role="status"><strong>Không tìm thấy lớp phù hợp.</strong>
                <span>Thử mã lớp, môn học, học kỳ hoặc năm học khác.</span>
                <button className="tk-button tk-button-secondary" type="button" onClick={() => handleQueryChange('')}>Xóa tìm kiếm</button></div>
            )}
            <ArchivePagination model={model} onPageChange={setPage} />
          </div>
        )}
      </div>
    </section>
  )
}
export default ClassArchive
