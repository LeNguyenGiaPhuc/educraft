import { useState } from 'react'

import {
  toAssignmentUpdateDeadline,
  toTeacherDeadlineInput,
} from '../../data/assignmentDeadline.js'
import { assignmentService } from '../../services/assignmentService.js'
import AssignmentPaperEdge from '../teacher/AssignmentPaperEdge.jsx'

export default function AssignmentEditor({ assignment, onSaved, onCancel }) {
  const [form, setForm] = useState({
    title: assignment.title,
    dueAt: toTeacherDeadlineInput(assignment.dueAt),
    threshold: String(assignment.coverageThreshold),
    status: assignment.status,
  })
  const [state, setState] = useState({ status: 'idle' })

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const dueAt = toAssignmentUpdateDeadline(form.dueAt, assignment.dueAt)
    if (!form.title.trim() || !dueAt) {
      setState({ status: 'error', message: 'Nhập tên và hạn nộp hợp lệ.' })
      return
    }

    setState({ status: 'loading' })
    try {
      await assignmentService.updateAssignment(assignment.id, {
        title: form.title.trim(),
        due_at: dueAt,
        coverage_threshold: Number(form.threshold),
        status: form.status,
      })
      onSaved()
    } catch (error) {
      setState({ status: 'error', message: error?.message ?? 'Không thể cập nhật bài kiểm tra.' })
    }
  }

  return (
    <form className="assignment-edit-form teacher-edit-form tk-assignment-paper tk-assignment-editor" noValidate onSubmit={handleSubmit} aria-labelledby="assignment-edit-heading">
      <AssignmentPaperEdge />
      <div className="tk-form-editor-heading"><h2 id="assignment-edit-heading">Chỉnh sửa bài kiểm tra</h2><p>Thời hạn được hiển thị theo giờ Việt Nam (UTC+7).</p></div>
      <div className="form-fields teacher-fields-grid">
        <div className="form-field form-field-wide teacher-field teacher-field-wide">
          <label htmlFor="edit-assignment-title">Tên bài kiểm tra</label>
          <input id="edit-assignment-title" name="title" onChange={handleChange} value={form.title} />
        </div>
        <div className="form-field teacher-field">
          <label htmlFor="edit-assignment-due">Hạn nộp</label>
          <input id="edit-assignment-due" name="dueAt" onChange={handleChange} type="datetime-local" value={form.dueAt} />
        </div>
        <div className="form-field form-field-narrow teacher-field teacher-field-narrow">
          <label htmlFor="edit-assignment-threshold">Ngưỡng đạt (%)</label>
          <input id="edit-assignment-threshold" max="100" min="0" name="threshold" onChange={handleChange} type="number" value={form.threshold} />
        </div>
        <div className="form-field form-field-narrow teacher-field teacher-field-narrow">
          <label htmlFor="edit-assignment-status">Trạng thái</label>
          <select id="edit-assignment-status" name="status" onChange={handleChange} value={form.status}>
            <option value="DRAFT">Bản nháp</option>
            <option value="OPEN">Đang mở</option>
            <option value="CLOSED">Đã đóng</option>
          </select>
        </div>
      </div>
      {state.status === 'error' && <div className="form-submit-message form-submit-error" role="alert">{state.message}</div>}
      <div className="assignment-form-actions teacher-form-actions">
        <button className="button button-outline" onClick={onCancel} type="button">Hủy</button>
        <button className="button button-primary" aria-busy={state.status === 'loading'} disabled={state.status === 'loading'} type="submit">
          {state.status === 'loading' ? 'Đang lưu...' : 'Lưu thay đổi'}
        </button>
      </div>
    </form>
  )
}
