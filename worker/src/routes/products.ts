import { Hono } from 'hono'
import type { Env } from '../types'

function parseImages(raw: string | null): string[] {
  if (!raw) return []
  try {
    const j = JSON.parse(raw) as unknown
    return Array.isArray(j) ? j.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

const app = new Hono<{ Bindings: Env }>()

app.get('/', async (c) => {
  const category = c.req.query('category')
  const q = category
    ? c.env.DB.prepare(
        `SELECT id, name, description, price, stock, images, category, created_at, updated_at FROM products WHERE category = ? ORDER BY id DESC`
      ).bind(category)
    : c.env.DB.prepare(
        `SELECT id, name, description, price, stock, images, category, created_at, updated_at FROM products ORDER BY id DESC`
      )
  const { results } = await q.all<{
    id: number
    name: string
    description: string | null
    price: number
    stock: number
    images: string | null
    category: string | null
    created_at: string
    updated_at: string
  }>()
  return c.json({
    products: results.map((p) => ({ ...p, images: parseImages(p.images) })),
  })
})

app.get('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isInteger(id)) return c.json({ error: '无效商品' }, 400)
  const row = await c.env.DB.prepare(
    `SELECT id, name, description, price, stock, images, category, created_at, updated_at FROM products WHERE id = ?`
  )
    .bind(id)
    .first<{
      id: number
      name: string
      description: string | null
      price: number
      stock: number
      images: string | null
      category: string | null
      created_at: string
      updated_at: string
    }>()
  if (!row) return c.json({ error: '商品不存在' }, 404)
  return c.json({ product: { ...row, images: parseImages(row.images) } })
})

export default app
