import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { Link } from 'react-router-dom'
import { ASSIGNMENT_STATUSES, buildAssignmentArchive } from '../../data/classAssignmentArchive.js'
import { watchVisibleCounts } from '../../data/submissionCountStore.js'

const EMPTY_COUNTS = {}
const emptySnapshot = () => EMPTY_COUNTS
const noSubscribe = () => () => {}
export function SubmissionCount({ entry, assignment, onRetry }) {
  let content = <span aria-label="Đang tải số lượt nộp">Đang tải…</span>
  if (entry?.status === 'success') content = `${entry.count} lượt nộp`
  if (entry?.status === 'error') content = <><span>Chưa tải được</span>
    <button className="tk-count-retry" type="button" onClick={() => onRetry(assignment.id)} aria-label={`Thử tải lại lượt nộp: ${assignment.title}`}>Thử lại</button></>
  return <span className="tk-count-state">{content}</span>
}
function AssignmentArchive({ classId, rows, countStore, countsEnabled = true }) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const model = useMemo(() => buildAssignmentArchive({ rows, query, status, page }), [rows, query, status, page])
  const readCounts = useCallback(() => countStore?.getSnapshot(classId) ?? EMPTY_COUNTS, [countStore, classId])
  const counts = useSyncExternalStore(countStore?.subscribe ?? noSubscribe, readCounts, emptySnapshot)
  const visibleIds = useMemo(() => model.items.map(row => row.id), [model.items])
  useEffect(() => countsEnabled ? watchVisibleCounts(countStore, classId, visibleIds) : countStore?.setVisible(classId, []), [classId, countsEnabled, countStore, visibleIds])
  function clearBrowse() { setQuery(''); setStatus(''); setPage(1) }
  return (
    <div className="tk-assignment-archive">
      <div className="tk-class-section-heading">
        <div><h2>Bài kiểm tra bài ghi</h2><p>{rows.length} bài đã tải · 25 bài mỗi trang</p></div>
      </div>
      {rows.length > 0 && <div className="tk-assignment-tools">
        <div className="tk-assignment-search"><label htmlFor="class-assignment-search">Tìm trong bài kiểm tra đã tải</label>
          <input id="class-assignment-search" type="search" value={query} placeholder="Tên bài kiểm tra…"
            onChange={event => { setQuery(event.target.value); setPage(1) }} />
        </div>
        <div className="tk-assignment-filter"><label htmlFor="class-assignment-status">Trạng thái</label>
          <select id="class-assignment-status" value={status} onChange={event => { setStatus(event.target.value); setPage(1) }}>
            <option value="">Mọi trạng thái</option>
            {Object.entries(ASSIGNMENT_STATUSES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
      </div>}
      {model.items.length ? (
        <div className="tk-class-table-scroll" role="region" aria-label="Danh sách bài kiểm tra trên trang hiện tại" tabIndex={0}>
          <table className="tk-class-table tk-assignment-table">
            <caption className="visually-hidden">Bài kiểm tra đã tải của lớp; lượt nộp là số lần nộp, không phải số học sinh phân biệt. Lượt nộp tải theo trang, có thể dùng bộ nhớ tạm, không cập nhật liên tục.</caption>
            <thead><tr><th scope="col">Tên bài kiểm tra</th><th scope="col">Hạn nộp</th><th scope="col">Ngưỡng đạt</th><th scope="col">Lượt nộp</th><th scope="col">Trạng thái</th><th scope="col">Thao tác</th></tr></thead>
            <tbody>{model.items.map((assignment, index) => (
              <tr className="tk-assignment-record" key={assignment.id}>
                <td className="tk-assignment-title" data-label="Tên bài kiểm tra"><span className="tk-record-position" aria-hidden="true">{String(model.start + index + 1).padStart(2, '0')}</span><strong>{assignment.title}</strong></td>
                <td data-label="Hạn nộp">{assignment.dueDate}</td>
                <td data-label="Ngưỡng đạt">{assignment.threshold}</td>
                <td data-label="Lượt nộp">{countStore
                  ? <SubmissionCount entry={counts[assignment.id]} assignment={assignment} onRetry={countStore.retry} />
                  : <span className="tk-count-state">{assignment.submission}</span>}</td>
                <td data-label="Trạng thái"><span className={`tk-assignment-status status-${assignment.statusCode?.toLowerCase() || 'unknown'}`}>{assignment.status}</span></td>
                <td data-label="Thao tác"><Link className="tk-record-link" to={`/classes/${classId}/assignments/${assignment.id}`} aria-label={`Xem chi tiết: ${assignment.title}`}>Xem chi tiết<span aria-hidden="true" className="tk-button-arrow" /></Link></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : <div className="tk-class-empty" role="status"><h3>{rows.length ? 'Không có bài kiểm tra phù hợp' : 'Chưa có bài kiểm tra nào'}</h3>
        <p>{rows.length ? 'Thử tên bài hoặc trạng thái khác trong dữ liệu đã tải.' : 'Tạo bài kiểm tra đầu tiên cho lớp này khi bạn đã sẵn sàng.'}</p>
        {rows.length > 0 && <button className="tk-button tk-button-secondary" type="button" onClick={clearBrowse}>Xóa tìm kiếm và bộ lọc</button>}
      </div>}
      {rows.length > 0 && <div className="tk-assignment-pagination" aria-live="polite">
        <span>{model.matchCount ? `${model.start + 1}–${model.end} / ${model.matchCount} kết quả đã tải` : '0 kết quả trong dữ liệu đã tải'}</span>
        {model.pageCount > 1 && <nav aria-label="Phân trang bài kiểm tra">
          <button className="tk-page-button" type="button" disabled={model.page === 1} onClick={() => setPage(model.page - 1)}>Trước</button>
          <span aria-current="page">Trang {model.page} / {model.pageCount}</span>
          <button className="tk-page-button" type="button" disabled={model.page === model.pageCount} onClick={() => setPage(model.page + 1)}>Sau</button>
        </nav>}
      </div>}
    </div>
  )
}
export default AssignmentArchive
