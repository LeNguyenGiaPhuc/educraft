import { useState } from 'react'

import { useAdminScope } from './admin/registryHooks.js'
import { buildClassPayload } from '../data/adminClass.js'
import { registryFieldErrors } from '../data/adminRegistry.js'
import AdminModal from './AdminModal.jsx'
import { adminClassService } from '../services/adminClassService.js'
import { ApiError } from '../services/apiClient.js'

function AdminClassForm({ initialClass = null, teachers = [], onCancel, onSaved }) {
  const scope = useAdminScope()
  const [submitting,setSubmitting] = useState(false)
  const isEdit = Boolean(initialClass?.id)
  const [form, setForm] = useState({
    id: initialClass?.code ?? initialClass?.id ?? '',
    name: initialClass?.subject ?? '',
    semester: initialClass?.semester ?? 'Học kỳ 1',
    schoolYear: initialClass?.school_year ?? 'Năm học 2026–2027',
    teacherId: initialClass?.teacher_id ?? initialClass?.teacher?.id ?? initialClass?.teacherId ?? '',
    status: String(initialClass?.status ?? 'ACTIVE').toUpperCase(),
  })
  const [errors, setErrors] = useState({})

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined, form: undefined }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setErrors({})

    return scope.mutate('save', async () => {
      setSubmitting(true)
      const payload = buildClassPayload(form)

      return isEdit
        ? await adminClassService.updateClass(initialClass.id, payload)
        : await adminClassService.createClass(payload)

    }, { success: onSaved, error: caughtError => {
      const message = caughtError instanceof ApiError ? caughtError.message : caughtError?.message ?? 'Không thể lưu lớp học.'
      const fieldMessages = registryFieldErrors(caughtError instanceof ApiError ? caughtError.fields : {})

      setErrors({ form: message, ...fieldMessages })
    }, settled: () => setSubmitting(false) })
  }

  return (
    <AdminModal labelledBy="class-modal-title" onClose={onCancel}>
        <div className="admin-modal-header">
          <div>
            <h2 id="class-modal-title">{isEdit ? 'Chỉnh sửa lớp' : 'Tạo lớp'}</h2>
          </div>
          <button aria-label="Đóng cửa sổ" className="icon-button" data-modal-initial-focus title="Đóng" type="button" onClick={onCancel}>×</button>
        </div>

        <form className="admin-form admin-class-form" noValidate onSubmit={handleSubmit}>
          {errors.form && <p className="form-field-error" role="alert">{errors.form}</p>}

          <fieldset className="form-grid" disabled={submitting}>
            <label className="field-label">
              <span>Môn học *</span>
              <input value={form.name} onChange={(event) => updateField('name', event.target.value)} />
              {errors.name && <small className="field-error">{errors.name}</small>}
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
              {errors.schoolYear && <small className="field-error">{errors.schoolYear}</small>}
            </label>

            <label className="field-label">
              <span>Giáo viên phụ trách</span>
              <select value={form.teacherId} onChange={(event) => updateField('teacherId', event.target.value)}>
                <option value="">Chưa phân công</option>
                {teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.full_name ?? teacher.name}</option>)}
              </select>
              {errors.teacherId && <small className="field-error">{errors.teacherId}</small>}
            </label>

            <label className="field-label">
              <span>Trạng thái lớp *</span>
              <select value={form.status} onChange={(event) => updateField('status', event.target.value)}>
                <option value="ACTIVE">Đang hoạt động</option>
                <option value="ARCHIVED">Đã lưu trữ</option>
              </select>
              {errors.status && <small className="field-error">{errors.status}</small>}
            </label>
          </fieldset>

          <div className="admin-form-actions">
            <button className="button button-outline" type="button" onClick={onCancel}>Hủy</button>
            <button className="button button-primary" type="submit" disabled={submitting}>{submitting ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Tạo lớp'}</button>
          </div>
        </form>
    </AdminModal>
  )
}

export default AdminClassForm
