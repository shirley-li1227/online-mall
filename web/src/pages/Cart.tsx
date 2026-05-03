import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import type { CartItem } from '../api'
import { apiDelete, apiGet, apiPut } from '../api'
import { useAuth } from '../auth/AuthContext'

export default function Cart() {
  const { user } = useAuth()
  const [items, setItems] = useState<CartItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    if (!user) return
    setLoading(true)
    try {
      const r = await apiGet<{ items: CartItem[]; total: number }>('/cart')
      setItems(r.items)
      setTotal(r.total)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [user])

  if (!user) {
    return (
      <div className="rounded-3xl border border-stoneborder bg-white p-10 text-center shadow-soft">
        <p className="text-muted">请先登录查看购物车</p>
        <Link
          to="/login"
          className="mt-4 inline-block cursor-pointer rounded-full bg-ink px-6 py-2 text-sm font-semibold text-cream transition-default hover:bg-accent"
        >
          去登录
        </Link>
      </div>
    )
  }

  async function updateQty(id: number, quantity: number) {
    try {
      await apiPut(`/cart/${id}`, { quantity })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : '更新失败')
    }
  }

  async function remove(id: number) {
    try {
      await apiDelete(`/cart/${id}`)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : '删除失败')
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold text-ink">购物车</h1>
      <p className="mt-2 text-muted">调整数量会实时校验库存。</p>

      {error && (
        <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-8 text-muted">加载中…</p>
      ) : items.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-stoneborder bg-white/80 p-12 text-center text-muted">
          购物车还是空的，去首页逛逛吧。
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {items.map((line) => (
            <div
              key={line.id}
              className="flex flex-col gap-4 rounded-2xl border border-stoneborder bg-white p-4 shadow-soft sm:flex-row sm:items-center"
            >
              <div className="h-24 w-32 shrink-0 overflow-hidden rounded-xl bg-stone-100">
                {line.product.images[0] ? (
                  <img src={line.product.images[0]} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted">无图</div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-medium text-ink">{line.product.name}</h2>
                <p className="text-sm text-muted">单价 ¥{line.product.price.toFixed(2)} · 库存 {line.product.stock}</p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-muted">
                    数量
                    <input
                      type="number"
                      min={1}
                      max={line.product.stock}
                      className="w-20 rounded-lg border border-stoneborder px-2 py-1 text-ink"
                      value={line.quantity}
                      onChange={(e) => {
                        const n = Number(e.target.value)
                        if (Number.isInteger(n) && n > 0) void updateQty(line.id, n)
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => void remove(line.id)}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-stoneborder px-3 py-1.5 text-sm text-muted transition-default hover:border-red-300 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                    删除
                  </button>
                </div>
              </div>
              <div className="text-right sm:w-32">
                <p className="text-xs text-muted">小计</p>
                <p className="font-display text-xl font-semibold text-accent">¥{line.line_total.toFixed(2)}</p>
              </div>
            </div>
          ))}

          <div className="flex flex-col items-end gap-4 rounded-2xl border border-stoneborder bg-cream/60 p-6">
            <p className="text-sm text-muted">
              合计{' '}
              <span className="font-display text-2xl font-semibold text-ink">¥{total.toFixed(2)}</span>
            </p>
            <Link
              to="/checkout"
              className="inline-flex cursor-pointer rounded-full bg-accent px-8 py-3 text-sm font-semibold text-white shadow-soft transition-default hover:bg-accent-hover"
            >
              去结算
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
