import { createApp } from './app.js'

const port = Number(process.env.PORT ?? 3000)
const app = createApp({ frontendOrigin: process.env.FRONTEND_ORIGIN })

app.listen(port, () => {
  console.log(`EduCraft API listening on port ${port}`)
})
