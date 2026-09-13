import { getAssignmentAvailability } from './assignmentDeadline.js'
import { getStudentAssignmentSnapshot } from './mockStudentAccess.js'
import { validateSubmissionForm } from './mockSubmission.js'
import { createStoredSubmission, getStoredSubmissions } from './mockSubmissionStore.js'

export function getStudentSubmissionHistory(currentUser, assignmentId, storage) {
  const snapshot = getStudentAssignmentSnapshot(currentUser, assignmentId, storage)
  if (snapshot.status === 'error') return snapshot

  const data = getStoredSubmissions(assignmentId, storage)
    .filter((submission) => submission.studentId === currentUser.studentId)
    .map((submission, storedIndex) => ({
      submission,
      storedIndex,
      submittedTime: Date.parse(submission.submittedAt),
    }))
    .sort((first, second) => {
      const firstTime = Number.isFinite(first.submittedTime)
        ? first.submittedTime
        : Number.MAX_SAFE_INTEGER
      const secondTime = Number.isFinite(second.submittedTime)
        ? second.submittedTime
        : Number.MAX_SAFE_INTEGER

      return firstTime - secondTime || first.storedIndex - second.storedIndex
    })
    .map(({ submission }, index) => ({
      id: submission.id,
      attemptNumber: index + 1,
      fileName: submission.fileName,
      submittedAt: submission.submittedAt,
      status: submission.status,
    }))

  return { status: 'success', data }
}

export async function submitStudentNote(
  currentUser, form, outcome = 'success', delay = 0, storage, now = Date.now,
) {
  await new Promise((resolve) => setTimeout(resolve, delay))

  const errors = validateSubmissionForm(form)
  if (Object.keys(errors).length > 0) {
    return { status: 'error', message: errors.file, errors }
  }

  // Re-read membership and the deadline after the mock delay, immediately before saving.
  const snapshot = getStudentAssignmentSnapshot(currentUser, form.assignmentId, storage)
  if (snapshot.status === 'error') return snapshot

  const availability = getAssignmentAvailability(snapshot.data, now())
  if (!availability.isOpen) {
    return { status: 'error', message: availability.message }
  }
  if (outcome === 'error') {
    return { status: 'error', message: 'Không thể nộp bài lúc này. Vui lòng thử lại.' }
  }

  return {
    status: 'success',
    data: createStoredSubmission({
      assignmentId: snapshot.data.id,
      studentId: currentUser.studentId,
      fileName: form.fileName,
      fileSizeBytes: form.fileSizeBytes,
    }, storage),
  }
}
