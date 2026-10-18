// A refresh failure must not discard the mounted workspace and unsaved drafts.
export function assignmentDetailFailure(current, assignmentId, message, httpStatus) {
  const accessInvalid = [401,403,404].includes(httpStatus)
  if (!accessInvalid && current.assignmentId === assignmentId && current.detail) {
    return { ...current, refreshError: message }
  }
  return { status: 'error', assignmentId, detail: null, message }
}
