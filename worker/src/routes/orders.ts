import { Hono } from 'hono'
import type { Env } from '../types'
import { ORDER_STATUS } from '../types'
import { requireAuth } from '../middleware/requireAuth'
import { generateOrderNo } from '../lib/orderNo'

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
  const status = c.req.query('status')
  const base =
    status && Object.values(ORDER_STATUS).includes(status as (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS])
      ? c.env.DB.prepare(
          `SELECT id, order_no, user_id, address_id, total_price, status, created_at, updated_at
           FROM orders WHERE user_id = ? AND status = ? ORDER BY id DESC`
        ).bind(userId, status)
      : c.env.DB.prepare(
          `SELECT id, order_no, user_id, address_id, total_price, status, created_at, updated_at
           FROM orders WHERE user_id = ? ORDER BY id DESC`
        ).bind(userId)
  const { results: orders } = await base.all<{
    id: number
    order_no: string
    user_id: number
    address_id: number
    total_price: number
    status: string
    created_at: string
    updated_at: string
  }>()

  const withItems = await Promise.all(
    orders.map(async (o) => {
      const { results: items } = await c.env.DB.prepare(
        `SELECT oi.id, oi.product_id, oi.quantity, oi.price, p.name, p.images
         FROM order_items oi
         JOIN products p ON p.id = oi.product_id
         WHERE oi.order_id = ?`
      )
        .bind(o.id)
        .all<{
          id: number
          product_id: number
          quantity: number
          price: number
          name: string
          images: string | null
        }>()
      return {
        ...o,
        items: items.map((i) => ({
          id: i.id,
          product_id: i.product_id,
          quantity: i.quantity,
          price: i.price,
          name: i.name,
          images: parseImages(i.images),
        })),
      }
    })
  )
  return c.json({ orders: withItems })
})

app.post('/', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json<{ address_id?: number; cart_item_ids?: number[] }>()
  const addressId = body.address_id
  const cartItemIds = body.cart_item_ids
  if (!Number.isInteger(addressId) || addressId! <= 0) return c.json({ error: '无效地址' }, 400)
  if (!Array.isArray(cartItemIds) || cartItemIds.length === 0) {
    return c.json({ error: '请选择购物车商品' }, 400)
  }
  for (const cid of cartItemIds) {
    if (!Number.isInteger(cid) || cid <= 0) return c.json({ error: '无效购物车项' }, 400)
  }

  const addr = await c.env.DB.prepare(`SELECT id FROM addresses WHERE id = ? AND user_id = ?`)
    .bind(addressId, userId)
    .first<{ id: number }>()
  if (!addr) return c.json({ error: '地址不存在' }, 404)

  const placeholders = cartItemIds.map(() => '?').join(',')
  const { results: cartRows } = await c.env.DB.prepare(
    `SELECT ci.id, ci.product_id, ci.quantity, p.price, p.stock, p.name
     FROM cart_items ci
     JOIN products p ON p.id = ci.product_id
     WHERE ci.user_id = ? AND ci.id IN (${placeholders})`
  )
    .bind(userId, ...cartItemIds)
    .all<{
      id: number
      product_id: number
      quantity: number
      price: number
      stock: number
      name: string
    }>()

  if (cartRows.length !== cartItemIds.length) {
    return c.json({ error: '部分购物车项无效或不属于你' }, 400)
  }

  for (const row of cartRows) {
    if (row.quantity > row.stock) {
      return c.json({ error: `商品「${row.name}」库存不足` }, 400)
    }
  }

  let total = 0
  for (const row of cartRows) {
    total += row.price * row.quantity
  }
  total = Math.round(total * 100) / 100

  const orderNo = generateOrderNo()

  const orderRow = await c.env.DB.prepare(
    `INSERT INTO orders (order_no, user_id, address_id, total_price, status)
     VALUES (?, ?, ?, ?, ?) RETURNING id, order_no, user_id, address_id, total_price, status, created_at, updated_at`
  )
    .bind(orderNo, userId, addressId, total, ORDER_STATUS.PENDING)
    .first<{
      id: number
      order_no: string
      user_id: number
      address_id: number
      total_price: number
      status: string
      created_at: string
      updated_at: string
    }>()

  if (!orderRow) return c.json({ error: '创建订单失败' }, 500)

  const orderId = orderRow.id
  const stmts: D1PreparedStatement[] = []

  for (const row of cartRows) {
    stmts.push(
      c.env.DB.prepare(
        `INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)`
      ).bind(orderId, row.product_id, row.quantity, row.price)
    )
    stmts.push(
      c.env.DB.prepare(`UPDATE products SET stock = stock - ?, updated_at = datetime('now') WHERE id = ? AND stock >= ?`).bind(
        row.quantity,
        row.product_id,
        row.quantity
      )
    )
  }
  for (const cid of cartItemIds) {
    stmts.push(c.env.DB.prepare(`DELETE FROM cart_items WHERE id = ? AND user_id = ?`).bind(cid, userId))
  }

  try {
    await c.env.DB.batch(stmts)
  } catch {
    await c.env.DB.prepare(`DELETE FROM orders WHERE id = ?`).bind(orderId).run()
    return c.json({ error: '下单失败，请重试' }, 500)
  }

  for (const row of cartRows) {
    const p = await c.env.DB.prepare(`SELECT stock FROM products WHERE id = ?`).bind(row.product_id).first<{ stock: number }>()
    if (!p || p.stock < 0) {
      console.error('Stock invariant broken after order', orderId)
    }
  }

  return c.json({ order: orderRow }, 201)
})

