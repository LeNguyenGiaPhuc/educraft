import { Link } from 'react-router-dom'

import { useAuth } from '../contexts/useAuth.js'

function StudentHomePage() {
  const { user } = useAuth()

  return (
    <main className="page-content">
      <div className="page-container">
        <section className="dashboard-heading">
          <div>
            <h1>Chao {user?.name ?? 'hoc sinh'}</h1>
            <p>Cac bai nop mock cua hoc sinh duoc dat trong khong gian rieng theo vai tro.</p>
          </div>
        </section>

        <section className="state-panel student-home-panel">
          <p className="state-kicker">Goc hoc sinh</p>
          <h2>Bai kiem tra dang mo</h2>
          <p>Mo nhanh bai kiem tra mau de thu luong nop bai va trang thai thanh cong/loi.</p>
          <Link className="button button-primary" to="/student/assignments/nam-xuong">
            Mo bai nop mau
          </Link>
        </section>
      </div>
    </main>
  )
}

export default StudentHomePage
