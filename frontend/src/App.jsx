import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import AdminShell from './components/AdminShell.jsx'
import AppShell from './components/AppShell.jsx'
import RequireStudentAssignment from './components/RequireStudentAssignment.jsx'
import RequireTeacherClass from './components/RequireTeacherClass.jsx'
import RoleRoute from './components/RoleRoute.jsx'
import { AuthProvider } from './contexts/AuthProvider.jsx'
import { useAuth } from './contexts/useAuth.js'
import { getRoleHome, ROLES } from './services/authService.js'
import './App.css'
import './styles/tokens.css'
import './styles/shells.css'
import './styles/login.css'
import './styles/admin.css'
import './styles/teacher.css'
import './styles/student.css'
import './styles/blueprint.css'

const AdminAccountsPage = lazy(() => import('./pages/AdminAccountsPage.jsx'))
const AdminClassDetailPage = lazy(() => import('./pages/AdminClassDetailPage.jsx'))
const AdminClassesPage = lazy(() => import('./pages/AdminClassesPage.jsx'))
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage.jsx'))
const AssignmentDetailPage = lazy(() => import('./pages/AssignmentDetailPage.jsx'))
const ClassDetailPage = lazy(() => import('./pages/ClassDetailPage.jsx'))
const CreateAssignmentPage = lazy(() => import('./pages/CreateAssignmentPage.jsx'))
const DashboardPage = lazy(() => import('./pages/DashboardPage.jsx'))
const LoginPage = lazy(() => import('./pages/LoginPage.jsx'))
const StudentDashboardPage = lazy(() => import('./pages/StudentDashboardPage.jsx'))
const StudentSubmissionPage = lazy(() => import('./pages/StudentSubmissionPage.jsx'))

function RouteLoadingState() {
  return (
    <main className="page-content">
      <div className="page-container">
        <section className="state-panel" aria-live="polite">
          <h1>Đang mở không gian làm việc...</h1>
        </section>
      </div>
    </main>
  )
}

function HomeRedirect() {
  const { user } = useAuth()

  return <Navigate replace to={user ? getRoleHome(user.role) : '/login'} />
}

function AppRoutes() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <main className="page-content">
        <div className="page-container">
          <section className="state-panel" aria-live="polite">
            <h1>Đang kiểm tra phiên đăng nhập...</h1>
          </section>
        </div>
      </main>
    )
  }

  // Chuyển cấu trúc user của Auth sang cấu trúc Student portal đang sử dụng.
  const currentStudent = user?.role === ROLES.STUDENT
    ? {
        id: user.id,
        name: user.name,
        role: 'student',
        studentId: user.studentCode || user.email,
      }
    : null
  const currentTeacher = user?.role === ROLES.TEACHER ? user : null

  return (
    <Suspense fallback={<RouteLoadingState />}>
      <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage />} />

      <Route element={<RoleRoute allowedRoles={[ROLES.ADMIN]} />}>
        <Route element={<AdminShell />}>
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/accounts" element={<AdminAccountsPage />} />
          <Route path="/admin/classes" element={<AdminClassesPage />} />
          <Route
            path="/admin/classes/:classId"
            element={<AdminClassDetailPage />}
          />
        </Route>
      </Route>

      <Route element={<RoleRoute allowedRoles={[ROLES.TEACHER]} />}>
        <Route element={<AppShell />}>
          <Route path="/teacher" element={<DashboardPage currentUser={currentTeacher} />} />
          <Route path="/assignments/new" element={<CreateAssignmentPage currentUser={currentTeacher} />} />
          <Route element={<RequireTeacherClass />}>
            <Route path="/classes/:classId" element={<ClassDetailPage currentUser={currentTeacher} />} />
            <Route
              path="/classes/:classId/assignments/new"
              element={<CreateAssignmentPage currentUser={currentTeacher} />}
            />
            <Route
              path="/classes/:classId/assignments/:assignmentId"
              element={<AssignmentDetailPage currentUser={currentTeacher} />}
            />
          </Route>
        </Route>
      </Route>

      <Route element={<RoleRoute allowedRoles={[ROLES.STUDENT]} />}>
        <Route element={<AppShell />}>
          <Route
            path="/student"
            element={<StudentDashboardPage currentUser={currentStudent} />}
          />
          <Route
            path="/student/assignments/:assignmentId"
            element={
              <RequireStudentAssignment currentUser={currentStudent} />
            }
          >
            <Route
              index
              element={
                <StudentSubmissionPage currentUser={currentStudent} />
              }
            />
          </Route>
        </Route>
      </Route>
      </Routes>
    </Suspense>
  )
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
