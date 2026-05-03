const API = '/api'

export type User = {
  id: number
  username: string
  email: string
  avatar: string | null
  created_at: string
}

export type Product = {
  id: number
  name: string
  description: string | null
  price: number
  stock: number
  images: string[]
  category: string | null
  created_at: string
  updated_at: string
}

export type CartItem = {
  id: number
  quantity: number
  created_at: string
  product: Product
  line_total: number
}

export type Address = {
  id: number
  name: string
  phone: string
  province: string
  city: string
  district: string
  detail: string
  is_default: boolean
  created_at: string
}

export type OrderItem = {
  id: number
  product_id: number
  quantity: number
  price: number
  name: string
  images: string[]
  description?: string | null
  category?: string | null
}

export type Order = {
  id: number
  order_no: string
  user_id: number
  address_id: number
  total_price: number
  status: string
  created_at: string
  updated_at: string
  items?: OrderItem[]
  address?: Address | null
}

async function parseError(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: string }
    return j.error ?? res.statusText
  } catch {
    return res.statusText
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { credentials: 'include' })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<T>
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<T>
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: 'PUT',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<T>
}

export async function apiDelete<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { method: 'DELETE', credentials: 'include' })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<T>
}

export const orderStatusLabel: Record<string, string> = {
  pending: '待支付',
  paid: '已支付',
  shipped: '已发货',
  completed: '已完成',
  cancelled: '已取消',
}
