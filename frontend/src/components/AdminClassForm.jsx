import { useState } from 'react'

import { createAdminClass, updateAdminClass } from '../data/mockAdminStore.js'

function AdminClassForm({ initialClass = null, teachers = [], onCancel, onSaved }) {
  const isEdit = Boolean(initialClass?.id)
  const [form, setForm] = useState({
    id: initialClass?.id ?? '',
    name: initialClass?.subject ?? '',
    semester: initialClass?.semester ?? 'Học kỳ 1',
    schoolYear: initialClass?.schoolYear ?? 'Năm học 2026–2027',
    teacherId: initialClass?.teacher?.id ?? initialClass?.teacherId ?? '',
  })
  const [errors, setErrors] = useState({})

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined, form: undefined }))
  }

  function handleSubmit(event) {
    event.preventDefault()

    const result = isEdit
      ? updateAdminClass(initialClass.id, form)
      : createAdminClass(form)

    if (result.status === 'error') {
      setErrors(result.errors ?? {})
      return
    }

    onSaved(result.data)
  }

  return (
    <div className="admin-modal-backdrop">
      <div aria-labelledby="class-modal-title" aria-modal="true" className="admin-modal" role="dialog">
        <div className="admin-modal-header">
          <div>
            <span className="panel-subtitle">Lớp học</span>
            <h2 id="class-modal-title">{isEdit ? 'Chỉnh sửa lớp' : 'Tạo lớp'}</h2>
          </div>
          <button aria-label="Đóng cửa sổ" className="icon-button" title="Đóng" type="button" onClick={onCancel}>×</button>
        </div>

        <form className="admin-form" noValidate onSubmit={handleSubmit}>
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
              {errors.schoolYear && <small className="field-error">{errors.schoolYear}</small>}
            </label>

            <label className="field-label">
              <span>Giáo viên phụ trách</span>
              <select value={form.teacherId} onChange={(event) => updateField('teacherId', event.target.value)}>
                <option value="">Chưa phân công</option>
                {teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}
              </select>
              {errors.teacherId && <small className="field-error">{errors.teacherId}</small>}
            </label>
          </div>

          <div className="admin-form-actions">
            <button className="button button-outline" type="button" onClick={onCancel}>Hủy</button>
            <button className="button button-primary" type="submit">{isEdit ? 'Lưu thay đổi' : 'Tạo lớp'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AdminClassForm
