import { AppError } from '../common/errors.js'

export function requireRole(...allowedRoles) {
  return function authorizeRole(request, _response, next) {
    if (!request.auth || !allowedRoles.includes(request.auth.profile.role)) {
      return next(new AppError(403, 'FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này.'))
    }

    return next()
  }
}
