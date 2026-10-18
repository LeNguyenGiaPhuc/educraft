import { useEffect, useRef } from 'react'
import { animateTeacherDossier } from './teacherMotion.js'
import '../../styles/teacher-assignment-forms.css'

export default function AssignmentPaperEdge() {
  const edge = useRef(null)
  useEffect(() => animateTeacherDossier(edge.current), [])
  return <div className="tk-form-paper-edge" ref={edge} aria-hidden="true" />
}
