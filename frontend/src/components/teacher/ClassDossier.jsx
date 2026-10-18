import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { animateTeacherDossier } from './teacherMotion.js'

function displayValue(value) { return value === null || value === undefined || value === '' ? 'Chưa có dữ liệu' : value }
function ClassDossier({ selectedClass, selectedOutsideResults = false }) {
  const backplateRef = useRef(null)
  useEffect(() => animateTeacherDossier(backplateRef.current), [selectedClass?.id])
  if (!selectedClass) return null
  const subject = selectedClass.subject || selectedClass.name || 'Lớp chưa đặt tên'
  return (
    <article className="tk-dossier" id="teacher-class-dossier" aria-label={`Hồ sơ lớp ${selectedClass.code || subject}`}>
      <div className="tk-paper-underlay" aria-hidden="true" />
      <div className="tk-paper-backplate" ref={backplateRef} aria-hidden="true" />
      <div className="tk-dossier-content">
        <div className="tk-dossier-topline">
          <span className="tk-dossier-selection" aria-live="polite">Đang chọn · {displayValue(selectedClass.code)}</span>
          <span className={`tk-class-status${selectedClass.status === 'ACTIVE' ? ' is-active' : ''}`}>
            {selectedClass.status === 'ACTIVE' ? 'Đang hoạt động' : 'Không hoạt động'}</span>
        </div>
        <div className="tk-dossier-body">
          <div className="tk-dossier-identity">
            <h2 className="tk-dossier-code">{displayValue(selectedClass.code)}</h2><h3>{subject}</h3>
            {selectedClass.name && selectedClass.name !== subject && selectedClass.name !== `${subject} ${selectedClass.code}`
              && <p className="tk-dossier-name">{selectedClass.name}</p>}
          </div>
          <dl className="tk-dossier-meta">
            <div><dt>Học kỳ</dt><dd>{displayValue(selectedClass.semester)}</dd></div>
            <div><dt>Năm học</dt><dd>{displayValue(selectedClass.schoolYear)}</dd></div>
            <div className="tk-dossier-quantity"><dt>Học sinh</dt><dd>{selectedClass.studentCount}</dd></div>
            <div className="tk-dossier-quantity"><dt>Bài kiểm tra</dt><dd>{selectedClass.assignmentCount}</dd></div>
          </dl>
        </div>
        {selectedOutsideResults && <p className="tk-dossier-note" role="status">Hồ sơ đang mở không nằm trong kết quả tìm kiếm hiện tại.</p>}
        <div className="tk-dossier-footer"><span>Hồ sơ lớp được phân công</span>
          <Link className="tk-button tk-button-primary" to={`/classes/${selectedClass.id}`}>
            <span>Mở lớp</span><span className="tk-button-arrow" aria-hidden="true" /></Link>
        </div>
      </div>
    </article>
  )
}
export default ClassDossier
