import 'dotenv/config'

import { createApp } from './app.js'
import { loadEnv } from './config/env.js'
import { createSupabaseGateway } from './config/supabase.js'

const config = loadEnv()
const supabaseGateway = createSupabaseGateway(config)
const app = createApp({ frontendOrigin: config.FRONTEND_ORIGIN })

app.locals.supabase = supabaseGateway
app.listen(config.PORT, () => {
  console.log(`EduCraft API listening on port ${config.PORT}`)
})
