/* eslint-disable react-refresh/only-export-components */
import { useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Link, MemoryRouter, Route, Routes, useParams } from 'react-router-dom'
import AppShell from '../../../src/components/AppShell.jsx'
import AuthContext from '../../../src/contexts/AuthContext.js'
import TeacherOverview from '../../../src/components/teacher/TeacherOverview.jsx'
import { mapTeacherClass } from '../../../src/services/teacherClassService.js'
// Exactly the production main.jsx + App.jsx CSS order, including the reset.
import '../../../src/index.css'
import '../../../src/App.css'
import '../../../src/styles/tokens.css'
import '../../../src/styles/shells.css'
import '../../../src/styles/login.css'
import '../../../src/styles/admin.css'
import '../../../src/styles/teacher.css'
import '../../../src/styles/student.css'
import '../../../src/styles/blueprint.css'
import '../../../src/styles/teacher-kinetic.css'
import '../../../src/styles/teacher-final-states.css'

const subjects = ['Ngữ văn', 'Lịch sử', 'Địa lý', 'Giáo dục công dân']
function fixtureClasses(count, longLabels) {
  return Array.from({ length: count }, (_, index) => mapTeacherClass({
    id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    code: longLabels && index === 0 ? 'LỚP-CHUYÊN-ĐỀ-LỊCH-SỬ-VĂN-HÓA-VIỆT-NAM-2026' : `${10 + (index % 3)}A${1 + (index % 4)}`,
    subject: longLabels && index === 0 ? 'Lịch sử văn hóa và các nền văn minh Việt Nam qua nhiều thời kỳ' : subjects[index % 4],
    semester: index % 2 ? 'Học kỳ 2' : 'Học kỳ 1',
    school_year: index % 3 ? '2026–2027' : '2025–2026',
    status: index % 9 === 0 ? 'INACTIVE' : 'ACTIVE',
    student_count: 24 + (index % 11),
    assignment_count: index % 7,
  }))
}
function FixtureDestination({ createAssignment = false }) {
  const { classId } = useParams()
  return <div className="teacher-kinetic-overview" style={{ padding: 32 }}>
    <h1>{createAssignment ? 'Đã mở đường dẫn tạo bài kiểm tra' : 'Đã mở đường dẫn lớp'}</h1>
    {classId && <p>{classId}</p>}
    <p>Đích kiểm thử navigation; không phải màn production, không gọi API.</p>
    <Link to="/teacher">Về fixture Tổng quan</Link>
  </div>
}
function PreviewApp() {
  const [count, setCount] = useState(3)
  const [status, setStatus] = useState('success')
  const [longLabels, setLongLabels] = useState(false)
  const data = useMemo(() => fixtureClasses(count, longLabels), [count, longLabels])
  const authValue = {
    user: { id: 'fixture-teacher', role: 'TEACHER', name: 'Trần Gia Phúc', email: 'teacher@example.test' },
    isLoading: false, isAuthenticated: true,
    logout: async () => undefined,
  }
  return (
    <AuthContext.Provider value={authValue}>
      <details style={{ padding: '8px 16px', background: '#f7f5e9', fontSize: 12 }}>
        <summary>Kiểm thử Phase 1.1 · dữ liệu tổng hợp · không gọi API</summary>
        <label htmlFor="fixture-count">Số lớp: </label>
        <select id="fixture-count" value={count} onChange={(event) => setCount(Number(event.target.value))}>
          {[0, 1, 3, 12, 50, 100, 125].map(value => <option key={value}>{value}</option>)}
        </select>
        <label htmlFor="fixture-status"> Trạng thái: </label>
        <select id="fixture-status" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="success">Có dữ liệu</option><option value="loading">Đang tải</option><option value="error">Lỗi tải</option>
        </select>
        <label><input type="checkbox" checked={longLabels} onChange={(event) => setLongLabels(event.target.checked)} /> Tên và mã lớp dài</label>
      </details>
      <MemoryRouter initialEntries={['/teacher']}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/teacher" element={<TeacherOverview snapshot={{ status, data, message: 'Lỗi mạng giả lập trong fixture.' }} onRetry={() => setStatus('success')} />} />
            <Route path="/classes/:classId" element={<FixtureDestination />} />
            <Route path="/assignments/new" element={<FixtureDestination createAssignment />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  )
}
const root = import.meta.hot?.data.root ?? createRoot(document.getElementById('root'))
if (import.meta.hot) import.meta.hot.data.root = root
root.render(<PreviewApp />)
