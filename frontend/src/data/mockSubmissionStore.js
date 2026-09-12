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

export function getStoredSubmission(submissionId, storage = getBrowserStorage()) {
  return readSubmissions(storage).find(
    (submission) => submission.id === submissionId,
  ) ?? null
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

export function updateStoredSubmissionReview(submissionId, review, storage = getBrowserStorage()) {
  const submissions = readSubmissions(storage)
  const storedSubmission = submissions.find((item) => item.id === submissionId)
  const submission = storedSubmission ?? review.submission

  if (!submission) {
    throw new Error('Không tìm thấy bài nộp này.')
  }

  const updatedSubmission = {
    ...submission,
    status: 'approved',
    score: Number(review.score),
    feedback: review.feedback,
    reviewedAt: new Date().toISOString(),
  }

  const nextSubmissions = storedSubmission
    ? submissions.map((item) => (item.id === submissionId ? updatedSubmission : item))
    : [...submissions, updatedSubmission]

  writeSubmissions(nextSubmissions, storage)

  return updatedSubmission
}

export function deleteStoredSubmissions(assignmentIds, storage = getBrowserStorage()) {
  const submissions = readSubmissions(storage)

  writeSubmissions(
    submissions.filter((submission) => !assignmentIds.includes(submission.assignmentId)),
    storage,
  )
}
