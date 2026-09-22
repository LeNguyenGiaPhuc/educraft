export default function FieldError({ id, message }) {
  if (!message) return null

  return <p className="form-field-error" id={id} role="alert">{message}</p>
}