app.put('/:id/cancel', async (c) => {
  const userId = c.get('userId')
  const id = Number(c.req.param('id'))
  if (!Number.isInteger(id) || id <= 0) return c.json({ error: '无效订单' }, 400)

  const orderRow = await c.env.DB.prepare(
    `SELECT id, status FROM orders WHERE id = ? AND user_id = ?`
  )
    .bind(id, userId)
    .first<{ id: number; status: string }>()
  if (!orderRow) return c.json({ error: '订单不存在' }, 404)
  if (orderRow.status !== ORDER_STATUS.PENDING) {
    return c.json({ error: '只能取消待支付订单' }, 400)
  }

  const { results: lines } = await c.env.DB.prepare(
    `SELECT product_id, quantity FROM order_items WHERE order_id = ?`
  )
    .bind(id)
    .all<{ product_id: number; quantity: number }>()

  const stmts: D1PreparedStatement[] = [
    c.env.DB.prepare(`UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind(
      ORDER_STATUS.CANCELLED,
      id
    ),
  ]
  for (const line of lines) {
    stmts.push(
      c.env.DB.prepare(`UPDATE products SET stock = stock + ?, updated_at = datetime('now') WHERE id = ?`).bind(
        line.quantity,
        line.product_id
      )
    )
  }
  await c.env.DB.batch(stmts)
  const updated = await c.env.DB.prepare(
    `SELECT id, order_no, total_price, status, created_at, updated_at FROM orders WHERE id = ?`
  )
    .bind(id)
    .first()
  return c.json({ order: updated })
})

app.get('/:id', async (c) => {
  const userId = c.get('userId')
  const id = Number(c.req.param('id'))
  if (!Number.isInteger(id) || id <= 0) return c.json({ error: '无效订单' }, 400)
  const order = await c.env.DB.prepare(
    `SELECT id, order_no, user_id, address_id, total_price, status, created_at, updated_at
     FROM orders WHERE id = ? AND user_id = ?`
  )
    .bind(id, userId)
    .first<{
      id: number
      order_no: string
      user_id: number
      address_id: number
      total_price: number
      status: string
      created_at: string
      updated_at: string
    }>()
  if (!order) return c.json({ error: '订单不存在' }, 404)
  const address = await c.env.DB.prepare(
    `SELECT id, name, phone, province, city, district, detail, is_default, created_at
     FROM addresses WHERE id = ? AND user_id = ?`
  )
    .bind(order.address_id, userId)
    .first<{
      id: number
      name: string
      phone: string
      province: string
      city: string
      district: string
      detail: string
      is_default: number
      created_at: string
    }>()
  const { results: items } = await c.env.DB.prepare(
    `SELECT oi.id, oi.product_id, oi.quantity, oi.price, p.name, p.description, p.images, p.category
     FROM order_items oi
     JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = ?`
  )
    .bind(id)
    .all<{
      id: number
      product_id: number
      quantity: number
      price: number
      name: string
      description: string | null
      images: string | null
      category: string | null
    }>()
  return c.json({
    order: {
      ...order,
      address: address
        ? { ...address, is_default: !!address.is_default }
        : null,
      items: items.map((i) => ({
        id: i.id,
        product_id: i.product_id,
        quantity: i.quantity,
        price: i.price,
        name: i.name,
        description: i.description,
        category: i.category,
        images: parseImages(i.images),
      })),
    },
  })
})

export default app
