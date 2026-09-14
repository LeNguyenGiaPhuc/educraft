import { AppError } from '../common/errors.js'

function toFieldErrors(issues) {
  const fields = {}

  for (const issue of issues) {
    const name = issue.path.join('.') || 'request'
    fields[name] ??= issue.message
  }

  return fields
}

export function validate(schemas) {
  return function validateRequest(request, _response, next) {
    const validated = {}

    for (const target of ['body', 'params', 'query']) {
      const schema = schemas[target]
      if (!schema) continue

      const result = schema.safeParse(request[target])
      if (!result.success) {
        return next(new AppError(
          400,
          'VALIDATION_ERROR',
          'Kiểm tra lại dữ liệu đã nhập.',
          toFieldErrors(result.error.issues),
        ))
      }

      validated[target] = result.data
    }

    request.validated = validated
    return next()
  }
}
