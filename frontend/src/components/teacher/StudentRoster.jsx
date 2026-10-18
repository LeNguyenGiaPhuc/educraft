function StudentRoster({ rows, studentCount }) {
  return (
    <div className="tk-student-roster">
      <div className="tk-class-section-heading"><div><h2>Danh sách học sinh ({studentCount})</h2><p>Danh sách chỉ đọc · {rows.length} hồ sơ học sinh đã tải.</p></div></div>
      {rows.length ? <div className="tk-class-table-scroll tk-roster-scroll" role="region" aria-label="Danh sách học sinh chỉ đọc" tabIndex={0}>
        <table className="tk-class-table tk-roster-table">
          <caption className="visually-hidden">Học sinh trong lớp được phân công. Giáo viên chỉ xem danh sách.</caption>
          <thead><tr><th scope="col">STT</th><th scope="col">Họ và tên</th><th scope="col">Mã học sinh</th><th scope="col">Bài nộp gần nhất</th></tr></thead>
          <tbody>{rows.map((student, index) => <tr key={student.id ?? student.code}>
            <td data-label="STT">{student.number ?? String(index + 1).padStart(2, '0')}</td>
            <td data-label="Họ và tên"><strong>{student.name}</strong></td>
            <td data-label="Mã học sinh">{student.code}</td>
            <td data-label="Bài nộp gần nhất">{student.latestSubmission}</td>
          </tr>)}</tbody>
        </table>
      </div> : <div className="tk-class-empty" role="status"><h3>Chưa có dữ liệu học sinh</h3><p>Học sinh được ghi danh trong lớp sẽ xuất hiện ở đây.</p></div>}
    </div>
  )
}
export default StudentRoster
