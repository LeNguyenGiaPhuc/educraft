import PageErrorState from '../components/PageErrorState.jsx'
import { useAuth } from '../contexts/useAuth.js'
import { getRoleHome } from '../services/authService.js'

function NotFoundPage() {
  const { user } = useAuth()
  const returnTo = user ? getRoleHome(user.role) : '/login'

  return (
    <PageErrorState
      standalone
      kicker="Lỗi 404"
      message="Đường dẫn bạn vừa mở không tồn tại hoặc đã được thay đổi."
      returnTo={returnTo}
      title="Trang không tồn tại"
    />
  )
}

export default NotFoundPage
