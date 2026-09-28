const ROUTE_TITLES = [
  [/^\/login(?:\/|$)/, 'Đăng nhập'],
  [/^\/admin\/accounts(?:\/|$)/, 'Quản lý tài khoản'],
  [/^\/admin\/classes\/[^/]+(?:\/|$)/, 'Chi tiết lớp học'],
  [/^\/admin\/classes(?:\/|$)/, 'Quản lý lớp học'],
  [/^\/admin(?:\/|$)/, 'Tổng quan quản trị'],
  [/^\/assignments\/new(?:\/|$)/, 'Tạo bài kiểm tra'],
  [/^\/classes\/[^/]+\/assignments\/new(?:\/|$)/, 'Tạo bài kiểm tra'],
  [/^\/classes\/[^/]+\/assignments\/[^/]+(?:\/|$)/, 'Chi tiết bài kiểm tra'],
  [/^\/classes\/[^/]+(?:\/|$)/, 'Chi tiết lớp học'],
  [/^\/teacher(?:\/|$)/, 'Tổng quan lớp học'],
  [/^\/student\/assignments\/[^/]+(?:\/submit)?(?:\/|$)/, 'Nộp bài'],
  [/^\/student(?:\/|$)/, 'Tổng quan học sinh'],
]

export function getPageTitle(pathname = '') {
  const path = typeof pathname === 'string' ? pathname.split('?')[0] : ''
  const routeTitle = ROUTE_TITLES.find(([pattern]) => pattern.test(path))?.[1]

  return routeTitle ? `EduCraft - ${routeTitle}` : 'EduCraft'
}
