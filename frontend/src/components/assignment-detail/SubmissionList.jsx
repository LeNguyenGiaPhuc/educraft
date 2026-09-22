import { formatSubmissionAttempt } from '../../data/teacherSubmissionView.js'
import { finalStatusLabel, formatSubmissionDate } from './assignmentDetailView.js'

function submissionStatusLabel(submission) {
  if (submission.status === 'approved') {
    return `Đã chốt · ${finalStatusLabel(submission.finalStatus)}`
  }
  return 'Chờ giáo viên chốt'
}

export default function SubmissionList({ submissions, selectedId, onSelect }) {
  if (submissions.length === 0) {
    return <div className="table-empty assignment-submissions-empty">Chưa có bài nộp nào.</div>
  }

  return (
    <div className="submission-list teacher-submission-list" aria-label="Danh sách bài nộp của học sinh">
      {submissions.map((submission) => (
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
    </div>
  )
}
