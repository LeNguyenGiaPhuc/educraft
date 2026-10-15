/* eslint-disable react-refresh/only-export-components */
// Synthetic UI fixture, never imported by production. No real API or login.
// Assignment statusTone mirrors the production Student response adapter.
import { useState, useMemo } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import AuthContext from '../../../src/contexts/AuthContext.js'
import AppShell from '../../../src/components/AppShell.jsx'
import StudentLearningArchive from '../../../src/components/student/StudentLearningArchive.jsx'
import StudentPendingState from '../../../src/components/student/StudentPendingState.jsx'
import PageErrorState from '../../../src/components/PageErrorState.jsx'
import { StudentSubmissionWorkspace, StudentSubmissionForm, SubmissionHistory } from '../../../src/pages/StudentSubmissionPage.jsx'
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

const id = i => `00000000-0000-4000-8000-${String(i + 1).padStart(12,'0')}`
let metrics = { get: 0, post: 0 }, transport = 'success', release
const attempt = i => ({ id: id(i), assignment_id: 'fixture-assignment', attempt_number: i + 1, status: i % 3 === 0 ? 'FINALIZED' : 'SUBMITTED', submitted_at: '2026-10-14T10:00:00Z', files: [{ original_filename: `Bài ghi lịch sử — tên tài liệu đầy đủ lần ${i + 1}.png`, size_bytes: 50 }], teacher_result: i % 3 === 0 ? { final_status: i % 2 ? 'NEEDS_COMPLETION' : 'COMPLETED', feedback: 'Bài ghi đã trình bày nội dung chính. Cần lưu ý cách tổ chức dẫn chứng và phần kết luận. '.repeat(20) } : null })
const baseAssignment = { id: 'fixture-assignment', title: 'Một số vấn đề chung về cách mạng tư sản', status: 'OPEN', statusTone: 'active', statusLabel: 'Đang mở', dueAt: '2027-01-01T10:00:00Z', classroom: { name: 'Lịch sử 11A2' } }
async function response() { if (transport === 'pending') await new Promise(resolve => { release = resolve }); if (transport === 'error') throw new Error('Mất kết nối giả lập. File đã chọn được giữ để thử lại.') }

