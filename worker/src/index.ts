import { Hono } from 'hono'
import type { Env } from './types'
import auth from './routes/auth'
import products from './routes/products'
import cart from './routes/cart'
import addresses from './routes/addresses'
import orders from './routes/orders'

const app = new Hono<{ Bindings: Env }>()

app.get('/api/health', (c) => c.json({ ok: true, service: 'online-mall' }))

app.route('/api/auth', auth)
app.route('/api/products', products)
app.route('/api/cart', cart)
app.route('/api/addresses', addresses)
app.route('/api/orders', orders)

app.all('*', async (c) => {
  if (c.req.path.startsWith('/api')) {
    return c.json({ error: 'Not found' }, 404)
  }
  let res = await c.env.ASSETS.fetch(c.req.raw)
  if (res.status === 404) {
    const url = new URL(c.req.url)
    url.pathname = '/index.html'
    res = await c.env.ASSETS.fetch(new Request(url.toString(), c.req.raw))
  }
  return res
})

export default app
