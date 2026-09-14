export function sendData(response, data, status = 200) {
  return response.status(status).json({ data })
}
