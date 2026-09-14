import { sendData } from '../../common/response.js'

export function createSubmissionController({ submissionService }) {
  return {
    async create(request, response) {
      const submission = await submissionService.createSubmission(
        request.auth,
        request.validated.params.assignmentId,
        request.file,
      )

      return sendData(response, submission, 201)
    },
  }
}
