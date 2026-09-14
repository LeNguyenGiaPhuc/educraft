import { AppError } from '../common/errors.js'

const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS'])

export function createOriginGuard(frontendOrigin) {
  return function originGuard(request, _response, next) {
    if (safeMethods.has(request.method)) {
      return next()
    }

    if (request.get('origin') !== frontendOrigin) {
      return next(new AppError(
        403,
        'INVALID_ORIGIN',
        'Nguồn gửi request không được phép.',
      ))
    }

    return next()
  }
}
