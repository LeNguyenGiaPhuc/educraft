const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export function getModalFocusableElements(container) {
  if (!container?.querySelectorAll) {
    return []
  }

  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR))
}

export function handleDialogCancel(event, onClose) {
  event.preventDefault()
  onClose()
}

export function lockDocumentScroll(documentObject) {
  const previousOverflow = documentObject?.body?.style?.overflow ?? ''

  if (documentObject?.body?.style) {
    documentObject.body.style.overflow = 'hidden'
  }

  return () => {
    if (documentObject?.body?.style) {
      documentObject.body.style.overflow = previousOverflow
    }
  }
}
