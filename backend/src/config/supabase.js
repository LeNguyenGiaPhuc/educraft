import { createClient } from '@supabase/supabase-js'

const serverAuthOptions = {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
}

export function createSupabaseGateway(config, createClientImpl = createClient) {
  const authClient = createClientImpl(
    config.SUPABASE_URL,
    config.SUPABASE_ANON_KEY,
    serverAuthOptions,
  )
  const adminClient = createClientImpl(
    config.SUPABASE_URL,
    config.SUPABASE_SERVICE_ROLE_KEY,
    serverAuthOptions,
  )

  function createUserClient(accessToken) {
    if (!accessToken) {
      throw new Error('A Supabase access token is required')
    }

    return createClientImpl(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
      ...serverAuthOptions,
      global: {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    })
  }

  return { authClient, adminClient, createUserClient }
}
