import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Address, CartItem } from '../api'
import { apiGet, apiPost } from '../api'
import { useAuth } from '../auth/AuthContext'

export default function Checkout() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [addresses, setAddresses] = useState<Address[]>([])
  const [selectedAddr, setSelectedAddr] = useState<number | null>(null)
  const [selectedCart, setSelectedCart] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '',
    phone: '',
    province: '',
    city: '',
    district: '',
    detail: '',
    is_default: true,
  })

  async function refresh() {
    if (!user) return
    const [c, a] = await Promise.all([
      apiGet<{ items: CartItem[] }>('/cart'),
      apiGet<{ addresses: Address[] }>('/addresses'),
    ])
    setCartItems(c.items)
    setAddresses(a.addresses)
    setSelectedCart(c.items.map((i) => i.id))
    const def = a.addresses.find((x) => x.is_default)
    setSelectedAddr(def?.id ?? a.addresses[0]?.id ?? null)
  }

  useEffect(() => {
    if (!user) return
    setLoading(true)
    refresh()
      .catch(() => setError('加载失败'))
      .finally(() => setLoading(false))
  }, [user])

  if (!user) {
    return (
      <div className="rounded-3xl border border-stoneborder bg-white p-10 text-center shadow-soft">
        <p className="text-muted">请先登录</p>
        <Link to="/login" className="mt-4 inline-block text-accent hover:underline">
          登录
        </Link>
      </div>
    )
  }

  async function addAddress(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await apiPost<{ address: Address }>('/addresses', form)
      setForm({
        name: '',
        phone: '',
        province: '',
        city: '',
        district: '',
        detail: '',
        is_default: false,
      })
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    }
  }

  function toggleCart(id: number) {
    setSelectedCart((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const subtotal = cartItems
    .filter((i) => selectedCart.includes(i.id))
    .reduce((s, i) => s + i.line_total, 0)

  async function submitOrder() {
    if (!selectedAddr) {
      setError('请选择收货地址')
      return
    }
    if (selectedCart.length === 0) {
      setError('请选择要结算的商品')
      return
    }
    setError(null)
    try {
      await apiPost<{ order: { id: number } }>('/orders', {
        address_id: selectedAddr,
        cart_item_ids: selectedCart,
      })
      navigate('/orders')
    } catch (err) {
      setError(err instanceof Error ? err.message : '下单失败')
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold text-ink">结算</h1>
      <p className="mt-2 text-muted">选择地址与商品，提交后扣减库存并清空对应购物车项。</p>

      {error && (
        <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-8 text-muted">加载中…</p>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <section className="rounded-3xl border border-stoneborder bg-white p-6 shadow-soft">
            <h2 className="font-display text-lg font-semibold text-ink">收货地址</h2>
            {addresses.length === 0 ? (
              <p className="mt-4 text-sm text-muted">暂无地址，请在下方新增。</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {addresses.map((a) => (
                  <li key={a.id}>
                    <label className="flex cursor-pointer gap-3 rounded-2xl border border-stoneborder p-4 transition-default hover:border-accent/40">
                      <input
                        type="radio"
                        name="addr"
                        className="mt-1 accent-accent"
                        checked={selectedAddr === a.id}
                        onChange={() => setSelectedAddr(a.id)}
                      />
                      <div>
                        <p className="font-medium text-ink">
                          {a.name} · {a.phone}
                          {a.is_default && (
                            <span className="ml-2 rounded-full bg-cream px-2 py-0.5 text-xs text-accent">默认</span>
                          )}
                        </p>
                        <p className="mt-1 text-sm text-muted">
                          {a.province}
                          {a.city}
                          {a.district}
                          {a.detail}
                        </p>
                      </div>
                    </label>
                  </li>
                ))}
              </ul>
            )}

            <form className="mt-8 space-y-3 border-t border-stoneborder pt-6" onSubmit={(e) => void addAddress(e)}>
              <p className="text-sm font-medium text-ink">新增地址</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  required
                  placeholder="收货人"
                  className="rounded-xl border border-stoneborder px-3 py-2 text-sm"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
                <input
                  required
                  placeholder="手机号"
                  className="rounded-xl border border-stoneborder px-3 py-2 text-sm"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
                <input
                  required
                  placeholder="省"
                  className="rounded-xl border border-stoneborder px-3 py-2 text-sm"
                  value={form.province}
                  onChange={(e) => setForm((f) => ({ ...f, province: e.target.value }))}
                />
                <input
                  required
                  placeholder="市"
                  className="rounded-xl border border-stoneborder px-3 py-2 text-sm"
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                />
                <input
                  required
                  placeholder="区"
                  className="rounded-xl border border-stoneborder px-3 py-2 text-sm"
                  value={form.district}
                  onChange={(e) => setForm((f) => ({ ...f, district: e.target.value }))}
                />
                <input
                  required
                  placeholder="详细地址"
                  className="sm:col-span-2 rounded-xl border border-stoneborder px-3 py-2 text-sm"
                  value={form.detail}
                  onChange={(e) => setForm((f) => ({ ...f, detail: e.target.value }))}
                />
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
                <input
                  type="checkbox"
                  checked={form.is_default}
                  onChange={(e) => setForm((f) => ({ ...f, is_default: e.target.checked }))}
                  className="accent-accent"
                />
                设为默认地址
              </label>
              <button
                type="submit"
                className="cursor-pointer rounded-full border border-stoneborder px-5 py-2 text-sm font-medium text-ink transition-default hover:border-accent hover:text-accent"
              >
                保存地址
              </button>
            </form>
          </section>

          <section className="rounded-3xl border border-stoneborder bg-white p-6 shadow-soft">
            <h2 className="font-display text-lg font-semibold text-ink">待结算商品</h2>
            {cartItems.length === 0 ? (
              <p className="mt-4 text-muted">
                购物车为空，{' '}
                <Link to="/" className="text-accent underline-offset-2 hover:underline">
                  去选购
                </Link>
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {cartItems.map((line) => (
                  <li key={line.id} className="flex items-start gap-3 rounded-2xl border border-stoneborder/80 p-3">
                    <input
                      type="checkbox"
                      className="mt-1 accent-accent cursor-pointer"
                      checked={selectedCart.includes(line.id)}
                      onChange={() => toggleCart(line.id)}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-ink">{line.product.name}</p>
                      <p className="text-sm text-muted">
                        ¥{line.product.price.toFixed(2)} × {line.quantity}
                      </p>
                    </div>
                    <p className="shrink-0 font-display font-semibold text-accent">
                      ¥{line.line_total.toFixed(2)}
                    </p>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-6 flex items-center justify-between border-t border-stoneborder pt-6">
              <span className="text-muted">应付合计</span>
              <span className="font-display text-2xl font-semibold text-ink">¥{subtotal.toFixed(2)}</span>
            </div>
            <button
              type="button"
              onClick={() => void submitOrder()}
              disabled={cartItems.length === 0 || addresses.length === 0}
              className="mt-6 w-full cursor-pointer rounded-full bg-accent py-3 text-sm font-semibold text-white shadow-soft transition-default hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              提交订单
            </button>
            {addresses.length === 0 && (
              <p className="mt-2 text-center text-xs text-muted">请先填写并保存至少一个地址。</p>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
