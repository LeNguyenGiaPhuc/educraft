import { getAssignmentAvailability } from './assignmentDeadline.js'
import { getStudentAssignmentSnapshot } from './mockStudentAccess.js'
import { validateSubmissionForm } from './mockSubmission.js'
import { createStoredSubmission } from './mockSubmissionStore.js'

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
