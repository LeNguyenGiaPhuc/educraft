export function normalizeFilenameEncoding(value) {
  const filename = String(value ?? '')
  if (Buffer.byteLength(filename, 'utf8') === filename.length) return filename

  const decoded = Buffer.from(filename, 'latin1').toString('utf8')
  if (!decoded || decoded.includes('\uFFFD') || decoded === filename) {
    return filename
  }

  return Buffer.from(decoded, 'utf8').toString('latin1') === filename
    ? decoded
    : filename
}
