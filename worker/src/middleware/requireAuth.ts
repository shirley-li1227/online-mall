import type { MiddlewareHandler } from 'hono'
import type { Env } from '../types'
import { getSessionToken, readSession } from '../lib/session'

export const requireAuth: MiddlewareHandler<{ Bindings: Env; Variables: { userId: number } }> = async (
  c,
  next
) => {
  const token = getSessionToken(c.req.header('Cookie') ?? null)
  const session = await readSession(c.env, token)
  if (!session) return c.json({ error: '未登录' }, 401)
  c.set('userId', session.userId)
  await next()
}
