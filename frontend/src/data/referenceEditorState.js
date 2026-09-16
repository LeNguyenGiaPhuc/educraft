export function createReferenceEditorState() {
  return {
    mode: 'idle',
    referenceId: null,
    file: null,
    error: '',
    status: 'idle',
    message: '',
  }
}

export function referenceEditorReducer(_state, action) {
  switch (action.type) {
    case 'OPEN_ADD':
      return { ...createReferenceEditorState(), mode: 'add' }
    case 'OPEN_REPLACE':
      return {
        ...createReferenceEditorState(),
        mode: 'replace',
        referenceId: action.referenceId,
      }
    case 'SELECT_FILE':
      return {
        ..._state,
        file: action.file,
        error: '',
        status: 'idle',
        message: '',
      }
    case 'VALIDATION_ERROR':
      return { ..._state, error: action.message }
    case 'REQUEST_START':
      return { ..._state, status: 'loading', message: '' }
    case 'REQUEST_ERROR':
      return { ..._state, status: 'error', message: action.message }
    case 'CLOSE':
    case 'REQUEST_SUCCESS':
      return createReferenceEditorState()
    default:
      return _state
  }
}
