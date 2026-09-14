import { sendData } from '../../common/response.js'

export function createSubmissionController({ submissionService }) {
  return {
    async listOwn(request, response) {
      const submissions = await submissionService.listOwnSubmissions(
        request.auth,
        request.validated.params.assignmentId,
      )

      return sendData(response, submissions)
    },

    async listForTeacher(request, response) {
      const submissions = await submissionService.listAssignmentSubmissions(
        request.auth,
        request.validated.params.assignmentId,
      )

      return sendData(response, submissions)
    },

    async get(request, response) {
      const submission = await submissionService.getSubmission(
        request.auth,
        request.validated.params.submissionId,
      )

      return sendData(response, submission)
    },

    async finalize(request, response) {
      const result = await submissionService.finalizeSubmission(
        request.auth,
        request.validated.params.submissionId,
        request.validated.body,
      )

      return sendData(response, result)
    },

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
