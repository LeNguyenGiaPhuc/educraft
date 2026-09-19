import { useState } from 'react'

import AdminModal from './AdminModal.jsx'
import { adminClassService } from '../services/adminClassService.js'
import { ApiError } from '../services/apiClient.js'

function AdminClassForm({ initialClass = null, teachers = [], onCancel, onSaved }) {
  const isEdit = Boolean(initialClass?.id)
  const [form, setForm] = useState({
    id: initialClass?.code ?? initialClass?.id ?? '',
    name: initialClass?.subject ?? '',
    semester: initialClass?.semester ?? 'Học kỳ 1',
    schoolYear: initialClass?.school_year ?? 'Năm học 2026–2027',
    teacherId: initialClass?.teacher_id ?? initialClass?.teacher?.id ?? initialClass?.teacherId ?? '',
  })
  const [errors, setErrors] = useState({})

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined, form: undefined }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setErrors({})

    try {
      const payload = {
        code: form.id.trim().toUpperCase(),
        subject: form.name.trim(),
        semester: form.semester.trim(),
        school_year: form.schoolYear.trim(),
        teacher_id: form.teacherId || null,
        status: 'ACTIVE',
      }

      const result = isEdit
        ? await adminClassService.updateClass(initialClass.id, payload)
        : await adminClassService.createClass(payload)

      onSaved(result)
    } catch (caughtError) {
      const message = caughtError instanceof ApiError ? caughtError.message : caughtError?.message ?? 'Không thể lưu lớp học.'
      const fieldMessages = {}

      if (caughtError instanceof ApiError && caughtError.fields) {
        Object.entries(caughtError.fields).forEach(([key, value]) => {
          fieldMessages[key] = Array.isArray(value) ? value[0] : value
        })
      }

      setErrors({ form: message, ...fieldMessages })
    }
  }

  return (
    <AdminModal labelledBy="class-modal-title" onClose={onCancel}>
        <div className="admin-modal-header">
          <div>
            <span className="panel-subtitle">Lớp học</span>
            <h2 id="class-modal-title">{isEdit ? 'Chỉnh sửa lớp' : 'Tạo lớp'}</h2>
          </div>
          <button aria-label="Đóng cửa sổ" className="icon-button" data-modal-initial-focus title="Đóng" type="button" onClick={onCancel}>×</button>
        </div>

        <form className="admin-form admin-class-form" noValidate onSubmit={handleSubmit}>
          {errors.form && <p className="form-field-error" role="alert">{errors.form}</p>}

          <div className="form-grid">
            <label className="field-label">
              <span>Môn học *</span>
              <input value={form.name} onChange={(event) => updateField('name', event.target.value)} />
              {errors.subject && <small className="field-error">{errors.subject}</small>}
            </label>

            <label className="field-label">
              <span>Mã lớp *</span>
              <input disabled={isEdit} value={form.id} onChange={(event) => updateField('id', event.target.value.toUpperCase())} />
              {errors.id && <small className="field-error">{errors.id}</small>}
            </label>

            <label className="field-label">
              <span>Học kỳ *</span>
              <input value={form.semester} onChange={(event) => updateField('semester', event.target.value)} />
              {errors.semester && <small className="field-error">{errors.semester}</small>}
            </label>

            <label className="field-label">
              <span>Năm học *</span>
              <input value={form.schoolYear} onChange={(event) => updateField('schoolYear', event.target.value)} />
              {errors.school_year && <small className="field-error">{errors.school_year}</small>}
            </label>

            <label className="field-label">
              <span>Giáo viên phụ trách</span>
              <select value={form.teacherId} onChange={(event) => updateField('teacherId', event.target.value)}>
                <option value="">Chưa phân công</option>
                {teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.full_name ?? teacher.name}</option>)}
              </select>
              {errors.teacherId && <small className="field-error">{errors.teacherId}</small>}
            </label>
          </div>

          <div className="admin-form-actions">
            <button className="button button-outline" type="button" onClick={onCancel}>Hủy</button>
            <button className="button button-primary" type="submit">{isEdit ? 'Lưu thay đổi' : 'Tạo lớp'}</button>
          </div>
        </form>
    </AdminModal>
  )
}

export default AdminClassForm
