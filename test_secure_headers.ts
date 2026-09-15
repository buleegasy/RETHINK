import { Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'

const app = new Hono()
app.use('*', secureHeaders())

export default app
