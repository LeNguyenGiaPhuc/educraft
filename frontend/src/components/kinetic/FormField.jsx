import { cloneElement, useId } from 'react'

// Presentation only: native control, value, validation and handlers remain with its owner.
export default function FormField({ label, error, children }) {
  const generatedId = useId()
  const id = children.props.id ?? generatedId
  const errorId = `${id}-error`
  const describedBy = [children.props['aria-describedby'], error ? errorId : null]
    .filter(Boolean).join(' ') || undefined

  return (
    <label className="field-label" htmlFor={id}>
      <span>{label}</span>
      {cloneElement(children, { id, 'aria-invalid': Boolean(error), 'aria-describedby': describedBy })}
      {error && <small className="field-error" id={errorId}>{error}</small>}
    </label>
  )
}
