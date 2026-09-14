import { useRef, useState } from 'react'

import { adminClassService } from '../services/adminClassService.js'
import { ApiError } from '../services/apiClient.js'
import { readStudentExcel } from '../data/studentImport.js'

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024

function ImportErrors({ errors }) {
  if (errors.length === 0) {
    return null
  }

  return (
    <div className="student-import-errors" role="alert">
      <strong>Chưa thể import file này:</strong>
      <ul>
        {errors.slice(0, 8).map((error, index) => (
          <li key={`${error.rowNumber}-${error.message}-${index}`}>
            {error.rowNumber ? `Dòng ${error.rowNumber}: ` : ''}{error.message}
          </li>
        ))}
      </ul>
      {errors.length > 8 && <span>Và còn {errors.length - 8} lỗi khác.</span>}
    </div>
  )
}

function entryLabel(entry) {
  if (!entry) {
    return 'Không hợp lệ'
  }

  if (entry.kind === 'new') {
    return 'Tạo tài khoản · Chờ kích hoạt'
  }

  if (entry.kind === 'existing') {
    return 'Thêm tài khoản hiện có'
  }

  return 'Đã có trong lớp'
}

function StudentImportPanel({ classId, onCancel, onImported }) {
  const inputRef = useRef(null)
  const [fileName, setFileName] = useState('')
  const [preview, setPreview] = useState(null)
  const [errors, setErrors] = useState([])
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')
  const [downloadingTemplate, setDownloadingTemplate] = useState(false)

  async function downloadTemplate() {
    setDownloadingTemplate(true)

    try {
      const XLSX = await import('xlsx')
      const worksheet = XLSX.utils.aoa_to_sheet([
        ['STT', 'Họ và tên', 'Email'],
        ['', '', ''],
      ])
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Danh sách học sinh')
      XLSX.writeFile(workbook, 'mau-danh-sach-hoc-sinh.xlsx')
    } catch {
      setStatus('error')
      setMessage('Không thể tạo file Excel mẫu.')
    } finally {
      setDownloadingTemplate(false)
    }
  }

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
      const validationErrors = [...result.errors]

      if (result.rows.some((row) => !row.studentNumber)) {
        validationErrors.push({ rowNumber: 1, message: 'File import lớp phải có đủ ba cột STT, Họ và tên, Email.' })
      }

      let plan = null
      if (validationErrors.length === 0 && result.rows.length > 0) {
        plan = {
          summary: {
            total: result.rows.length,
            newAccounts: result.rows.length,
            existingAccounts: 0,
            alreadyInClass: 0,
          },
          errors: [],
          warnings: [],
          entries: result.rows.map((row) => ({
            email: row.email,
            kind: 'new',
          })),
        }
      }

      setPreview(plan ? { ...plan, rows: result.rows } : null)
      setErrors(validationErrors)
      setStatus(result.rows.length > 0 ? 'preview' : 'error')
      setMessage(
        result.rows.length > 0
          ? validationErrors.length === 0
            ? `Đã đọc ${result.rows.length} học sinh. Kiểm tra lại trước khi lưu.`
            : 'File đã đọc được nhưng còn lỗi cần xử lý trước khi import.'
          : '',
      )
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : 'Không thể đọc file Excel.')
    }
  }

  async function handleImport() {
    if (!preview || preview.rows.length === 0 || preview.errors.length > 0) {
      return
    }

    try {
      const result = await adminClassService.importStudents(classId, {
        students: preview.rows.map((row) => ({
          studentNumber: row.studentNumber,
          name: row.name,
          email: row.email,
        })),
      })

      setStatus('success')
      setMessage(
        `Đã tạo ${result.created ?? 0} tài khoản mới, thêm ${result.assigned ?? 0} tài khoản có sẵn và bỏ qua ${result.skipped ?? 0} học sinh đã có trong lớp.`,
      )
      onImported?.(result)
    } catch (caughtError) {
      const errorsFromApi = caughtError instanceof ApiError && caughtError.fields?.rows
        ? caughtError.fields.rows.map((row) => ({
            rowNumber: row.rowNumber ?? 1,
            message: row.error ?? row.message ?? 'Không thể import học sinh.',
          }))
        : []

      setStatus('error')
      setErrors(errorsFromApi.length ? errorsFromApi : [
        { rowNumber: 1, message: caughtError instanceof ApiError ? caughtError.message : caughtError?.message ?? 'Không thể lưu danh sách học sinh.' },
      ])
      setMessage('Không thể lưu danh sách học sinh.')
    }
  }

  function reset() {
    setFileName('')
    setPreview(null)
    setErrors([])
    setMessage('')
    setStatus('idle')
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  const entryByEmail = new Map((preview?.entries ?? []).map((entry) => [entry.email, entry]))

  return (
    <section className="student-import-panel" aria-labelledby="student-import-title">
      <div className="student-import-heading">
        <div>
          <p className="state-kicker">Nhập dữ liệu hàng loạt</p>
          <h3 id="student-import-title">Import danh sách học sinh từ Excel</h3>
          <p>
            File bắt buộc có đủ ba cột <strong>STT</strong>, <strong>Họ và tên</strong> và <strong>Email</strong>.
            Email trường cấp, email cá nhân hoặc email phụ huynh đều được chấp nhận.
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
        <button className="button button-outline" disabled={downloadingTemplate} type="button" onClick={downloadTemplate}>
          {downloadingTemplate ? 'Đang tạo mẫu...' : 'Tải file Excel mẫu'}
        </button>
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

      {preview?.warnings?.length > 0 && (
        <div className="student-import-warnings" role="status">
          <strong>Lưu ý:</strong>
          <ul>
            {preview.warnings.map((warning, index) => (
              <li key={`${warning.rowNumber}-${warning.message}-${index}`}>
                Dòng {warning.rowNumber}: {warning.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {preview && preview.rows.length > 0 && status === 'preview' && (
        <div className="student-import-preview">
          <strong>Xem trước danh sách</strong>
          <div className="student-import-summary">
            <span>{preview.summary.total} dòng hợp lệ</span>
            <span>{preview.summary.newAccounts} tài khoản mới</span>
            <span>{preview.summary.existingAccounts} tài khoản sẽ được thêm</span>
            <span>{preview.summary.alreadyInClass} dòng bỏ qua</span>
          </div>
          <div className="student-import-preview-wrap">
            <table>
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Họ và tên</th>
                  <th>Email</th>
                  <th>Kết quả dự kiến</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.slice(0, 8).map((student) => {
                  const entry = entryByEmail.get(student.email)
                  return (
                    <tr key={`${student.studentNumber}-${student.email}`}>
                      <td>{student.studentNumber}</td>
                      <td>{student.name}</td>
                      <td>{student.email}</td>
                      <td>{entryLabel(entry)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {preview.rows.length > 8 && <small>Đang hiển thị 8/{preview.rows.length} dòng đầu tiên.</small>}
        </div>
      )}

      <div className="student-import-actions">
        <button
          className="button button-primary"
          disabled={status !== 'preview' || !preview || preview.errors.length > 0}
          type="button"
          onClick={handleImport}
        >
          Xác nhận import vào lớp
        </button>
        {(status === 'success' || status === 'error') && (
          <button className="button button-outline" type="button" onClick={reset}>
            Chọn file khác
          </button>
        )}
      </div>
    </section>
  )
}

export default StudentImportPanel
