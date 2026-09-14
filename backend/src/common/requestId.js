import { randomUUID } from 'node:crypto'

export function requestId(request, response, next) {
  const incomingId = request.get('x-request-id')
  request.id = incomingId || randomUUID()
  response.set('x-request-id', request.id)
  next()
}
