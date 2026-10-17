import { Router } from 'express'

import { AppError } from '../../common/errors.js'
import { requireRole } from '../../middleware/authorize.js'
import { validate } from '../../middleware/validate.js'
import { aiEvaluationParamsSchema } from './aiEvaluationValidators.js'

const stages = new Set(['input_ready', 'transcribed', 'evaluated', 'checked', 'persisted'])

export function createAiEvaluationStreamRouter({ aiEvaluationService, authenticate }) {
  const router = Router()
  // Keep runs registered through disconnects; a reconnect must use GET, not another POST.
  const running = new Set()
  router.post('/submissions/:submissionId/ai-evaluation/stream',
    authenticate, requireRole('TEACHER'), validate(aiEvaluationParamsSchema),
    async (request, response, next) => {
      const { submissionId } = request.validated.params
      if (running.has(submissionId)) {
        return next(new AppError(409, 'AI_EVALUATION_RUNNING', 'AI đang xử lý. Hãy tải lại đề xuất để đồng bộ.'))
      }
      running.add(submissionId)
      let connected = true
      const sentStages = new Set()
      const disconnect = () => { connected = false }
      response.once('close', disconnect)

      function send(event, data) {
        if (!connected || response.destroyed || response.writableEnded) return
        if (!response.headersSent) {
          response.set({
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            'X-Accel-Buffering': 'no',
          })
          response.flushHeaders()
        }
        response.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
      }

      try {
        const result = await aiEvaluationService.runEvaluation(request.auth, submissionId, {
          onProgress(progress) {
            if (progress?.submissionId !== submissionId || !stages.has(progress.stage)
              || sentStages.has(progress.stage)) return
            sentStages.add(progress.stage)
            // Never forward arbitrary service fields, student content, or provider tokens.
            send('stage', { stage: progress.stage, submissionId })
          },
        })
        if (result?.submission_id !== submissionId || result?.submission_status !== 'REQUIRES_REVIEW') {
          throw new AppError(500, 'AI_EVALUATION_INCOMPLETE', 'Đánh giá chưa được xác nhận lưu thành công.')
        }
        send('complete', result)
      } catch (error) {
        if (connected && !response.headersSent) return next(error)
        send('error', {
          code: error instanceof AppError ? error.code : 'INTERNAL_ERROR',
          message: error instanceof AppError ? error.message : 'Không thể hoàn tất đánh giá AI.',
        })
      } finally {
        running.delete(submissionId)
        response.off('close', disconnect)
        if (connected && response.headersSent && !response.writableEnded) response.end()
      }
    })
  return router
}
