import { sendData } from '../../common/response.js'

export function createStudentDashboardController({ studentService }) {
  return {
    async getDashboard(request, response) {
      const dashboard = await studentService.getDashboard(request.auth)
      return sendData(response, dashboard)
    },

    async getAssignment(request, response) {
      const assignment = await studentService.getAssignment(
        request.auth,
        request.validated.params.assignmentId,
      )
      return sendData(response, assignment)
    },
  }
}
