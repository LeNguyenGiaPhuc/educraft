const SUBMISSIONS_STORAGE_KEY = 'educraft.submissions'

function getBrowserStorage() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return window.localStorage
  } catch {
    return null
  }
}

function readSubmissions(storage = getBrowserStorage()) {
  if (!storage) {
    return []
  }

  try {
    const value = storage.getItem(SUBMISSIONS_STORAGE_KEY)
    const submissions = value ? JSON.parse(value) : []

    return Array.isArray(submissions) ? submissions : []
  } catch {
    return []
  }
}

function writeSubmissions(submissions, storage = getBrowserStorage()) {
  if (!storage) {
    return
  }

  storage.setItem(SUBMISSIONS_STORAGE_KEY, JSON.stringify(submissions))
}

export function getStoredSubmissions(assignmentId, storage = getBrowserStorage()) {
  return readSubmissions(storage).filter(
    (submission) => submission.assignmentId === assignmentId,
  )
}

export function createStoredSubmission(form, storage = getBrowserStorage()) {
  const submissions = readSubmissions(storage)
  const submission = {
    id: `submission-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    assignmentId: form.assignmentId,
    studentId: form.studentId,
    fileName: form.fileName,
    fileSizeBytes: Number(form.fileSizeBytes),
    status: 'submitted',
    submittedAt: new Date().toISOString(),
  }

  writeSubmissions([...submissions, submission], storage)
  return submission
}
