export type Env = {
  DB: D1Database
  SESSIONS: KVNamespace
  ASSETS: Fetcher
}

export type SessionPayload = {
  userId: number
  exp: number
}

export const ORDER_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  SHIPPED: 'shipped',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const
