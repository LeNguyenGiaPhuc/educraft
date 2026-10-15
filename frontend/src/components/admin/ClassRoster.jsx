import RegistryPagination from './RegistryPagination.jsx'

export default function ClassRoster({ students, query, setQuery, page, onRemove }) {
 return (
      <section className="admin-panel">
        <div className="admin-panel-heading">
          <div>
            <h2>Danh sách học sinh <span className="admin-count-badge">{students.length}</span></h2>
            <p className="admin-section-note">Thêm từng học sinh hoặc nhập danh sách đã kiểm tra từ file Excel.</p>
          </div>
          <label className="search-box compact">
            <span>Tìm kiếm</span>
            <input value={query} placeholder="Tìm kiếm theo tên tài khoản hoặc tên học sinh..." onChange={(event) => setQuery(event.target.value)} />
          </label>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>STT</th>
                <th>Tên tài khoản</th>
                <th>Họ tên</th>
                <th>Email</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {page.total === 0 ? (
                <tr><td colSpan="6" className="empty-row">{query ? 'Không tìm thấy học sinh phù hợp.' : 'Lớp này chưa có học sinh.'}</td></tr>
              ) : page.items.map((student) => (
                <tr key={student.id} data-record-id={student.id}>
                  <td data-label="STT">{student.importedStudentNumber ?? '—'}</td>
                  <td data-label="Tên tài khoản"><strong>{student.username}</strong></td>
                  <td data-label="Họ tên">{student.name}</td>
                  <td data-label="Email">{student.email ?? '—'}</td>
                  <td data-label="Trạng thái"><span className={`status-badge status-${student.status ?? 'active'}`}>
                    {student.status === 'pending' ? 'Chờ kích hoạt' : student.status === 'locked' ? 'Khóa' : 'Hoạt động'}
                  </span></td>
                  <td data-label="Thao tác">
                    <button className="button button-ghost" type="button" onClick={() => onRemove(student)}>Gỡ khỏi lớp</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <RegistryPagination view={page} label="Phân trang thành viên lớp" />
      </section>
 )
}

