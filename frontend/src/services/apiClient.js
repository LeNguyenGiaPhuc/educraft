const DEFAULT_API_BASE_URL =
  import.meta.env?.VITE_API_BASE_URL || 'http://localhost:3000'

export class ApiError extends Error {
  constructor({ status = 0, code = 'API_ERROR', message = 'Yêu cầu không thành công.', fields, cause }) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fields = fields
    this.cause = cause
  }
}

function joinUrl(baseUrl, path) {
  const base = String(baseUrl).replace(/\/+$/, '')
  const route = String(path).startsWith('/') ? path : `/${path}`
  return `${base}${route}`
}

function createRequestOptions(method, body, headers) {
  const options = {
    method,
    credentials: 'include',
  }

  if (body === undefined) {
    return options
  }

  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData
  if (isFormData) {
    options.body = body
    return options
  }

  options.body = JSON.stringify(body)
  options.headers = {
    'Content-Type': 'application/json',
    ...headers,
  }

  return options
}

async function readResponseBody(response) {
  if (response.status === 204) {
    return undefined
  }

  const text = await response.text()
  if (!text) {
    return undefined
  }

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export function createApiClient({ baseUrl = DEFAULT_API_BASE_URL, fetchImpl = fetch } = {}) {
  async function request(path, options = {}) {
    const requestOptions = createRequestOptions(
      options.method ?? 'GET',
      options.body,
      options.headers,
    )

    if (options.body === undefined && options.headers) {
      requestOptions.headers = options.headers
    }

    let response
    try {
      response = await fetchImpl(joinUrl(baseUrl, path), requestOptions)
    } catch (error) {
      throw new ApiError({
        code: 'NETWORK_ERROR',
        message: 'Không thể kết nối đến máy chủ.',
        cause: error,
      })
    }

    const payload = await readResponseBody(response)
    if (!response.ok) {
      const details = payload?.error ?? {}
      throw new ApiError({
        status: response.status,
        code: details.code ?? 'API_ERROR',
        message: details.message ?? 'Yêu cầu không thành công.',
        fields: details.fields,
      })
    }

    if (payload && typeof payload === 'object' && Object.hasOwn(payload, 'data')) {
      return payload.data
    }

    return payload
  }

  return {
    request,
    get: (path, options = {}) => request(path, { ...options, method: 'GET' }),
    post: (path, body, options = {}) => request(path, { ...options, method: 'POST', body }),
    put: (path, body, options = {}) => request(path, { ...options, method: 'PUT', body }),
    patch: (path, body, options = {}) => request(path, { ...options, method: 'PATCH', body }),
    delete: (path, options = {}) => request(path, { ...options, method: 'DELETE' }),
    upload: (path, body, options = {}) => request(path, {
      ...options,
      method: options.method ?? 'POST',
      body,
    }),
  }
}

export const apiClient = createApiClient()
