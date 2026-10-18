import { createRoot } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import AppShell from '../../../src/components/AppShell.jsx'
import AuthContext from '../../../src/contexts/AuthContext.js'
import TeacherClassSkeleton from '../../../src/components/teacher/TeacherClassSkeleton.jsx'
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

// Visual fixture only: no requests, class data, permission bypass or timers.
const root = import.meta.hot?.data.root ?? createRoot(document.getElementById('root'))
if (import.meta.hot) import.meta.hot.data.root = root
root.render(<AuthContext.Provider value={{ user: { role: 'TEACHER', name: 'Giáo viên kiểm thử' }, logout: async () => undefined }}>
  <MemoryRouter><Routes><Route element={<AppShell />}><Route path="/" element={<TeacherClassSkeleton />} /></Route></Routes></MemoryRouter>
</AuthContext.Provider>)
