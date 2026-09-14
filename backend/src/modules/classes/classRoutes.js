import { Router } from 'express'

import { requireRole } from '../../middleware/authorize.js'
import { validate } from '../../middleware/validate.js'
import {
  addStudentSchema,
  assignTeacherSchema,
  classIdParamsSchema,
  classListQuerySchema,
  createClassSchema,
  importStudentsSchema,
  removeStudentSchema,
  updateClassSchema,
} from './classValidators.js'

export function createClassRouter({ controller, authenticate }) {
  const router = Router()

  router.use(authenticate)
  router.use(requireRole('ADMIN'))

  router.get('/classes', validate(classListQuerySchema), controller.list)
  router.get('/classes/:classId', validate(classIdParamsSchema), controller.get)
  router.post('/classes', validate(createClassSchema), controller.create)
  router.patch('/classes/:classId', validate(updateClassSchema), controller.update)
  router.delete('/classes/:classId', validate(classIdParamsSchema), controller.remove)

  router.post('/classes/:classId/teacher', validate(assignTeacherSchema), controller.assignTeacher)
  router.post('/classes/:classId/students', validate(addStudentSchema), controller.addStudent)
  router.delete('/classes/:classId/students', validate(removeStudentSchema), controller.removeStudent)
  router.post('/classes/:classId/import-students', validate(importStudentsSchema), controller.importStudents)

  return router
}
