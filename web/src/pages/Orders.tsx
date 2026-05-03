import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Order } from '../api'
import { apiGet, orderStatusLabel } from '../api'
import { useAuth } from '../auth/AuthContext'

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: '', label: '全部' },
  { value: 'pending', label: '待支付' },
  { value: 'paid', label: '已支付' },
  { value: 'shipped', label: '已发货' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
]

export default function Orders() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    setLoading(true)
    const q = status ? `?status=${encodeURIComponent(status)}` : ''
    apiGet<{ orders: Order[] }>(`/orders${q}`)
      .then((r) => {
        if (!cancelled) setOrders(r.orders)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user, status])

  if (!user) {
    return (
      <div className="rounded-3xl border border-stoneborder bg-white p-10 text-center shadow-soft">
        <p className="text-muted">登录后查看订单</p>
        <Link to="/login" className="mt-4 inline-block text-accent hover:underline">
          去登录
        </Link>
      </div>
    )
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold text-ink">我的订单</h1>
      <div className="mt-6 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value || 'all'}
            type="button"
            onClick={() => setStatus(f.value)}
            className={`cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition-default ${
              status === f.value ? 'bg-ink text-cream' : 'bg-white text-muted ring-1 ring-stoneborder hover:text-ink'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-8 text-muted">加载中…</p>
      ) : orders.length === 0 ? (
        <p className="mt-8 rounded-3xl border border-dashed border-stoneborder p-10 text-center text-muted">
          暂无订单
        </p>
      ) : (
        <ul className="mt-8 space-y-4">
          {orders.map((o) => (
            <li key={o.id} className="rounded-2xl border border-stoneborder bg-white p-5 shadow-soft transition-default hover:shadow-lift">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-muted">
                    订单号 <span className="font-mono text-ink">{o.order_no}</span>
                  </p>
                  <p className="mt-1 text-xs text-muted">{new Date(o.created_at).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
                      o.status === 'pending'
                        ? 'bg-amber-50 text-amber-900'
                        : o.status === 'cancelled'
                          ? 'bg-stone-100 text-stone-600'
                          : 'bg-emerald-50 text-emerald-900'
                    }`}
                  >
                    {orderStatusLabel[o.status] ?? o.status}
                  </span>
                  <p className="mt-2 font-display text-xl font-semibold text-ink">¥{o.total_price.toFixed(2)}</p>
                </div>
              </div>
              {o.items && o.items.length > 0 && (
                <ul className="mt-4 flex flex-wrap gap-3 border-t border-stoneborder pt-4">
                  {o.items.map((it) => (
                    <li key={it.id} className="flex items-center gap-2 text-sm text-muted">
                      <span className="max-w-[10rem] truncate text-ink">{it.name}</span>×{it.quantity}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-4 flex justify-end">
                <Link
                  to={`/orders/${o.id}`}
                  className="cursor-pointer rounded-full bg-cream px-4 py-2 text-sm font-medium text-ink ring-1 ring-stoneborder transition-default hover:ring-accent"
                >
                  查看详情
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
