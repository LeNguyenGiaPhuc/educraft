/* eslint-disable react-refresh/only-export-components */
import { useMemo, useState, useSyncExternalStore } from 'react'
import { createRoot } from 'react-dom/client'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import AppShell from '../../../src/components/AppShell.jsx'
import AuthContext from '../../../src/contexts/AuthContext.js'
import ClassDetailView from '../../../src/components/teacher/ClassDetailView.jsx'
import { mapClassAssignment } from '../../../src/data/classAssignmentArchive.js'
import { createSubmissionCountStore } from '../../../src/data/submissionCountStore.js'
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
import '../../../src/styles/common-kinetic.css'

function Preview() {
  const [classId, setClassId] = useState('fixture-class')
  const [countStore] = useState(() => {
    const attempts = new Map()
    return createSubmissionCountStore({ listSubmissions: async id => {
      await new Promise(resolve => setTimeout(resolve, 250))
      const attempt = (attempts.get(id) ?? 0) + 1
      attempts.set(id, attempt)
      if (id === 'assignment-0' && attempt === 1) throw new Error('Fixture error; retry succeeds')
      return Array.from({ length: Number(id.split('-').at(-1)) % 31 }, () => ({}))
    } })
  })
  useSyncExternalStore(countStore.subscribe, countStore.getSnapshot, countStore.getSnapshot)
  const [count, setCount] = useState(20)
  const [studentCount, setStudentCount] = useState(30)
  const [status, setStatus] = useState('success')
  const [longText, setLongText] = useState(false)
  const [activeTab, setActiveTab] = useState('assignments')
  const snapshot = useMemo(() => ({
    status, message: 'Lỗi mạng giả lập. Không gọi API trong fixture.',
    classroom: { id: classId, code: longText ? 'LỚP-CHUYÊN-ĐỀ-LỊCH-SỬ-VĂN-HÓA-VIỆT-NAM-2026' : classId === 'fixture-class' ? '11A2' : '12A3', name: 'Lịch sử 11A2', subject: 'Lịch sử', semester: 'Học kỳ 1', schoolYear: '2026–2027', status: 'ACTIVE', studentCount, assignmentCount: count,
      students: Array.from({ length: studentCount }, (_, i) => ({ id: `student-${i}`, number: i + 1, code: `HS-${i + 1}`, name: longText ? `Nguyễn Hoàng Minh Anh tên dài kiểm thử ${i + 1}` : `Học sinh ${i + 1}`, latestSubmission: 'Chưa có dữ liệu' })) },
    assignments: Array.from({ length: count }, (_, i) => mapClassAssignment({ id: `assignment-${i}`, title: longText ? `Một số vấn đề chung về cách mạng tư sản — bài kiểm tra đọc hiểu, phân tích và đối chiếu tài liệu ${i + 1}` : `Bài kiểm tra Lịch sử Việt Nam ${i + 1}`, due_at: '2026-10-20T10:00:00Z', coverage_threshold: 80, status: ['OPEN', 'DRAFT', 'CLOSED'][i % 3] }, i % 7 === 0 ? undefined : i % 31)),
  }), [count, studentCount, status, longText, classId])
  return <AuthContext.Provider value={{ user: { id: 'fixture-teacher', name: 'Trần Gia Phúc', role: 'TEACHER' }, isAuthenticated: true, isLoading: false, logout: async () => undefined }}>
    <details style={{ padding: '8px 16px', background: '#f7f5e9' }}><summary>Fixture Phase 2.1 · count request giả lập 250ms · không gọi API thật</summary>
      <label>Lớp <select value={classId} onChange={event => setClassId(event.target.value)}><option>fixture-class</option><option>fixture-class-b</option></select></label>
      <label>Bài kiểm tra <select value={count} onChange={event => setCount(Number(event.target.value))}>{[0, 1, 25, 100, 500].map(n => <option key={n}>{n}</option>)}</select></label>
      <label> Học sinh <select value={studentCount} onChange={event => setStudentCount(Number(event.target.value))}>{[0, 30, 300].map(n => <option key={n}>{n}</option>)}</select></label>
      <label> Trạng thái <select value={status} onChange={event => setStatus(event.target.value)}><option value="success">Có dữ liệu</option><option value="loading">Đang tải</option><option value="error">Lỗi</option></select></label>
      <label><input type="checkbox" checked={longText} onChange={event => setLongText(event.target.checked)} /> Tên dài</label>
      <p>Chỉ số giả lập: {JSON.stringify(countStore.stats())}. Bài đầu lỗi lần đầu để kiểm thử Thử lại.</p>
    </details>
    <MemoryRouter initialEntries={['/classes/fixture-class']}><Routes><Route element={<AppShell />}>
      <Route path="/classes/fixture-class" element={<ClassDetailView key={classId} state={snapshot} activeTab={activeTab} onTabChange={setActiveTab} countStore={countStore} />} />
      <Route path="*" element={<main className="teacher-page" style={{ padding: 32 }}><h1>Đích liên kết kiểm thử</h1><p>Không thay thế route production.</p><Link to="/classes/fixture-class">Về hồ sơ lớp fixture</Link></main>} />
    </Route></Routes></MemoryRouter>
  </AuthContext.Provider>
}
const root = import.meta.hot?.data.root ?? createRoot(document.getElementById('root'))
if (import.meta.hot) import.meta.hot.data.root = root
root.render(<Preview />)
