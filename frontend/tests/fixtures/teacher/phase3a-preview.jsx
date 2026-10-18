/* eslint-disable react-refresh/only-export-components */
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import AppShell from '../../../src/components/AppShell.jsx'
import AuthContext from '../../../src/contexts/AuthContext.js'
import { CreateAssignmentWorkspace, CreateAssignmentError } from '../../../src/pages/CreateAssignmentPage.jsx'
import AssignmentEditor from '../../../src/components/assignment-detail/AssignmentEditor.jsx'
import { assignmentService } from '../../../src/services/assignmentService.js'
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

let transport = 'success', finishRequest
async function syntheticRequest(input) {
  if (transport === 'pending') await new Promise(resolve => { finishRequest = resolve })
  if (transport === 'error') throw new Error('Lỗi máy chủ giả lập; dữ liệu nhập được giữ lại.')
  return input
}
// Test-only service replacement, not imported by production; no API requests.
assignmentService.createAssignment = async (classId, input) => ({ ...await syntheticRequest(input), id: 'fixture-assignment', class_id: classId })
assignmentService.updateAssignment = async (_id, input) => syntheticRequest(input)
const classrooms = Array.from({ length: 125 }, (_, i) => ({ id: `fixture-class-${i}`, name: i ? `Lịch sử văn hóa và các nền văn minh Việt Nam qua nhiều thời kỳ — lớp chuyên đề ${i}` : 'Lịch sử 11A2', studentCount: 30 }))
function Preview() {
  const [mode, setMode] = useState('create')
  const [saved, setSaved] = useState(false)
  return <AuthContext.Provider value={{ user: { role: 'TEACHER', name: 'Giáo viên kiểm thử' }, logout: async () => undefined }}>
    <details style={{ padding: '8px 16px', background: '#f7f5e9' }}><summary>Fixture3A ·125 lớp tổng hợp · không gọi API</summary>
      <label>Màn hình <select value={mode} onChange={e => { setMode(e.target.value); setSaved(false) }}><option value="create">Tạo</option><option value="edit">Sửa</option><option value="error">Lỗi tải</option></select></label>
      <label> Response <select onChange={e => { transport = e.target.value }}><option value="success">Thành công</option><option value="error">Lỗi</option><option value="pending">Chờ hoàn tất thủ công</option></select></label>
      <button onClick={() => finishRequest?.()} type="button">Hoàn tất request giả lập</button>
    </details>
    <MemoryRouter><Routes><Route element={<AppShell />}><Route path="*" element={mode === 'error' ? <CreateAssignmentError message="Lỗi tải danh sách lớp giả lập." /> : <main className="page-content teacher-create-page tk-assignment-create"><div className="page-container">
      {mode === 'create' ? <CreateAssignmentWorkspace classId={classrooms[0].id} classroom={classrooms[0]} classrooms={classrooms} /> : saved ? <p role="status">Đã lưu thay đổi giả lập.</p> : <section className="assignment-detail-hero teacher-assignment-hero"><AssignmentEditor assignment={{ id: 'fixture-assignment', title: 'Một số vấn đề chung về cách mạng tư sản', dueAt: '2026-11-20T10:00:00Z', coverageThreshold: 80, status: 'OPEN' }} onSaved={() => setSaved(true)} onCancel={() => setMode('create')} /></section>}
    </div></main>} /></Route></Routes></MemoryRouter>
  </AuthContext.Provider>
}
const root = import.meta.hot?.data.root ?? createRoot(document.getElementById('root'))
if (import.meta.hot) import.meta.hot.data.root = root
root.render(<Preview />)
