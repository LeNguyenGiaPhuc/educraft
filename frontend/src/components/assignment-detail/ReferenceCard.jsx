import { useReducer, useState } from 'react'

import {
  createReferenceEditorState,
  referenceEditorReducer,
} from '../../data/referenceEditorState.js'
import { referenceService } from '../../services/referenceService.js'
import FieldError from './FieldError.jsx'
import { formatSubmissionDate } from './assignmentDetailView.js'

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024
const ACCEPTED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

function validateReferenceFile(file) {
  if (!file) return 'Chọn bài mẫu của giáo viên để tải lên.'
  if (!ACCEPTED_FILE_TYPES.includes(file.type)) return 'Chỉ nhận file JPG, JPEG, PNG hoặc WebP cho bài mẫu.'
  if (!Number.isFinite(file.size) || file.size <= 0) return 'File bài mẫu không hợp lệ.'
  if (file.size > MAX_FILE_SIZE_BYTES) return 'Kích thước bài mẫu không được vượt quá 5 MB.'
  return ''
}

export function ReferenceFeedback({ state, successMessage }) {
  if (state.status === 'error') {
    return <div className="form-submit-message form-submit-error" role="alert">{state.message}</div>
  }
  if (state.status === 'success') {
    return <div className="form-submit-message form-submit-success" role="status">{successMessage}</div>
  }
  return null
}

export function ReferenceEditor({ editor, onCancel, onFileChange, onSubmit }) {
  const inputId = editor.mode === 'add'
    ? 'reference-file-add'
    : `reference-file-${editor.referenceId}`
  const helpId = `${inputId}-help`
  const errorId = `${inputId}-error`
  const isAdd = editor.mode === 'add'

  return (
    <form className="reference-form reference-inline-form teacher-reference-form" noValidate onSubmit={onSubmit}>
      <div className="form-field teacher-field">
        <label htmlFor={inputId}>
          {isAdd ? 'Chọn bài mẫu mới' : 'Chọn file thay thế'} <span aria-hidden="true">*</span>
        </label>
        <input
          accept="image/png,image/jpeg,image/webp"
          aria-describedby={editor.error ? `${helpId} ${errorId}` : helpId}
          aria-invalid={Boolean(editor.error)}
          id={inputId}
          onChange={onFileChange}
          type="file"
        />
        <p className="form-field-help" id={helpId}>JPG, JPEG, PNG hoặc WebP, tối đa 5 MB.</p>
        {editor.file && <p className="form-field-help">Đã chọn: {editor.file.name}</p>}
        <FieldError id={errorId} message={editor.error} />
      </div>

      <ReferenceFeedback
        state={editor}
        successMessage={isAdd ? 'Đã thêm bài mẫu.' : 'Đã thay bài mẫu.'}
      />

      <div className="assignment-form-actions teacher-form-actions">
        <button
          className="button button-outline"
          disabled={editor.status === 'loading'}
          onClick={onCancel}
          type="button"
        >
          Hủy
        </button>
        <button
          aria-busy={editor.status === 'loading'}
          className="button button-primary"
          disabled={editor.status === 'loading'}
          type="submit"
        >
          {editor.status === 'loading'
            ? 'Đang lưu...'
            : isAdd ? 'Thêm bài mẫu' : 'Lưu thay đổi'}
        </button>
      </div>
    </form>
  )
}

