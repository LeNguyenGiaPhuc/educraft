export function pathSegment(value) {
  return encodeURIComponent(String(value))
}

export function createFileFormData(file, fileName) {
  const formData = new FormData()

  if (fileName) {
    formData.append('file', file, fileName)
  } else {
    formData.append('file', file)
  }

  return formData
}