function Preview() {
  const [count,setCount] = useState(3), [assignments,setAssignments] = useState(25), [history,setHistory] = useState(20), [view,setView] = useState('archive'), [long,setLong] = useState(false), [epoch,setEpoch] = useState(0), [refresh,setRefresh] = useState(0)
  const classes = useMemo(() => Array.from({ length: count }, (_, i) => ({ id: id(i), code: long ? 'LỚP-CHUYÊN-ĐỀ-LỊCH-SỬ-VĂN-HÓA-VIỆT-NAM-2026' : `${i % 3 + 10}A${i + 1}`, subject: i % 2 ? 'Địa lý' : 'Lịch sử', semester: 'Học kỳ 1', schoolYear: '2026–2027', assignments: Array.from({ length: assignments }, (_, j) => ({ ...baseAssignment, id: `assignment-${i}-${j}`, title: long ? 'Bài kiểm tra lịch sử văn hóa và cách mạng tư sản — nội dung đầy đủ không được cắt mất '.repeat(3) : j % 2 ? 'Bài ghi — Kinh tế và chính trị' : 'Cách mạng tư sản', status: j % 3 ? 'OPEN' : 'CLOSED', statusTone: j % 3 ? 'active' : 'closed', statusLabel: j % 3 ? 'Đang mở' : 'Đã đóng' })) })), [count,assignments,long])
  const service = useMemo(() => ({
    async listMySubmissions(assignmentId) { metrics.get++; if (assignmentId !== baseAssignment.id) throw new Error('Sai fixture assignment'); await response(); return Array.from({ length: history }, (_, i) => attempt(i)) },
    async createSubmission(assignmentId,file,name) { metrics.post++; if (assignmentId !== baseAssignment.id || !file || !name) throw new Error('Sai fixture upload'); await response(); return { ...attempt(history), status: 'SUBMITTED', teacher_result: null, files: [{ original_filename: name, size_bytes: file.size }] } },
  }), [history])
  const assignment = { ...baseAssignment, title: long ? baseAssignment.title.repeat(4) : baseAssignment.title }
  const mappedHistory = Array.from({ length: history }, (_, i) => ({ id: id(i), attemptNumber: i + 1, status: 'approved', fileName: 'Bài ghi lịch sử — tài liệu có tên rất dài cần giữ nguyên đầy đủ.png', submittedAt: '2026-10-14T10:00:00Z', result: { finalStatus: 'completed', feedback: 'Nhận xét đầy đủ của giáo viên. '.repeat(100) } }))
  return <AuthContext.Provider value={{ user: { id: 'fixture-student', role: 'STUDENT', name: 'Học sinh kiểm thử' }, logout: async () => undefined }}><MemoryRouter>
    <details style={{ padding: '8px 16px', background: '#f7f5e9' }}><summary>Fixture Student Phase7 — dữ liệu tổng hợp, không gọi API thật</summary>
      <label>Lớp <select value={count} onChange={e => setCount(Number(e.target.value))}>{[0,1,3,12,50,125].map(n => <option key={n}>{n}</option>)}</select></label>
      <label> Bài <select value={assignments} onChange={e => setAssignments(Number(e.target.value))}>{[0,1,25,100,500].map(n => <option key={n}>{n}</option>)}</select></label>
      <label> Lịch sử <select value={history} onChange={e => { setHistory(Number(e.target.value)); setEpoch(epoch + 1) }}>{[0,1,20,100,1000].map(n => <option key={n}>{n}</option>)}</select></label>
      <label> Màn <select value={view} onChange={e => { setView(e.target.value); setEpoch(epoch + 1) }}>{['archive','workspace','pending','error','closed','upload-pending','upload-error','history'].map(n => <option key={n}>{n}</option>)}</select></label>
      <label> Response <select onChange={e => { transport = e.target.value }}>{['success','pending','error'].map(n => <option key={n}>{n}</option>)}</select></label>
      <label> Tên dài <input type="checkbox" checked={long} onChange={e => setLong(e.target.checked)} /></label>
      <button type="button" onClick={() => { release?.(); setRefresh(refresh + 1) }}>Hoàn tất request giả lập</button>
      <button type="button" onClick={() => { setEpoch(epoch + 1); setRefresh(refresh + 1) }}>Mở session mới</button>
      <p>Transport giả lập: {JSON.stringify(metrics)} · refresh {refresh}</p>
    </details>
    <AppShell>{view === 'pending' ? <StudentPendingState /> : view === 'error' ? <PageErrorState title="Không thể mở bài kiểm tra" message="Lỗi mạng giả lập. Dữ liệu chưa được xác minh." returnTo="/student" /> : <main className="page-content student-page"><div className="page-container">
      {view === 'archive' ? <><header className="sf-workspace-heading"><div><h1>Hồ sơ học tập</h1><p>Học sinh kiểm thử · Chọn lớp và mở bài kiểm tra để nộp bài ghi.</p></div><span>{count} lớp đã tải</span></header><StudentLearningArchive classes={classes} /></> : view === 'workspace' || view === 'closed' ? <StudentSubmissionWorkspace key={`${epoch}:${view}`} assignment={view === 'closed' ? { ...assignment, status: 'CLOSED', statusTone: 'closed' } : assignment} service={service} /> : <div style={{ paddingTop: 48 }}>{view === 'history' ? <SubmissionHistory submissions={mappedHistory} status="success" /> : <StudentSubmissionForm assignment={assignment} availability={{ isOpen: true }} form={{ fileName: 'Bài ghi đã chọn — tên tài liệu đầy đủ.png' }} errors={{}} request={view === 'upload-pending' ? { status: 'loading' } : { status: 'error', message: 'Lỗi upload giả lập; ảnh đã chọn được giữ nguyên.' }} onFileChange={() => {}} onSubmit={e => e.preventDefault()} />}</div>}
    </div></main>}</AppShell>
  </MemoryRouter></AuthContext.Provider>
}
const root = import.meta.hot?.data.root ?? createRoot(document.getElementById('root'))
if (import.meta.hot) import.meta.hot.data.root = root
root.render(<Preview />)
