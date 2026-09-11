import { useState } from 'react'

import {
  createStoredClass,
  deleteStoredClass,
  updateStoredClass,
} from '../data/mockClassStore.js'

const emptyForm = {
  id: '',
  subject: '',
  semester: 'Học kỳ 1',
  schoolYear: 'Năm học 2026–2027',
}

function formFromClassroom(classroom) {
  return {
    id: classroom.id,
    subject: classroom.subject,
    semester: classroom.semester,
    schoolYear: classroom.schoolYear,
  }
}

function FieldError({ error, id }) {
  if (!error) {
    return null
  }

  return (
    <p className="form-field-error" id={id}>
      {error}
    </p>
  )
}

function ClassForm({ classroom, onCancel, onSaved }) {
  const [form, setForm] = useState(() => (classroom ? formFromClassroom(classroom) : emptyForm))
  const [errors, setErrors] = useState({})
  const isEditing = Boolean(classroom)

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined, form: undefined }))
  }

  function handleSubmit(event) {
    event.preventDefault()

    const result = isEditing
      ? updateStoredClass(classroom.id, form)
      : createStoredClass(form)

    if (result.status === 'error') {
      setErrors(result.errors)
      return
    }

    onSaved(result.data, isEditing ? 'updated' : 'created')
  }

  return (
    <form className="class-management-form" onSubmit={handleSubmit} noValidate>
      <div className="class-management-form-heading">
        <div>
          <p className="state-kicker">{isEditing ? 'Chỉnh sửa lớp' : 'Lớp mới'}</p>
          <h3>{isEditing ? `Cập nhật ${classroom.name}` : 'Tạo lớp học'}</h3>
        </div>
        <button className="button button-outline" type="button" onClick={onCancel}>
          Hủy
        </button>
      </div>

      {errors.form && (
        <div className="form-error-summary" role="alert">
          <strong>Chưa thể lưu lớp</strong>
          <span>{errors.form}</span>
        </div>
      )}

      <div className="class-management-form-fields">
        <div className="form-field">
          <label htmlFor="class-id">
            Mã lớp <span aria-hidden="true">*</span>
          </label>
          <input
            id="class-id"
            value={form.id}
            disabled={isEditing}
            aria-invalid={Boolean(errors.id)}
            aria-describedby={errors.id ? 'class-id-error' : undefined}
            onChange={(event) => updateField('id', event.target.value)}
          />
          <FieldError error={errors.id} id="class-id-error" />
        </div>

        <div className="form-field">
          <label htmlFor="class-subject">
            Môn học <span aria-hidden="true">*</span>
          </label>
          <input
            id="class-subject"
            value={form.subject}
            aria-invalid={Boolean(errors.subject)}
            aria-describedby={errors.subject ? 'class-subject-error' : undefined}
            onChange={(event) => updateField('subject', event.target.value)}
          />
          <FieldError error={errors.subject} id="class-subject-error" />
        </div>

        <div className="form-field">
          <label htmlFor="class-semester">
            Học kỳ <span aria-hidden="true">*</span>
          </label>
          <input
            id="class-semester"
            value={form.semester}
            aria-invalid={Boolean(errors.semester)}
            aria-describedby={errors.semester ? 'class-semester-error' : undefined}
            onChange={(event) => updateField('semester', event.target.value)}
          />
          <FieldError error={errors.semester} id="class-semester-error" />
        </div>

        <div className="form-field">
          <label htmlFor="class-school-year">
            Năm học <span aria-hidden="true">*</span>
          </label>
          <input
            id="class-school-year"
            value={form.schoolYear}
            aria-invalid={Boolean(errors.schoolYear)}
            aria-describedby={errors.schoolYear ? 'class-school-year-error' : undefined}
            onChange={(event) => updateField('schoolYear', event.target.value)}
          />
          <FieldError error={errors.schoolYear} id="class-school-year-error" />
        </div>
      </div>

      <div className="class-management-form-actions">
        <button className="button button-primary" type="submit">
          {isEditing ? 'Lưu thay đổi' : 'Tạo lớp'}
        </button>
      </div>
    </form>
  )
}

function ClassManagementPanel({ classes, onChanged }) {
  const [formClass, setFormClass] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [notice, setNotice] = useState('')
  const [noticeTone, setNoticeTone] = useState('success')

  function openCreateForm() {
    setFormClass(null)
    setShowForm(true)
    setNotice('')
  }

  function openEditForm(classroom) {
    setFormClass(classroom)
    setShowForm(true)
    setNotice('')
  }

  function handleSaved(classroom, action) {
    onChanged()
    setShowForm(false)
    setFormClass(null)
    setNoticeTone('success')
    setNotice(
      action === 'updated'
        ? `Đã cập nhật lớp ${classroom.name}.`
        : `Đã tạo lớp ${classroom.name}.`,
    )
  }

  function handleDelete(classroom) {
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa lớp ${classroom.name}? Dữ liệu lớp mock sẽ bị xóa khỏi danh sách.`,
    )

    if (!confirmed) {
      return
    }

    const result = deleteStoredClass(classroom.id)

    if (result.status === 'error') {
      setNoticeTone('error')
      setNotice(result.errors.form)
      return
    }

    onChanged()
    setNoticeTone('success')
    setNotice(`Đã xóa lớp ${classroom.name}.`)
  }

  return (
    <section className="class-management" aria-labelledby="class-management-title">
      <div className="class-management-heading">
        <div>
          <p className="state-kicker">Không gian giáo viên</p>
          <h2 id="class-management-title">Quản lý lớp học</h2>
          <p>Tạo lớp mới hoặc cập nhật thông tin môn học của lớp đang phụ trách.</p>
        </div>
        {!showForm && (
          <button className="button button-primary" type="button" onClick={openCreateForm}>
            Tạo lớp
          </button>
        )}
      </div>

      {notice && (
        <p className={`class-management-notice class-management-notice-${noticeTone}`} role="status">
          {notice}
        </p>
      )}

      {showForm && (
        <ClassForm
          classroom={formClass}
          onCancel={() => {
            setShowForm(false)
            setFormClass(null)
          }}
          onSaved={handleSaved}
        />
      )}

      <div className="class-management-list">
        {classes.map((classroom) => (
          <div className="class-management-row" key={classroom.id}>
            <div>
              <strong>{classroom.name}</strong>
              <span>
                {classroom.id} · {classroom.semester} · {classroom.schoolYear}
              </span>
            </div>
            <div className="class-management-row-actions">
              <button
                className="button button-outline"
                type="button"
                onClick={() => openEditForm(classroom)}
              >
                Chỉnh sửa
              </button>
              <button
                className="button button-danger"
                type="button"
                onClick={() => handleDelete(classroom)}
              >
                Xóa
              </button>
            </div>
          </div>
        ))}
        {classes.length === 0 && (
          <p className="class-management-empty">Chưa có lớp nào. Hãy tạo lớp đầu tiên.</p>
        )}
      </div>
    </section>
  )
}

export default ClassManagementPanel
