import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'

import AdminShell from './components/AdminShell.jsx'
import AdminPendingState from './components/admin/AdminPendingState.jsx'
import AppShell from './components/AppShell.jsx'
import CommonPendingState from './components/CommonPendingState.jsx'
import RequireStudentAssignment from './components/RequireStudentAssignment.jsx'
import RequireTeacherClass from './components/RequireTeacherClass.jsx'
import RoleRoute from './components/RoleRoute.jsx'
import TeacherPendingState from './components/teacher/TeacherPendingState.jsx'
import StudentPendingState from './components/student/StudentPendingState.jsx'
import { AuthProvider } from './contexts/AuthProvider.jsx'
import { useAuth } from './contexts/useAuth.js'
import { getPageTitle } from './data/pageTitle.js'
import { getRoleHome, ROLES } from './services/authService.js'
import './App.css'
import './styles/shells.css'
import './styles/login.css'
import './styles/admin.css'
import './styles/teacher.css'
import './styles/student.css'
import './styles/blueprint.css'
import './styles/teacher-kinetic.css'
import './styles/teacher-final-states.css'
import './styles/common-kinetic.css'

const AdminAccountsPage = lazy(() => import('./pages/AdminAccountsPage.jsx'))
const AdminClassDetailPage = lazy(() => import('./pages/AdminClassDetailPage.jsx'))
const AdminClassesPage = lazy(() => import('./pages/AdminClassesPage.jsx'))
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage.jsx'))
const AssignmentDetailPage = lazy(() => import('./pages/AssignmentDetailPage.jsx'))
const ClassDetailPage = lazy(() => import('./pages/ClassDetailPage.jsx'))
const CreateAssignmentPage = lazy(() => import('./pages/CreateAssignmentPage.jsx'))
const DashboardPage = lazy(() => import('./pages/DashboardPage.jsx'))
const LoginPage = lazy(() => import('./pages/LoginPage.jsx'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.jsx'))
const StudentDashboardPage = lazy(() => import('./pages/StudentDashboardPage.jsx'))
const StudentSubmissionPage = lazy(() => import('./pages/StudentSubmissionPage.jsx'))

function RouteLoadingState() {
  const { user } = useAuth()
  if (user?.role === ROLES.TEACHER) return <AppShell><TeacherPendingState /></AppShell>
  if (user?.role === ROLES.STUDENT) return <AppShell><StudentPendingState message="Đang mở hồ sơ học tập…" /></AppShell>
  if (user?.role === ROLES.ADMIN) return <AdminShell><AdminPendingState /></AdminShell>
  return <CommonPendingState />
}

function HomeRedirect() {
  const { user } = useAuth()

  return <Navigate replace to={user ? getRoleHome(user.role) : '/login'} />
}

function AppRoutes() {
  const { user, isLoading } = useAuth()
  const { pathname } = useLocation()

  useEffect(() => {
    document.title = getPageTitle(pathname)
  }, [pathname])

  if (isLoading) {
    // Route-themed placeholders only; authentication still blocks every private record.
    if (pathname === '/teacher' || pathname === '/assignments/new' || pathname.startsWith('/classes/')) {
      return <TeacherPendingState standalone message="Đang kiểm tra phiên đăng nhập…" />
    }
    if (pathname === '/student' || pathname.startsWith('/student/')) {
      return <StudentPendingState standalone message="Đang kiểm tra phiên đăng nhập…" />
    }
    if (pathname === '/admin' || pathname.startsWith('/admin/')) {
      return <AdminPendingState standalone message="Đang kiểm tra phiên đăng nhập…" />
    }
    return <CommonPendingState message="Đang kiểm tra phiên đăng nhập…" />
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
      <Route path="*" element={<NotFoundPage />} />
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
