import { sendData } from '../../common/response.js'

export function createTeacherClassController({ classService }) {
  return {
    async list(request, response) {
      const classes = await classService.listClasses(request.auth)
      return sendData(response, classes)
    },

    async get(request, response) {
      const classroom = await classService.getClass(
        request.auth,
        request.validated.params.classId,
      )
      return sendData(response, classroom)
    },
  }
}
