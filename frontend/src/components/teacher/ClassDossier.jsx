import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'

import { animateTeacherDossier } from './teacherMotion.js'

function displayValue(value) {
  return value === null || value === undefined || value === '' ? 'Chưa có dữ liệu' : value
}

function statusLabel(status) {
  return status === 'ACTIVE' ? 'Đang hoạt động' : 'Không hoạt động'
}

function ClassDossier({ selectedClass, selectedOutsideResults = false }) {
  const dossierRef = useRef(null)

  useEffect(() => {
    animateTeacherDossier(dossierRef.current)
  }, [selectedClass?.id])

  if (!selectedClass) {
    return (
      <article className="tk-dossier tk-dossier-empty" aria-live="polite">
        <p className="tk-dossier-kicker">HỒ SƠ ĐANG CHỜ</p>
        <h3>Chọn một lớp để mở hồ sơ</h3>
        <p>Các thông tin lớp được tải từ danh sách được phân công của bạn.</p>
      </article>
    )
  }

  const className = selectedClass.subject || selectedClass.name || 'Lớp chưa đặt tên'

  return (
    <article className="tk-dossier" ref={dossierRef}>
      <div className="tk-dossier-paper-edge" aria-hidden="true" />
      <div className="tk-dossier-topline">
        <p className="tk-dossier-kicker">HỒ SƠ LỚP / ĐÃ CHỌN</p>
        <span className="tk-dossier-mark" aria-hidden="true">EDU</span>
      </div>

      <header className="tk-dossier-heading">
        <span className="tk-dossier-code">{displayValue(selectedClass.code)}</span>
        <h3>{className}</h3>
        {selectedClass.name && selectedClass.name !== className && (
          <p className="tk-dossier-name">{selectedClass.name}</p>
        )}
      </header>

      <div className="tk-dossier-rule" aria-hidden="true" />

      <dl className="tk-dossier-meta">
        <div>
          <dt>Học kỳ</dt>
          <dd>{displayValue(selectedClass.semester)}</dd>
        </div>
        <div>
          <dt>Năm học</dt>
          <dd>{displayValue(selectedClass.schoolYear)}</dd>
        </div>
        <div>
          <dt>Trạng thái</dt>
          <dd>
            <span className="tk-status-dot" aria-hidden="true" />
            {statusLabel(selectedClass.status)}
          </dd>
        </div>
        <div>
          <dt>Quy mô</dt>
          <dd>{selectedClass.studentCount} học sinh</dd>
        </div>
        <div>
          <dt>Bài kiểm tra</dt>
          <dd>{selectedClass.assignmentCount}</dd>
        </div>
      </dl>

      {selectedOutsideResults && (
        <p className="tk-dossier-note" role="status">
          Hồ sơ đang mở không nằm trong kết quả tìm kiếm hiện tại.
        </p>
      )}

      <div className="tk-dossier-actions">
        <Link className="tk-button tk-button-primary" to={`/classes/${selectedClass.id}`}>
          <span>Mở lớp</span>
          <span className="tk-button-arrow" aria-hidden="true" />
        </Link>
      </div>
    </article>
  )
}

export default ClassDossier
