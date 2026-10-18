const MAX_SERIALIZED_STATE_LENGTH = 3500
const MAX_VERIFIER_VALUE_LENGTH = 3072
const PKCE_KEY_PATTERN = /^[A-Za-z0-9._:-]+-code-verifier$/

function invalidState() {
  return new Error('Invalid Google OAuth state.')
}

function parseState(serialized) {
  if (serialized === undefined) {
    return {}
  }

  if (typeof serialized !== 'string' || serialized.length > MAX_SERIALIZED_STATE_LENGTH) {
    throw invalidState()
  }

  let parsed
  try {
    parsed = JSON.parse(serialized)
  } catch {
    throw invalidState()
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw invalidState()
  }

  const entries = Object.entries(parsed)
  if (entries.length === 0) {
    throw invalidState()
  }

  for (const [key, value] of entries) {
    if (
      !PKCE_KEY_PATTERN.test(key)
      || typeof value !== 'string'
      || value.length === 0
      || value.length > MAX_VERIFIER_VALUE_LENGTH
    ) {
      throw invalidState()
    }
  }

  return Object.fromEntries(entries)
}

export function createGoogleOAuthStorage(serialized) {
  const values = parseState(serialized)

  return {
    getItem(key) {
      return values[key] ?? null
    },

    setItem(key, value) {
      if (!PKCE_KEY_PATTERN.test(key)) {
        return
      }
      if (typeof value !== 'string' || value.length === 0 || value.length > MAX_VERIFIER_VALUE_LENGTH) {
        throw invalidState()
      }
      values[key] = value
    },

    removeItem(key) {
      delete values[key]
    },

    serialize() {
      const result = JSON.stringify(values)
      if (Object.keys(values).length === 0 || result.length > MAX_SERIALIZED_STATE_LENGTH) {
        throw invalidState()
      }
      return result
    },
  }
}
