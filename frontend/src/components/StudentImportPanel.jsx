import { useRef, useState } from 'react'

import { mergeStudentRows } from '../data/mockStudentStore.js'
import { readStudentExcel } from '../data/studentImport.js'

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024

function ImportErrors({ errors }) {
  if (errors.length === 0) {
    return null
  }

  return (
    <div className="student-import-errors" role="alert">
      <strong>File có dòng chưa hợp lệ:</strong>
      <ul>
        {errors.slice(0, 8).map((error) => (
          <li key={`${error.rowNumber}-${error.message}`}>
            Dòng {error.rowNumber}: {error.message}
          </li>
        ))}
      </ul>
      {errors.length > 8 && <span>Và còn {errors.length - 8} lỗi khác.</span>}
    </div>
  )
}

function StudentImportPanel({ classId, onCancel, onImported }) {
  const inputRef = useRef(null)
  const [fileName, setFileName] = useState('')
  const [preview, setPreview] = useState(null)
  const [errors, setErrors] = useState([])
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')

  async function handleFileChange(event) {
    const file = event.target.files?.[0]

    setFileName(file?.name ?? '')
    setPreview(null)
    setErrors([])
    setMessage('')

    if (!file) {
      setStatus('idle')
      return
    }

    if (!file.name.toLocaleLowerCase('vi-VN').endsWith('.xlsx')) {
      setStatus('error')
      setMessage('Chỉ hỗ trợ file Excel định dạng .xlsx.')
      return
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setStatus('error')
      setMessage('File Excel không được vượt quá 5 MB.')
      return
    }

    setStatus('loading')

    try {
      const result = await readStudentExcel(file)
      setPreview(result.rows)
      setErrors(result.errors)
      setStatus(result.rows.length > 0 && result.errors.length === 0 ? 'preview' : 'error')
      setMessage(
        result.rows.length > 0 && result.errors.length === 0
          ? `Đã đọc ${result.rows.length} học sinh. Kiểm tra lại trước khi lưu.`
          : '',
      )
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : 'Không thể đọc file Excel.')
    }
  }

  function handleImport() {
    if (!preview || preview.length === 0) {
      return
    }

    const result = mergeStudentRows(classId, preview)

    if (result.status === 'error') {
      setStatus('error')
      setErrors(result.errors)
      setMessage('Không thể lưu danh sách học sinh.')
      return
    }

    setStatus('success')
    setMessage(`Đã thêm ${result.addedCount} học sinh, bỏ qua ${result.skippedCount} mã trùng.`)
    onImported()
  }

  return (
    <section className="student-import-panel" aria-labelledby="student-import-title">
      <div className="student-import-heading">
        <div>
          <p className="state-kicker">Nhập dữ liệu hàng loạt</p>
          <h3 id="student-import-title">Nhập danh sách học sinh từ Excel</h3>
          <p>
            File cần có cột <strong>Mã học sinh</strong> và <strong>Họ và tên</strong>. Cột Email là tùy chọn.
          </p>
        </div>
        <button className="button button-outline" type="button" onClick={onCancel}>
          Đóng
        </button>
      </div>

      <div className="student-import-picker">
        <input
          ref={inputRef}
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="visually-hidden"
          id="student-import-file"
          onChange={handleFileChange}
          type="file"
        />
        <label className="button button-outline" htmlFor="student-import-file">
          Chọn file Excel
        </label>
        <span>{fileName || 'Chưa chọn file'}</span>
        <small>Tối đa 5 MB · Định dạng .xlsx</small>
      </div>

      {status === 'loading' && (
        <p className="student-import-status" role="status" aria-live="polite">
          Đang đọc file Excel...
        </p>
      )}

      {message && status !== 'loading' && (
        <p
          className={`student-import-status student-import-status-${status}`}
          role={status === 'error' ? 'alert' : 'status'}
          aria-live="polite"
        >
          {message}
        </p>
      )}

      <ImportErrors errors={errors} />

      {preview && preview.length > 0 && status === 'preview' && (
        <div className="student-import-preview">
          <strong>Xem trước danh sách</strong>
          <div className="student-import-preview-wrap">
            <table>
              <thead>
                <tr>
                  <th>Mã học sinh</th>
                  <th>Họ và tên</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 5).map((student) => (
                  <tr key={student.code}>
                    <td>{student.code}</td>
                    <td>{student.name}</td>
                    <td>{student.email || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.length > 5 && <small>Đang hiển thị 5/{preview.length} dòng đầu tiên.</small>}
        </div>
      )}

      <div className="student-import-actions">
        <button
          className="button button-primary"
          disabled={status !== 'preview'}
          type="button"
          onClick={handleImport}
        >
          Xác nhận nhập danh sách
        </button>
        {status === 'success' && (
          <button
            className="button button-outline"
            type="button"
            onClick={() => {
              setFileName('')
              setPreview(null)
              setErrors([])
              setMessage('')
              setStatus('idle')
              if (inputRef.current) {
                inputRef.current.value = ''
              }
            }}
          >
            Nhập file khác
          </button>
        )}
      </div>
    </section>
  )
}

export default StudentImportPanel
