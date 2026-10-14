/* eslint-disable react-refresh/only-export-components */

import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import AppShell from '../../../src/components/AppShell.jsx'
import AuthContext from '../../../src/contexts/AuthContext.js'
import ClassArchive from '../../../src/components/teacher/ClassArchive.jsx'
import '../../../src/App.css'
import '../../../src/styles/tokens.css'
import '../../../src/styles/shells.css'
import '../../../src/styles/blueprint.css'
import '../../../src/styles/teacher-kinetic.css'

const subjects = ['Ngữ văn', 'Lịch sử', 'Địa lý', 'Giáo dục công dân']

function fixtureClasses(count) {
  return Array.from({ length: count }, (_, index) => ({
    id: `fixture-class-${index + 1}`,
    code: `${10 + (index % 3)}${String.fromCharCode(65 + (index % 5))}${(index % 4) + 1}`,
    subject: subjects[index % subjects.length],
    name: `${subjects[index % subjects.length]} ${10 + (index % 3)}${String.fromCharCode(65 + (index % 5))}${(index % 4) + 1}`,
    semester: index % 2 ? 'Học kỳ 2' : 'Học kỳ 1',
    schoolYear: '2026-2027',
    status: index % 9 === 0 ? 'INACTIVE' : 'ACTIVE',
    studentCount: 24 + (index % 11),
    assignmentCount: index % 7,
  }))
}

function PreviewPage({ count }) {
  return (
    <main className="page-content teacher-page teacher-kinetic-overview">
      <div className="page-container">
        <section className="tk-intro" aria-labelledby="teacher-overview-title">
          <div className="tk-intro-copy">
            <p className="tk-kicker">EDUCRAFT / KHÔNG GIAN GIÁO VIÊN</p>
            <h1 id="teacher-overview-title">Mỗi lớp học,<span>một hồ sơ.</span></h1>
            <p className="tk-intro-lede">Xin chào, Trần Gia Phúc. Đây là fixture hiển thị, không gọi API.</p>
          </div>
          <div className="tk-intro-note">
            <span className="tk-note-line" aria-hidden="true" />
            <p className="tk-note-label">GHI CHÚ CỦA GIÁO VIÊN</p>
            <p className="tk-note-copy">Bản xem trước dùng dữ liệu tổng hợp để kiểm tra bố cục và scale archive.</p>
            <a className="tk-button tk-button-primary" href="/assignments/new"><span>Tạo bài kiểm tra</span><span className="tk-button-arrow" aria-hidden="true" /></a>
          </div>
        </section>
        {count > 0 ? <ClassArchive classes={fixtureClasses(count)} /> : <section className="tk-state tk-empty-state"><p className="tk-kicker">ARCHIVE / TRỐNG</p><h2>Chưa có lớp học nào</h2><p>Fixture 0 lớp để kiểm tra empty state.</p></section>}
      </div>
    </main>
  )
}

function PreviewApp() {
  const [count, setCount] = useState(12)
  const authValue = {
    user: { id: 'fixture-teacher', role: 'TEACHER', name: 'Trần Gia Phúc', email: 'teacher@example.test' },
    isLoading: false,
    isAuthenticated: true,
    login: async () => undefined,
    logout: async () => undefined,
    refreshUser: async () => undefined,
  }

  return (
    <AuthContext.Provider value={authValue}>
      <div style={{ position: 'fixed', right: 16, bottom: 16, zIndex: 100, padding: '8px 10px', border: '1px solid #182b37', background: '#f7f5e9', color: '#182b37', fontFamily: 'sans-serif', fontSize: 11 }}>
        <label htmlFor="fixture-count">Fixture lớp: </label>
        <select id="fixture-count" value={count} onChange={(event) => setCount(Number(event.target.value))}>
          {[0, 1, 3, 12, 50, 100, 125].map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </div>
      <MemoryRouter initialEntries={['/teacher']}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/teacher" element={<PreviewPage count={count} />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  )
}

createRoot(document.getElementById('root')).render(<PreviewApp />)
