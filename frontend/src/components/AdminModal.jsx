import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

import { getModalFocusableElements, handleDialogCancel, lockDocumentScroll } from './modalAccessibility.js'

function AdminModal({ children, className = '', labelledBy, onClose }) {
  const modalRef = useRef(null)
  const closeHandlerRef = useRef(onClose)

  useEffect(() => {
    closeHandlerRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined
    }

    const previousActiveElement = document.activeElement
    const dialog = modalRef.current
    const restoreScroll = lockDocumentScroll(document)

    if (dialog && !dialog.open) {
      dialog.showModal()
    }

    const focusFrame = window.requestAnimationFrame(() => {
      const preferredElement = dialog?.querySelector('[data-modal-initial-focus]')
      const firstElement = getModalFocusableElements(dialog)[0]
      ;(preferredElement ?? firstElement ?? dialog)?.focus?.()
    })

    return () => {
      window.cancelAnimationFrame(focusFrame)
      if (dialog?.open) {
        dialog.close()
      }
      restoreScroll()
      window.requestAnimationFrame(() => previousActiveElement?.focus?.())
    }
  }, [])

  const modalContent = (
    <dialog
      aria-labelledby={labelledBy}
      className={`admin-modal${className ? ` ${className}` : ''}`}
      onCancel={(event) => handleDialogCancel(event, () => closeHandlerRef.current?.())}
      ref={modalRef}
    >
      {children}
    </dialog>
  )

  if (typeof document !== 'undefined' && document.body) {
    return createPortal(modalContent, document.body)
  }

  return modalContent
}

export default AdminModal
