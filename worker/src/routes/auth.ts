import { Hono } from 'hono'
import type { Env } from '../types'
import { hashPassword, verifyPassword } from '../lib/password'
import {
  clearSessionCookie,
  getSessionToken,
  readSession,
  sessionCookieHeader,
  writeSession,
  deleteSession,
} from '../lib/session'

const app = new Hono<{ Bindings: Env }>()

app.post('/register', async (c) => {
  const body = await c.req.json<{ username?: string; email?: string; password?: string }>()
  const username = body.username?.trim()
  const email = body.email?.trim().toLowerCase()
  const password = body.password
  if (!username || !email || !password || password.length < 6) {
    return c.json({ error: '用户名、邮箱有效且密码至少 6 位' }, 400)
  }
  const password_hash = await hashPassword(password)
  try {
    const r = await c.env.DB.prepare(
      `INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?) RETURNING id, username, email, avatar, created_at`
    )
      .bind(username, email, password_hash)
      .first<{ id: number; username: string; email: string; avatar: string | null; created_at: string }>()
    if (!r) return c.json({ error: '注册失败' }, 500)
    const token = await writeSession(c.env, r.id)
    return c.json({ user: r }, 201, { 'Set-Cookie': sessionCookieHeader(token) })
  } catch {
    return c.json({ error: '邮箱或用户名已存在' }, 409)
  }
})

app.post('/login', async (c) => {
  const body = await c.req.json<{ email?: string; password?: string }>()
  const email = body.email?.trim().toLowerCase()
  const password = body.password
  if (!email || !password) return c.json({ error: '请输入邮箱和密码' }, 400)
  const row = await c.env.DB.prepare(
    `SELECT id, username, email, avatar, created_at, password_hash FROM users WHERE email = ?`
  )
    .bind(email)
    .first<{
      id: number
      username: string
      email: string
      avatar: string | null
      created_at: string
      password_hash: string
    }>()
  if (!row || !(await verifyPassword(password, row.password_hash))) {
    return c.json({ error: '邮箱或密码错误' }, 401)
  }
  const token = await writeSession(c.env, row.id)
  const { password_hash: _, ...user } = row
  return c.json({ user }, 200, { 'Set-Cookie': sessionCookieHeader(token) })
})

app.post('/logout', async (c) => {
  const token = getSessionToken(c.req.header('Cookie') ?? null)
  await deleteSession(c.env, token)
  return c.json({ ok: true }, 200, { 'Set-Cookie': clearSessionCookie() })
})

app.get('/me', async (c) => {
  const token = getSessionToken(c.req.header('Cookie') ?? null)
  const session = await readSession(c.env, token)
  if (!session) return c.json({ user: null })
  const row = await c.env.DB.prepare(
    `SELECT id, username, email, avatar, created_at FROM users WHERE id = ?`
  )
    .bind(session.userId)
    .first<{ id: number; username: string; email: string; avatar: string | null; created_at: string }>()
  return c.json({ user: row })
})

export default app
