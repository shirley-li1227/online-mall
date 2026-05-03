import { Hono } from 'hono'
import type { Env } from '../types'
import { requireAuth } from '../middleware/requireAuth'

function parseImages(raw: string | null): string[] {
  if (!raw) return []
  try {
    const j = JSON.parse(raw) as unknown
    return Array.isArray(j) ? j.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

const app = new Hono<{ Bindings: Env; Variables: { userId: number } }>()
app.use('*', requireAuth)

app.get('/', async (c) => {
  const userId = c.get('userId')
  const { results } = await c.env.DB.prepare(
    `SELECT ci.id AS cart_id, ci.quantity, ci.created_at,
            p.id AS product_id, p.name, p.price, p.stock, p.images, p.category, p.description
     FROM cart_items ci
     JOIN products p ON p.id = ci.product_id
     WHERE ci.user_id = ?
     ORDER BY ci.id DESC`
  )
    .bind(userId)
    .all<{
      cart_id: number
      quantity: number
      created_at: string
      product_id: number
      name: string
      price: number
      stock: number
      images: string | null
      category: string | null
      description: string | null
    }>()
  let total = 0
  const items = results.map((r) => {
    const line = r.price * r.quantity
    total += line
    return {
      id: r.cart_id,
      quantity: r.quantity,
      created_at: r.created_at,
      product: {
        id: r.product_id,
        name: r.name,
        price: r.price,
        stock: r.stock,
        images: parseImages(r.images),
        category: r.category,
        description: r.description,
      },
      line_total: Math.round(line * 100) / 100,
    }
  })
  return c.json({ items, total: Math.round(total * 100) / 100 })
})

app.post('/', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json<{ product_id?: number; quantity?: number }>()
  const productId = body.product_id
  const qty = body.quantity
  if (!Number.isInteger(productId) || productId! <= 0) return c.json({ error: '无效商品' }, 400)
  if (!Number.isInteger(qty) || qty! <= 0) return c.json({ error: '数量须为正整数' }, 400)

  const product = await c.env.DB.prepare(`SELECT id, stock FROM products WHERE id = ?`)
    .bind(productId)
    .first<{ id: number; stock: number }>()
  if (!product) return c.json({ error: '商品不存在' }, 404)

  const existing = await c.env.DB.prepare(
    `SELECT id, quantity FROM cart_items WHERE user_id = ? AND product_id = ?`
  )
    .bind(userId, productId)
    .first<{ id: number; quantity: number }>()

  const newQty = (existing?.quantity ?? 0) + qty!
  if (newQty > product.stock) return c.json({ error: '库存不足' }, 400)

  if (existing) {
    await c.env.DB.prepare(`UPDATE cart_items SET quantity = ? WHERE id = ?`)
      .bind(newQty, existing.id)
      .run()
    return c.json({ ok: true, cart_item_id: existing.id, quantity: newQty })
  }
  const ins = await c.env.DB.prepare(
    `INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?) RETURNING id, quantity`
  )
    .bind(userId, productId, qty)
    .first<{ id: number; quantity: number }>()
  return c.json({ ok: true, cart_item_id: ins?.id, quantity: ins?.quantity }, 201)
})

app.put('/:id', async (c) => {
  const userId = c.get('userId')
  const cartItemId = Number(c.req.param('id'))
  const body = await c.req.json<{ quantity?: number }>()
  const quantity = body.quantity
  if (!Number.isInteger(cartItemId) || cartItemId <= 0) return c.json({ error: '无效购物车项' }, 400)
  if (!Number.isInteger(quantity) || quantity! <= 0) return c.json({ error: '数量须为正整数' }, 400)

  const row = await c.env.DB.prepare(
    `SELECT ci.id, ci.product_id, ci.quantity FROM cart_items ci WHERE ci.id = ? AND ci.user_id = ?`
  )
    .bind(cartItemId, userId)
    .first<{ id: number; product_id: number; quantity: number }>()
  if (!row) return c.json({ error: '购物车项不存在' }, 404)

  const product = await c.env.DB.prepare(`SELECT stock FROM products WHERE id = ?`)
    .bind(row.product_id)
    .first<{ stock: number }>()
  if (!product) return c.json({ error: '商品不存在' }, 404)
  if (quantity! > product.stock) return c.json({ error: '库存不足' }, 400)

  await c.env.DB.prepare(`UPDATE cart_items SET quantity = ? WHERE id = ?`)
    .bind(quantity, cartItemId)
    .run()
  return c.json({ ok: true, id: cartItemId, quantity })
})

app.delete('/:id', async (c) => {
  const userId = c.get('userId')
  const cartItemId = Number(c.req.param('id'))
  if (!Number.isInteger(cartItemId) || cartItemId <= 0) return c.json({ error: '无效购物车项' }, 400)
  const r = await c.env.DB.prepare(`DELETE FROM cart_items WHERE id = ? AND user_id = ?`)
    .bind(cartItemId, userId)
    .run()
  if (r.meta.changes === 0) return c.json({ error: '购物车项不存在' }, 404)
  return c.json({ ok: true })
})

export default app
