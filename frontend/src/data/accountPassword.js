export function validateAccountPassword(password, { required = false } = {}) {
  const value = String(password ?? '').trim()

  if (!value) {
    return required ? 'Mật khẩu không được để trống.' : ''
  }

  if (value.length < 6) {
    return 'Mật khẩu phải có ít nhất 6 ký tự.'
  }

  if (value.length > 128) {
    return 'Mật khẩu quá dài.'
  }

  return ''
}