export function ReferenceCard({ assignment, references = [], onChanged }) {
  const [editor, dispatchEditor] = useReducer(
    referenceEditorReducer,
    undefined,
    createReferenceEditorState,
  )
  const [deleteState, setDeleteState] = useState({ status: 'idle', referenceId: null })

  function handleFileChange(event) {
    dispatchEditor({ type: 'SELECT_FILE', file: event.target.files?.[0] ?? null })
  }

  async function handleSave(event) {
    event.preventDefault()
    const validationError = validateReferenceFile(editor.file)
    if (validationError) {
      dispatchEditor({ type: 'VALIDATION_ERROR', message: validationError })
      return
    }

    dispatchEditor({ type: 'REQUEST_START' })
    try {
      if (editor.mode === 'replace') {
        await referenceService.replaceReference(
          assignment.id,
          editor.referenceId,
          editor.file,
          editor.file.name,
        )
      } else {
        await referenceService.uploadReference(assignment.id, editor.file, editor.file.name)
      }
      dispatchEditor({
        type: 'REQUEST_SUCCESS',
        message: editor.mode === 'replace' ? 'Đã thay bài mẫu.' : 'Đã thêm bài mẫu.',
      })
      onChanged()
    } catch (requestError) {
      dispatchEditor({
        type: 'REQUEST_ERROR',
        message: requestError?.message ?? (editor.mode === 'replace'
          ? 'Không thể thay bài mẫu lúc này. Vui lòng thử lại.'
          : 'Không thể thêm bài mẫu lúc này. Vui lòng thử lại.'),
      })
    }
  }

  async function handleDelete(referenceId) {
    if (typeof window !== 'undefined' && !window.confirm('Bạn có chắc muốn xóa bài mẫu này không?')) return

    setDeleteState({ status: 'loading', referenceId })
    try {
      await referenceService.deleteReference(assignment.id, referenceId)
      setDeleteState({ status: 'idle', referenceId: null })
      if (editor.referenceId === referenceId) dispatchEditor({ type: 'CLOSE' })
      onChanged()
    } catch (requestError) {
      setDeleteState({
        status: 'error',
        referenceId,
        message: requestError?.message ?? 'Không thể xóa bài mẫu lúc này. Vui lòng thử lại.',
      })
    }
  }

  return (
    <section className="assignment-detail-card teacher-detail-card teacher-reference-card" aria-labelledby="reference-title">
      <div className="assignment-detail-card-heading teacher-detail-card-heading">
        <div>
          <p className="state-kicker">Tài liệu đối chiếu</p>
          <h2 id="reference-title">Bài mẫu của giáo viên</h2>
        </div>
        <span className="detail-card-label teacher-count-label">{references.length} bài mẫu</span>
      </div>

      <p className="assignment-detail-card-description">
        Upload ảnh bài ghi mẫu để làm tài liệu tham chiếu khi AI phân tích và giáo viên chấm duyệt.
      </p>

      <ReferenceFeedback
        state={editor.notice ?? { status: 'idle' }}
        successMessage={editor.notice?.message ?? ''}
      />

      {references.length === 0 ? (
        <div className="reference-empty teacher-reference-empty">Chưa có bài mẫu cho bài kiểm tra này.</div>
      ) : (
        <div className="reference-list teacher-reference-list">
          {references.map((reference) => (
            <div className="reference-entry teacher-reference-entry" key={reference.id}>
              <div className="reference-file teacher-reference-file">
                <div className="reference-file-details teacher-reference-file-details">
                  <strong title={reference.fileName}>{reference.fileName}</strong>
                  <span>Tạo lúc {formatSubmissionDate(reference.uploadedAt)}</span>
                  {reference.url && (
                    <a href={reference.url} target="_blank" rel="noreferrer">Xem bài mẫu</a>
                  )}
                </div>
                <div className="reference-actions teacher-reference-actions">
                  <button
                    aria-label="Thay bài mẫu"
                    className="icon-button reference-action-button"
                    disabled={deleteState.status === 'loading'}
                    onClick={() => dispatchEditor({
                      type: 'OPEN_REPLACE',
                      referenceId: reference.id,
                    })}
                    title="Thay bài mẫu"
                    type="button"
                  >
                    <svg aria-hidden="true" viewBox="0 0 24 24">
                      <path d="M4 20h4l11-11-4-4L4 16v4Z" />
                      <path d="m13.5 6.5 4 4" />
                    </svg>
                  </button>
                  <button
                    aria-label="Xóa bài mẫu"
                    className="icon-button reference-action-button reference-action-delete"
                    disabled={deleteState.status === 'loading'}
                    onClick={() => handleDelete(reference.id)}
                    title="Xóa bài mẫu"
                    type="button"
                  >
                    <svg aria-hidden="true" viewBox="0 0 24 24">
                      <path d="M4 7h16" />
                      <path d="M9 7V4h6v3" />
                      <path d="m6 7 1 13h10l1-13" />
                      <path d="M10 11v5M14 11v5" />
                    </svg>
                  </button>
                </div>
              </div>
              {editor.mode === 'replace' && editor.referenceId === reference.id && (
                <ReferenceEditor
                  editor={editor}
                  onCancel={() => dispatchEditor({ type: 'CLOSE' })}
                  onFileChange={handleFileChange}
                  onSubmit={handleSave}
                />
              )}
              {deleteState.status === 'error' && deleteState.referenceId === reference.id && (
                <ReferenceFeedback state={deleteState} successMessage="" />
              )}
            </div>
          ))}
        </div>
      )}

      {editor.mode === 'add' ? (
        <ReferenceEditor
          editor={editor}
          onCancel={() => dispatchEditor({ type: 'CLOSE' })}
          onFileChange={handleFileChange}
          onSubmit={handleSave}
        />
      ) : (
        <button
          className="button button-outline reference-add-button teacher-reference-add-button"
          onClick={() => dispatchEditor({ type: 'OPEN_ADD' })}
          type="button"
        >
          + Thêm bài mẫu
        </button>
      )}
    </section>
  )
}
