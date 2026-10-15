import { useState } from 'react'

import { useAdminScope } from './admin/registryHooks.js'
import { buildClassPayload } from '../data/adminClass.js'
import { registryFieldErrors } from '../data/adminRegistry.js'
import AdminModal from './AdminModal.jsx'
import { adminClassService } from '../services/adminClassService.js'
import { ApiError } from '../services/apiClient.js'
import FormField from './kinetic/FormField.jsx'

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
            <FormField label="Môn học *" error={errors.name}>
              <input value={form.name} onChange={(event) => updateField('name', event.target.value)} />
            </FormField>

            <FormField label="Mã lớp *" error={errors.id}>
              <input disabled={isEdit} value={form.id} onChange={(event) => updateField('id', event.target.value.toUpperCase())} />
            </FormField>

            <FormField label="Học kỳ *" error={errors.semester}>
              <input value={form.semester} onChange={(event) => updateField('semester', event.target.value)} />
            </FormField>

            <FormField label="Năm học *" error={errors.schoolYear}>
              <input value={form.schoolYear} onChange={(event) => updateField('schoolYear', event.target.value)} />
            </FormField>

            <FormField label="Giáo viên phụ trách" error={errors.teacherId}>
              <select value={form.teacherId} onChange={(event) => updateField('teacherId', event.target.value)}>
                <option value="">Chưa phân công</option>
                {teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.full_name ?? teacher.name}</option>)}
              </select>
            </FormField>

            <FormField label="Trạng thái lớp *" error={errors.status}>
              <select value={form.status} onChange={(event) => updateField('status', event.target.value)}>
                <option value="ACTIVE">Đang hoạt động</option>
                <option value="ARCHIVED">Đã lưu trữ</option>
              </select>
            </FormField>
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
