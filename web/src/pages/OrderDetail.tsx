import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { Order } from '../api'
import { apiGet, apiPut, orderStatusLabel } from '../api'
import { useAuth } from '../auth/AuthContext'

export default function OrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [order, setOrder] = useState<Order & { address?: Order['address']; items?: Order['items'] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!user || !id) return
    let cancelled = false
    apiGet<{ order: Order & { address: Order['address']; items: NonNullable<Order['items']> } }>(`/orders/${id}`)
      .then((r) => {
        if (!cancelled) setOrder(r.order)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : '加载失败')
      })
    return () => {
      cancelled = true
    }
  }, [user, id])

  if (!user) {
    return (
      <div className="rounded-3xl border border-stoneborder bg-white p-10 text-center shadow-soft">
        <Link to="/login" className="text-accent hover:underline">
          请先登录
        </Link>
      </div>
    )
  }

  async function cancelOrder() {
    if (!id || !order) return
    if (!window.confirm('确定取消该待支付订单？库存将恢复。')) return
    setBusy(true)
    try {
      await apiPut(`/orders/${id}/cancel`)
      navigate('/orders')
    } catch (e) {
      setError(e instanceof Error ? e.message : '取消失败')
    } finally {
      setBusy(false)
    }
  }

  if (error && !order) {
    return (
      <p className="rounded-2xl bg-red-50 px-4 py-3 text-red-800" role="alert">
        {error}
      </p>
    )
  }

  if (!order) {
    return <p className="text-muted">加载中…</p>
  }

  return (
    <div>
      <Link to="/orders" className="text-sm text-accent hover:underline">
        ← 返回订单列表
      </Link>
      <div className="mt-6 rounded-3xl border border-stoneborder bg-white p-6 shadow-soft md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink">订单详情</h1>
            <p className="mt-2 font-mono text-sm text-muted">{order.order_no}</p>
            <p className="text-xs text-muted">{new Date(order.created_at).toLocaleString()}</p>
          </div>
          <div className="text-right">
            <span
              className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
                order.status === 'pending'
                  ? 'bg-amber-50 text-amber-900'
                  : order.status === 'cancelled'
                    ? 'bg-stone-100 text-stone-600'
                    : 'bg-emerald-50 text-emerald-900'
              }`}
            >
              {orderStatusLabel[order.status] ?? order.status}
            </span>
            <p className="mt-2 font-display text-2xl font-semibold text-ink">¥{order.total_price.toFixed(2)}</p>
          </div>
        </div>

        {order.address && (
          <section className="mt-8 border-t border-stoneborder pt-8">
            <h2 className="font-display text-lg font-semibold text-ink">收货信息</h2>
            <p className="mt-3 text-sm text-ink">
              {order.address.name} · {order.address.phone}
            </p>
            <p className="mt-1 text-sm text-muted">
              {order.address.province}
              {order.address.city}
              {order.address.district}
              {order.address.detail}
            </p>
          </section>
        )}

        {order.items && order.items.length > 0 && (
          <section className="mt-8 border-t border-stoneborder pt-8">
            <h2 className="font-display text-lg font-semibold text-ink">商品清单</h2>
            <ul className="mt-4 space-y-4">
              {order.items.map((it) => (
                <li
                  key={it.id}
                  className="flex flex-wrap items-center gap-4 rounded-2xl border border-stoneborder/80 p-4"
                >
                  <div className="h-16 w-20 overflow-hidden rounded-lg bg-stone-100">
                    {it.images?.[0] ? (
                      <img src={it.images[0]} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-muted">无图</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-ink">{it.name}</p>
                    <p className="text-sm text-muted">¥{it.price.toFixed(2)} × {it.quantity}</p>
                  </div>
                  <p className="font-display font-semibold text-ink">
                    ¥{(it.price * it.quantity).toFixed(2)}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {order.status === 'pending' && (
          <div className="mt-8 border-t border-stoneborder pt-8">
            <button
              type="button"
              disabled={busy}
              onClick={() => void cancelOrder()}
              className="cursor-pointer rounded-full border border-red-200 bg-red-50 px-6 py-2 text-sm font-medium text-red-800 transition-default hover:bg-red-100 disabled:opacity-50"
            >
              {busy ? '处理中…' : '取消订单'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
