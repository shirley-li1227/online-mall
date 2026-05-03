import type { Env, SessionPayload } from '../types'

const COOKIE = 'om_session'
const TTL_SEC = 60 * 60 * 24 * 7

export function sessionCookieHeader(token: string): string {
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${TTL_SEC}`
}

export function clearSessionCookie(): string {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
}

export function getSessionToken(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null
  const parts = cookieHeader.split(';').map((s) => s.trim())
  for (const p of parts) {
    if (p.startsWith(`${COOKIE}=`)) return p.slice(COOKIE.length + 1)
  }
  return null
}

export async function readSession(
  env: Env,
  token: string | null
): Promise<SessionPayload | null> {
  if (!token) return null
  const raw = await env.SESSIONS.get(`sess:${token}`)
  if (!raw) return null
  try {
    const p = JSON.parse(raw) as SessionPayload
    if (typeof p.userId !== 'number' || typeof p.exp !== 'number') return null
    if (p.exp < Date.now()) return null
    return p
  } catch {
    return null
  }
}

export async function writeSession(env: Env, userId: number): Promise<string> {
  const token = crypto.randomUUID()
  const payload: SessionPayload = { userId, exp: Date.now() + TTL_SEC * 1000 }
  await env.SESSIONS.put(`sess:${token}`, JSON.stringify(payload), { expirationTtl: TTL_SEC })
  return token
}

export async function deleteSession(env: Env, token: string | null): Promise<void> {
  if (!token) return
  await env.SESSIONS.delete(`sess:${token}`)
}

export { COOKIE }
