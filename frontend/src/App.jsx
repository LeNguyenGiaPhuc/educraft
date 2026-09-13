import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import AdminShell from './components/AdminShell.jsx'
import AppShell from './components/AppShell.jsx'
import RoleRoute from './components/RoleRoute.jsx'
import { AuthProvider } from './contexts/AuthProvider.jsx'
import { useAuth } from './contexts/useAuth.js'
import { getRoleHome, ROLES } from './data/mockAuthStore.js'
import AdminAccountsPage from './pages/AdminAccountsPage.jsx'
import AdminClassDetailPage from './pages/AdminClassDetailPage.jsx'
import AdminClassesPage from './pages/AdminClassesPage.jsx'
import AdminDashboardPage from './pages/AdminDashboardPage.jsx'
import AssignmentDetailPage from './pages/AssignmentDetailPage.jsx'
import ClassDetailPage from './pages/ClassDetailPage.jsx'
import CreateAssignmentPage from './pages/CreateAssignmentPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import StudentHomePage from './pages/StudentHomePage.jsx'
import StudentSubmissionPage from './pages/StudentSubmissionPage.jsx'
import './App.css'

function HomeRedirect() {
  const { user } = useAuth()

  return <Navigate replace to={user ? getRoleHome(user.role) : '/login'} />
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/login" element={<LoginPage />} />

          <Route element={<RoleRoute allowedRoles={[ROLES.ADMIN]} />}>
            <Route element={<AdminShell />}>
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/admin/accounts" element={<AdminAccountsPage />} />
              <Route path="/admin/classes" element={<AdminClassesPage />} />
              <Route path="/admin/classes/:classId" element={<AdminClassDetailPage />} />
            </Route>
          </Route>

          <Route element={<AppShell />}>
            <Route element={<RoleRoute allowedRoles={[ROLES.TEACHER]} />}>
              <Route path="/teacher" element={<DashboardPage />} />
              <Route path="/assignments/new" element={<CreateAssignmentPage />} />
              <Route path="/classes/:classId" element={<ClassDetailPage />} />
              <Route path="/classes/:classId/assignments/new" element={<CreateAssignmentPage />} />
              <Route path="/classes/:classId/assignments/:assignmentId" element={<AssignmentDetailPage />} />
            </Route>

            <Route element={<RoleRoute allowedRoles={[ROLES.STUDENT]} />}>
              <Route path="/student" element={<StudentHomePage />} />
              <Route path="/student/assignments/:assignmentId" element={<StudentSubmissionPage />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
