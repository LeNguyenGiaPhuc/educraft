import { sendData } from '../../common/response.js'

export function createAssignmentController({ assignmentService }) {
  return {
    async list(request, response) {
      const assignments = await assignmentService.listAssignmentsForClass(
        request.auth,
        request.validated.params.classId,
      )
      return sendData(response, assignments)
    },

    async get(request, response) {
      const assignment = await assignmentService.getAssignment(
        request.auth,
        request.validated.params.assignmentId,
      )
      return sendData(response, assignment)
    },

    async create(request, response) {
      const assignment = await assignmentService.createAssignment(
        request.auth,
        request.validated.params.classId,
        request.validated.body,
      )
      return sendData(response, assignment, 201)
    },

    async update(request, response) {
      const assignment = await assignmentService.updateAssignment(
        request.auth,
        request.validated.params.assignmentId,
        request.validated.body,
      )
      return sendData(response, assignment)
    },

    async remove(request, response) {
      await assignmentService.deleteAssignment(
        request.auth,
        request.validated.params.assignmentId,
      )
      return response.status(204).end()
    },
  }
}
