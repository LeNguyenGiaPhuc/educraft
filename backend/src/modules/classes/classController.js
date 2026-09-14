import { sendData } from '../../common/response.js'

export function createClassController({ classService }) {
  return {
    async list(request, response) {
      const classes = await classService.listClasses(request.auth, request.validated.query)
      return sendData(response, classes)
    },

    async get(request, response) {
      const item = await classService.getClass(request.auth, request.validated.params.classId)
      return sendData(response, item)
    },

    async listStudents(request, response) {
      const students = await classService.listStudents(request.auth, request.validated.params.classId)
      return sendData(response, students)
    },

    async create(request, response) {
      const item = await classService.createClass(request.auth, request.validated.body)
      return sendData(response, item, 201)
    },

    async update(request, response) {
      const item = await classService.updateClass(request.auth, request.validated.params.classId, request.validated.body)
      return sendData(response, item)
    },

    async remove(request, response) {
      await classService.deleteClass(request.auth, request.validated.params.classId)
      return response.status(204).end()
    },

    async assignTeacher(request, response) {
      const item = await classService.assignTeacher(request.auth, request.validated.params.classId, request.validated.body)
      return sendData(response, item)
    },

    async addStudent(request, response) {
      const item = await classService.addStudent(request.auth, request.validated.params.classId, request.validated.body)
      return sendData(response, item, 201)
    },

    async removeStudent(request, response) {
      const item = await classService.removeStudent(request.auth, request.validated.params.classId, request.validated.body)
      return sendData(response, item)
    },

    async importStudents(request, response) {
      const result = await classService.importStudents(request.auth, request.validated.params.classId, request.validated.body)
      return sendData(response, result, 201)
    },
  }
}
