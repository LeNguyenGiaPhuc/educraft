/* eslint-disable react-refresh/only-export-components */
// Disposable synthetic transport; this entry is never imported by production.
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import AppShell from '../../../src/components/AppShell.jsx'
import AuthContext from '../../../src/contexts/AuthContext.js'
import { AssignmentDetailWorkspace } from '../../../src/pages/AssignmentDetailPage.jsx'
import TeacherPendingState from '../../../src/components/teacher/TeacherPendingState.jsx'
import PageErrorState from '../../../src/components/PageErrorState.jsx'
import { aiEvaluationService } from '../../../src/services/aiEvaluationService.js'
import { submissionService } from '../../../src/services/submissionService.js'
import { referenceService } from '../../../src/services/referenceService.js'
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

let mode = 'absent', transport = 'success', release, metrics = { get: 0, post: 0, finalize: 0, reference: 0 }
const evaluations = new Map()
async function request() {
  if (transport === 'pending') await new Promise(resolve => { release = resolve })
  if (transport === 'error') throw new Error('Lỗi transport giả lập. Có thể thử lại; dữ liệu nhập được giữ nguyên.')
}
const result = { suggested_status: 'COMPLETED', confidence: .84, coverage_score: 82, missing_content: ['Cần làm rõ kết luận.'], feedback_draft: 'Bài làm đầy đủ phần kinh tế và chính trị. Cần bổ sung kết luận.', reference_transcription: 'Tài liệu bài mẫu giả lập. '.repeat(60), student_transcription: 'Bản chép bài nộp giả lập. '.repeat(80), uncertain_content: Array.from({length: 100}, (_, i) => ({ source: 'submission', page: 1, text: `Đoạn cần xem lại ${i + 1}`, reason: 'Chữ mờ trong fixture.' })) }
aiEvaluationService.getEvaluation = async id => { metrics.get++; await request(); if (evaluations.has(id)) return evaluations.get(id); if (mode === 'saved') return result; throw Object.assign(new Error('Chưa có đánh giá AI.'), { status: 404 }) }
aiEvaluationService.createEvaluation = async id => { metrics.post++; await request(); evaluations.set(id, result); return result }
submissionService.finalizeSubmission = async (id, input) => { metrics.finalize++; await request(); return { id, teacher_review: input } }
referenceService.uploadReference = async () => { metrics.reference++; await request(); return {} }
referenceService.replaceReference = async () => { metrics.reference++; await request(); return {} }
referenceService.deleteReference = async () => { metrics.reference++; await request(); return {} }
const documentUrl = './synthetic-document.svg'
const submissions = n => Array.from({ length: n }, (_, i) => ({ id: `attempt-${i}`, studentName: i % 2 ? 'Nguyễn Hoàng Minh Anh' : 'Trần Gia Phúc', studentCode: `HS-${Math.floor(i / 3)}`, attemptNumber: i % 3 + 1, fileName: i === 0 ? 'Bài ghi lịch sử — tên tài liệu dài cần giữ nguyên toàn bộ thông tin.png' : `bai-nop-${i}.png`, fileUrl: documentUrl, submittedAt: '2026-10-14T08:00:00Z', status: 'submitted', feedback: '' }))
function Preview() {
  const [count, setCount] = useState(30)
  const [referenceCount, setReferenceCount] = useState(3)
  const [epoch, setEpoch] = useState(0)
  const [view, setView] = useState('detail')
  const [refreshes, setRefreshes] = useState(0)
  const detail = { id: `fixture-assignment-${epoch}`, title: 'Một số vấn đề chung về cách mạng tư sản', classroom: { id: 'fixture-class', name: 'Lịch sử 11A2' }, dueDate: '18:00 20/11/2026 (UTC+07:00)', dueAt: '2026-11-20T11:00:00Z', coverageThreshold: 80, threshold: '80%', status: 'OPEN', statusLabel: 'Đang mở', submissions: submissions(count), references: Array.from({length: referenceCount}, (_, i) => ({ id: `reference-${i}`, fileName: `Bài mẫu tham khảo lịch sử Việt Nam — tài liệu kiểm thử ${i + 1}.png`, url: documentUrl, uploadedAt: '2026-10-14T08:00:00Z' })) }
  return <AuthContext.Provider value={{ user: { role: 'TEACHER', name: 'Giáo viên kiểm thử' }, logout: async () => undefined }}><MemoryRouter>
    <details style={{ padding: '8px 16px', background: '#f7f5e9' }}><summary>Fixture Teacher final — dữ liệu tổng hợp, không gọi API thật</summary>
      <label>Lượt nộp <select value={count} onChange={e => { setCount(Number(e.target.value)); setEpoch(epoch + 1) }}>{[0,1,30,300,1000].map(n => <option key={n}>{n}</option>)}</select></label>
      <label> Bài mẫu <select value={referenceCount} onChange={e => setReferenceCount(Number(e.target.value))}>{[0,1,3,100].map(n => <option key={n}>{n}</option>)}</select></label>
      <label> AI GET <select onChange={e => { mode = e.target.value; setEpoch(epoch + 1) }}><option value="absent">404 chưa phân tích</option><option value="saved">Đã lưu đề xuất</option></select></label>
      <label> Response <select onChange={e => { transport = e.target.value }}><option value="success">Thành công</option><option value="error">Lỗi</option><option value="pending">Chờ hoàn tất thủ công</option></select></label>
      <button type="button" onClick={() => { release?.(); setRefreshes(refreshes + 1) }}>Hoàn tất request giả lập</button>
      <label> View <select value={view} onChange={e => setView(e.target.value)}><option value="detail">Chi tiết</option><option value="pending">Loading</option><option value="error">Error</option></select></label>
      <p>Transport giả lập: {JSON.stringify(metrics)} · refresh {refreshes}</p>
    </details>
    <AppShell>{view === 'pending' ? <TeacherPendingState /> : view === 'error' ? <PageErrorState title="Không thể mở bài kiểm tra" message="Lỗi mạng giả lập. Quyền và dữ liệu chưa được xác minh." returnTo="/teacher" /> : <main className="page-content assignment-detail-page teacher-assignment-detail-page"><div className="page-container"><AssignmentDetailWorkspace key={detail.id} detail={detail} onRefresh={() => { setRefreshes(v => v + 1) }} /></div></main>}</AppShell>
  </MemoryRouter></AuthContext.Provider>
}
const root = import.meta.hot?.data.root ?? createRoot(document.getElementById('root'))
if (import.meta.hot) import.meta.hot.data.root = root
root.render(<Preview />)
