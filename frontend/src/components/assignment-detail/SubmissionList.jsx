import { useMemo, useState } from 'react'
import { buildSubmissionArchive } from '../../data/submissionArchive.js'
import { formatSubmissionAttempt } from '../../data/teacherSubmissionView.js'
import { finalStatusLabel, formatSubmissionDate } from './assignmentDetailView.js'

function submissionStatusLabel(submission) {
  if (submission.status === 'approved') {
    return `Đã chốt · ${finalStatusLabel(submission.finalStatus)}`
  }
  return 'Chờ giáo viên chốt'
}

export default function SubmissionList({ submissions, selectedId, onSelect }) {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const model = useMemo(() => buildSubmissionArchive({ submissions, query, page, selectedId }), [submissions, query, page, selectedId])
  const selected = submissions.find(row => row.id === selectedId)
  if (submissions.length === 0) {
    return <div className="table-empty assignment-submissions-empty">Chưa có bài nộp nào.</div>
  }

  return (
    <div className="tk-submission-archive">
      <label htmlFor="submission-archive-search">Tìm trong lượt nộp đã tải</label>
      <input id="submission-archive-search" type="search" value={query} placeholder="Tên, mã học sinh, lần nộp hoặc tên file" onChange={event => { setQuery(event.target.value); setPage(1) }} />
      {selected && <div className="tk-queue-current"><strong>Đang xem: {selected.studentName}</strong><span>{formatSubmissionAttempt(selected.attemptNumber)}</span>
        {!model.selectionVisible && <button type="button" onClick={() => { setQuery(''); setPage(model.selectedPage) }}>Hiển thị lượt đang xem</button>}
      </div>}
      <div className="submission-list teacher-submission-list" role="region" tabIndex={0} aria-label="Danh sách bài nộp của học sinh">
      {model.items.map((submission) => (
        <button
          aria-pressed={selectedId === submission.id}
          className={`submission-list-item teacher-submission-item${selectedId === submission.id ? ' submission-list-item-active teacher-submission-item-active' : ''}`}
          key={submission.id}
          onClick={() => onSelect(submission.id)}
          type="button"
        >
          <span className="submission-student-mark teacher-submission-mark" aria-hidden="true">
            {(submission.studentCode || submission.studentName).slice(-2)}
          </span>
          <span className="submission-list-main teacher-submission-main">
            <strong>{submission.studentName}</strong>
            <span>
              {[submission.studentCode, formatSubmissionAttempt(submission.attemptNumber)]
                .filter(Boolean)
                .join(' · ')}
            </span>
            <span>{submission.fileName} · {formatSubmissionDate(submission.submittedAt)}</span>
          </span>
          <span className={`submission-list-status teacher-submission-status${submission.status === 'approved' ? ' submission-list-status-approved teacher-submission-status-approved' : ''}`}>
            {submissionStatusLabel(submission)}
          </span>
        </button>
      ))}
      {model.items.length === 0 && <p role="status">Không có lượt nộp phù hợp trong dữ liệu đã tải.</p>}
      </div>
      <div className="tk-queue-pagination" aria-live="polite"><span>{model.matchCount ? `${model.start + 1}–${model.end} / ${model.matchCount} kết quả đã tải` : '0 kết quả'}</span>
        {model.pageCount > 1 && <nav aria-label="Phân trang lượt nộp"><button type="button" disabled={model.page === 1} onClick={() => setPage(model.page - 1)}>Trước</button><span>Trang {model.page}/{model.pageCount}</span><button type="button" disabled={model.page === model.pageCount} onClick={() => setPage(model.page + 1)}>Sau</button></nav>}
      </div>
    </div>
  )
}
