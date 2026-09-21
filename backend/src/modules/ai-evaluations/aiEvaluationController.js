import { sendData } from '../../common/response.js'

export function createAiEvaluationController({ aiEvaluationService }) {
  return {
    async create(request, response) {
      const result = await aiEvaluationService.runEvaluation(
        request.auth,
        request.validated.params.submissionId,
      )
      return sendData(response, result)
    },

    async get(request, response) {
      const evaluation = await aiEvaluationService.getEvaluation(
        request.auth,
        request.validated.params.submissionId,
      )
      return sendData(response, evaluation)
    },
  }
}
