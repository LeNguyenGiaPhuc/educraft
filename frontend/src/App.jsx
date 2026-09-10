import { BrowserRouter, Route, Routes } from 'react-router-dom'

import AppShell from './components/AppShell.jsx'
import ClassDetailPage from './pages/ClassDetailPage.jsx'
import CreateAssignmentPage from './pages/CreateAssignmentPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
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
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
