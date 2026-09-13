import { useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'

import AppShell from './components/AppShell.jsx'
import MockRoleSwitcher from './components/MockRoleSwitcher.jsx'
import RequireRole from './components/RequireRole.jsx'
import RequireStudentAssignment from './components/RequireStudentAssignment.jsx'
import StudentShell from './components/StudentShell.jsx'
import ClassDetailPage from './pages/ClassDetailPage.jsx'
import AssignmentDetailPage from './pages/AssignmentDetailPage.jsx'
import CreateAssignmentPage from './pages/CreateAssignmentPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import StudentDashboardPage from './pages/StudentDashboardPage.jsx'
import StudentSubmissionPage from './pages/StudentSubmissionPage.jsx'
import { getMockUser, readDemoRole, writeDemoRole } from './data/mockSession.js'
import './App.css'

function App() {
  const [demoRole, setDemoRole] = useState(readDemoRole)
  const currentUser = getMockUser(demoRole)

  function handleRoleChange(nextRole) {
    writeDemoRole(nextRole)
    setDemoRole(nextRole)
  }

  return (
    <BrowserRouter>
      <MockRoleSwitcher role={demoRole} onRoleChange={handleRoleChange} />
      <Routes>
        <Route element={<RequireRole currentUser={currentUser} requiredRole="teacher" />}>
          <Route element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="/assignments/new" element={<CreateAssignmentPage />} />
            <Route
              path="/classes/:classId"
              element={<ClassDetailPage />}
            />
            <Route
              path="/classes/:classId/assignments/new"
              element={<CreateAssignmentPage />}
            />
            <Route
              path="/classes/:classId/assignments/:assignmentId"
              element={<AssignmentDetailPage />}
            />
          </Route>
        </Route>
        <Route element={<RequireRole currentUser={currentUser} requiredRole="student" />}>
          <Route path="/student" element={<StudentShell currentUser={currentUser} />}>
            <Route index element={<StudentDashboardPage currentUser={currentUser} />} />
            <Route
              path="assignments/:assignmentId"
              element={<RequireStudentAssignment currentUser={currentUser} />}
            >
              <Route index element={<StudentSubmissionPage currentUser={currentUser} />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
