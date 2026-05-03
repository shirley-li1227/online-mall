import { Hono } from 'hono'
import type { Env } from '../types'
import { requireAuth } from '../middleware/requireAuth'

const app = new Hono<{ Bindings: Env; Variables: { userId: number } }>()
app.use('*', requireAuth)

app.get('/', async (c) => {
  const userId = c.get('userId')
  const { results } = await c.env.DB.prepare(
    `SELECT id, name, phone, province, city, district, detail, is_default, created_at
     FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC`
  )
    .bind(userId)
    .all<{
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
  return c.json({
    addresses: results.map((a) => ({ ...a, is_default: !!a.is_default })),
  })
})

type AddrBody = {
  name?: string
  phone?: string
  province?: string
  city?: string
  district?: string
  detail?: string
  is_default?: boolean
}

function validateAddr(b: AddrBody): string | null {
  if (!b.name?.trim()) return '请填写收货人'
  if (!b.phone?.trim()) return '请填写手机号'
  if (!b.province?.trim()) return '请填写省'
  if (!b.city?.trim()) return '请填写市'
  if (!b.district?.trim()) return '请填写区'
  if (!b.detail?.trim()) return '请填写详细地址'
  return null
}

app.post('/', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json<AddrBody>()
  const err = validateAddr(body)
  if (err) return c.json({ error: err }, 400)
  const isDef = body.is_default ? 1 : 0
  if (isDef) {
    await c.env.DB.prepare(`UPDATE addresses SET is_default = 0 WHERE user_id = ?`).bind(userId).run()
  }
  const row = await c.env.DB.prepare(
    `INSERT INTO addresses (user_id, name, phone, province, city, district, detail, is_default)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id, name, phone, province, city, district, detail, is_default, created_at`
  )
    .bind(
      userId,
      body.name!.trim(),
      body.phone!.trim(),
      body.province!.trim(),
      body.city!.trim(),
      body.district!.trim(),
      body.detail!.trim(),
      isDef
    )
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
  if (!row) return c.json({ error: '保存失败' }, 500)
  return c.json({ address: { ...row, is_default: !!row.is_default } }, 201)
})

app.put('/:id', async (c) => {
  const userId = c.get('userId')
  const id = Number(c.req.param('id'))
  if (!Number.isInteger(id) || id <= 0) return c.json({ error: '无效地址' }, 400)
  const body = await c.req.json<AddrBody>()
  const err = validateAddr(body)
  if (err) return c.json({ error: err }, 400)
  const exists = await c.env.DB.prepare(`SELECT id FROM addresses WHERE id = ? AND user_id = ?`)
    .bind(id, userId)
    .first<{ id: number }>()
  if (!exists) return c.json({ error: '地址不存在' }, 404)
  const isDef = body.is_default ? 1 : 0
  if (isDef) {
    await c.env.DB.prepare(`UPDATE addresses SET is_default = 0 WHERE user_id = ?`).bind(userId).run()
  }
  await c.env.DB.prepare(
    `UPDATE addresses SET name = ?, phone = ?, province = ?, city = ?, district = ?, detail = ?, is_default = ?
     WHERE id = ? AND user_id = ?`
  )
    .bind(
      body.name!.trim(),
      body.phone!.trim(),
      body.province!.trim(),
      body.city!.trim(),
      body.district!.trim(),
      body.detail!.trim(),
      isDef,
      id,
      userId
    )
    .run()
  const row = await c.env.DB.prepare(
    `SELECT id, name, phone, province, city, district, detail, is_default, created_at FROM addresses WHERE id = ?`
  )
    .bind(id)
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
  return c.json({ address: row ? { ...row, is_default: !!row.is_default } : null })
})

app.delete('/:id', async (c) => {
  const userId = c.get('userId')
  const id = Number(c.req.param('id'))
  if (!Number.isInteger(id) || id <= 0) return c.json({ error: '无效地址' }, 400)
  const addr = await c.env.DB.prepare(`SELECT id, is_default FROM addresses WHERE id = ? AND user_id = ?`)
    .bind(id, userId)
    .first<{ id: number; is_default: number }>()
  if (!addr) return c.json({ error: '地址不存在' }, 404)
  await c.env.DB.prepare(`DELETE FROM addresses WHERE id = ? AND user_id = ?`).bind(id, userId).run()
  if (addr.is_default) {
    const first = await c.env.DB.prepare(
      `SELECT id FROM addresses WHERE user_id = ? ORDER BY id ASC LIMIT 1`
    )
      .bind(userId)
      .first<{ id: number }>()
    if (first) {
      await c.env.DB.prepare(`UPDATE addresses SET is_default = 1 WHERE id = ?`).bind(first.id).run()
    }
  }
  return c.json({ ok: true })
})

export default app
