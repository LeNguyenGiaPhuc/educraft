import { finalStatusForForm, mapEvaluation } from './assignmentDetailView.js'

export function validateReviewForm(form) {
  const errors = {}
  if (!['COMPLETED', 'NEEDS_COMPLETION'].includes(form.finalStatus)) errors.finalStatus = 'Chọn kết quả cuối cùng.'
  if (!String(form.feedback ?? '').trim()) errors.feedback = 'Nhập nhận xét cho học sinh.'
  return errors
}

// A session belongs to one open assignment, not localStorage or a shared user cache.
// Async completions always address their original backend submission ID.
export function createReviewSession(assignmentId) {
  const entries = new Map()
  const listeners = new Map()
  const workspaceListeners = new Set()
  let revision = 0
  function update(id, changes) {
    entries.set(id, { ...entries.get(id), ...changes })
    revision++
    listeners.get(id)?.forEach((listener) => listener())
    workspaceListeners.forEach(listener => listener())
  }
  function ensure(submission) {
    if (!entries.has(submission.id)) {
      entries.set(submission.id, {
        form: { finalStatus: finalStatusForForm(submission.finalStatus), feedback: submission.feedback ?? '' },
        touched: { finalStatus: Boolean(submission.finalStatus), feedback: Boolean(submission.feedback) },
        evaluation: { status: 'idle', data: null },
        review: { status: 'idle' }, errors: {}, finalized: submission.status === 'approved', serverReview: submission.teacherReview,
      })
    }
    return entries.get(submission.id)
  }
  async function evaluate(id, request, explicit) {
    const entry = entries.get(id)
    if (!entry || entry.evaluation.status === 'loading' || (explicit && entry.finalized)) return
    if (!explicit && entry.evaluation.status !== 'idle') return
    update(id, { evaluation: { status: 'loading', data: null, operation: explicit ? 'analyze' : 'read' } })
    try {
      const result = await request(id)
      if (!result) {
        update(id, { evaluation: { status: 'empty', data: null } })
        return
      }
      const evaluation = mapEvaluation(result)
      const current = entries.get(id)
      // Do not change a decision already saving or confirmed by the server.
      const canSuggest = !current.finalized && current.review.status !== 'loading'
      const form = canSuggest ? {
        finalStatus: current.touched.finalStatus ? current.form.finalStatus : finalStatusForForm(null, evaluation.suggestedStatus),
        feedback: current.touched.feedback ? current.form.feedback : evaluation.feedbackDraft,
      } : current.form
      update(id, { evaluation: { status: 'success', data: evaluation }, form })
    } catch (error) {
      const absent = !explicit && (error?.status === 404 || error?.code === 'AI_EVALUATION_NOT_FOUND')
      update(id, { evaluation: { status: absent ? 'not-started' : 'error', data: null, message: error?.message ?? 'Không thể đọc hoặc phân tích bài nộp lúc này.' } })
    }
  }
  return {
    assignmentId,
    ensure,
    get: (id) => entries.get(id),
    getRevision: () => revision,
    subscribeWorkspace(listener) {
      workspaceListeners.add(listener)
      return () => workspaceListeners.delete(listener)
    },
    syncSubmission(submission) {
      const entry = ensure(submission)
      if (submission.status === 'approved' && !entry.finalized) {
        update(submission.id, { finalized: true, serverReview: submission.teacherReview, form: { finalStatus: finalStatusForForm(submission.finalStatus), feedback: submission.feedback ?? entry.form.feedback } })
      }
    },
    subscribe(id, listener) {
      if (!listeners.has(id)) listeners.set(id, new Set())
      listeners.get(id).add(listener)
      return () => { listeners.get(id)?.delete(listener) }
    },
    change(id, name, value) {
      const entry = entries.get(id)
      if (!entry || entry.finalized || entry.review.status === 'loading') return
      const errors = { ...entry.errors }; delete errors[name]
      update(id, { form: { ...entry.form, [name]: value }, touched: { ...entry.touched, [name]: true }, errors, review: { status: 'idle' } })
    },
    loadEvaluation: (id, request) => evaluate(id, request, false),
    runEvaluation: (id, request) => evaluate(id, request, true),
    async finalize(id, request) {
      const entry = entries.get(id)
      if (!entry || entry.finalized || entry.review.status === 'loading') return
      const errors = validateReviewForm(entry.form)
      update(id, { errors })
      if (Object.keys(errors).length) return
      // Set this lock synchronously, before yielding to the PATCH request.
      update(id, { review: { status: 'loading' } })
      try {
        const result = await request(id, { final_status: entry.form.finalStatus, feedback: entry.form.feedback.trim() })
        const serverReview = result?.teacher_review
        update(id, {
          finalized: true, review: { status: 'success' }, serverReview,
          form: serverReview ? { finalStatus: finalStatusForForm(serverReview.final_status), feedback: serverReview.feedback ?? entry.form.feedback } : entry.form,
        })
        return result
      } catch (error) {
        update(id, { review: { status: 'error', message: error?.message ?? 'Không thể lưu kết quả chấm. Vui lòng thử lại.' } })
      }
    },
    refreshFailed(id) {
      if (entries.get(id)?.finalized) update(id, { review: { status: 'success', refreshWarning: 'Đã chốt thành công, nhưng chưa thể làm mới danh sách. Mở lại bài kiểm tra để cập nhật danh sách.' } })
    },
  }
}
