/* eslint-disable react-refresh/only-export-components */
// Synthetic authentication transport only; never imported by production.
import { useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import '../../../src/index.css'
import '../../../src/App.jsx' // Load the actual production CSS graph/order without mounting App.
import AuthContext from '../../../src/contexts/AuthContext.js'
import LoginPage from '../../../src/pages/LoginPage.jsx'
import CommonPendingState from '../../../src/components/CommonPendingState.jsx'
import PageErrorState from '../../../src/components/PageErrorState.jsx'

function Fixture() {
  const [view, setView] = useState('login')
  const [mode, setMode] = useState('error')
  const pending = useRef(null)
  const result = success => success
    ? { status: 'success', data: { role: 'STUDENT' } }
    : { status: 'error', message: 'Không thể đăng nhập. Kiểm tra tài khoản và mật khẩu rồi thử lại.' }
  const auth = { user: null, isLoading: false, async login() {
    if (mode === 'pending') return new Promise(resolve => { pending.current = resolve })
    return result(mode === 'success')
  } }
  return <AuthContext.Provider value={auth}><MemoryRouter>
    <details style={{ padding: 12, background: '#f7f5e9', color: '#182b37' }}>
      <summary>Fixture Phase 9 — dữ liệu tổng hợp, không gọi API thật</summary>
      <label>Màn <select value={view} onChange={event => setView(event.target.value)}>{['login','pending','error','not-found'].map(value => <option key={value}>{value}</option>)}</select></label>
      <label> Response <select value={mode} onChange={event => setMode(event.target.value)}>{['error','pending','success'].map(value => <option key={value}>{value}</option>)}</select></label>
      <button type="button" onClick={() => pending.current?.(result(true))}>Xác nhận response thành công giả lập</button>
    </details>
    {view === 'login' ? <LoginPage /> : view === 'pending' ? <CommonPendingState message="Đang kiểm tra phiên đăng nhập…" /> : <PageErrorState standalone title={view === 'not-found' ? 'Trang không tồn tại' : 'Không thể mở không gian làm việc'} message="Lỗi kết nối giả lập. Thử mở lại trang sau khi kiểm tra kết nối mạng." returnTo="/login" />}
  </MemoryRouter></AuthContext.Provider>
}
createRoot(document.getElementById('root')).render(<Fixture />)
