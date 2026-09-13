const REFERENCES_STORAGE_KEY = 'educraft.references'

function getBrowserStorage() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return window.localStorage
  } catch {
    return null
  }
}

function readReferences(storage = getBrowserStorage()) {
  if (!storage) {
    return []
  }

  try {
    const value = storage.getItem(REFERENCES_STORAGE_KEY)
    const references = value ? JSON.parse(value) : []

    return Array.isArray(references) ? references : []
  } catch {
    return []
  }
}

function writeReferences(references, storage = getBrowserStorage()) {
  if (!storage) {
    return
  }

  storage.setItem(REFERENCES_STORAGE_KEY, JSON.stringify(references))
}

export function getStoredReference(assignmentId, storage = getBrowserStorage()) {
  return readReferences(storage).find(
    (reference) => reference.assignmentId === assignmentId,
  ) ?? null
}

export function deleteStoredReferences(assignmentIds, storage = getBrowserStorage()) {
  const ids = new Set(assignmentIds)

  if (ids.size === 0) {
    return
  }

  const references = readReferences(storage)
  writeReferences(
    references.filter((reference) => !ids.has(reference.assignmentId)),
    storage,
  )
}

export function createStoredReference(form, storage = getBrowserStorage()) {
  const references = readReferences(storage)
  const reference = {
    assignmentId: form.assignmentId,
    fileName: form.fileName,
    fileSizeBytes: Number(form.fileSizeBytes),
    uploadedAt: new Date().toISOString(),
  }

  const nextReferences = references.filter(
    (item) => item.assignmentId !== form.assignmentId,
  )
  writeReferences([...nextReferences, reference], storage)

  return reference
}
