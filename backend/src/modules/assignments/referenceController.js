import { sendData } from '../../common/response.js'

export function createReferenceController({ referenceService }) {
  return {
    async list(request, response) {
      const references = await referenceService.listReferences(
        request.auth,
        request.validated.params.assignmentId,
      )
      return sendData(response, references)
    },

    async create(request, response) {
      const reference = await referenceService.uploadReference(
        request.auth,
        request.validated.params.assignmentId,
        request.file,
      )
      return sendData(response, reference, 201)
    },

    async replace(request, response) {
      const reference = await referenceService.replaceReference(
        request.auth,
        request.validated.params.assignmentId,
        request.validated.params.referenceId,
        request.file,
      )
      return sendData(response, reference)
    },

    async remove(request, response) {
      await referenceService.deleteReference(
        request.auth,
        request.validated.params.assignmentId,
        request.validated.params.referenceId,
      )
      return response.status(204).end()
    },
  }
}
