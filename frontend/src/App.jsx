import { BrowserRouter, Route, Routes } from 'react-router-dom'

import AppShell from './components/AppShell.jsx'
import ClassDetailPage from './pages/ClassDetailPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import PlaceholderPage from './pages/PlaceholderPage.jsx'
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
            element={
              <PlaceholderPage
                eyebrow="Tạo bài kiểm tra"
                title="Tạo bài kiểm tra bài ghi"
                description="Biểu mẫu tạo bài kiểm tra sẽ được triển khai sau khi Dashboard được duyệt."
              />
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
