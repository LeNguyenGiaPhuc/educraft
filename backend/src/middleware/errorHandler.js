import { AppError } from '../common/errors.js'

export function notFound(_request, _response, next) {
  next(new AppError(404, 'NOT_FOUND', 'Không tìm thấy tài nguyên.'))
}

export function createErrorHandler(logger = console) {
  return function errorHandler(error, request, response, next) {
    if (response.headersSent) {
      return next(error)
    }

    const knownError = error instanceof AppError
    const status = knownError ? error.status : 500
    const body = {
      code: knownError ? error.code : 'INTERNAL_ERROR',
      message: knownError ? error.message : 'Hệ thống đang gặp lỗi.',
    }

    if (knownError && error.fields) {
      body.fields = error.fields
    }

    if (!knownError) {
      logger.error({
        requestId: request.id,
        method: request.method,
        path: request.originalUrl,
        message: error.message,
      })
    }

    return response.status(status).json({ error: body })
  }
}
