import { BrowserRouter, Route, Routes } from 'react-router-dom'

import AppShell from './components/AppShell.jsx'
import ClassDetailPage from './pages/ClassDetailPage.jsx'
import AssignmentDetailPage from './pages/AssignmentDetailPage.jsx'
import CreateAssignmentPage from './pages/CreateAssignmentPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import StudentSubmissionPage from './pages/StudentSubmissionPage.jsx'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
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
          <Route
            path="/student/assignments/:assignmentId"
            element={<StudentSubmissionPage />}
          />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
