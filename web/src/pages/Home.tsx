import { useEffect, useMemo, useState } from 'react'
import { Plus, Sparkles } from 'lucide-react'
import type { Product } from '../api'
import { apiGet, apiPost } from '../api'
import { useAuth } from '../auth/AuthContext'

export default function Home() {
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [category, setCategory] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<string | null>(null)

  const categories = useMemo(() => {
    const s = new Set<string>()
    products.forEach((p) => {
      if (p.category) s.add(p.category)
    })
    return [...s].sort()
  }, [products])

  useEffect(() => {
    let cancelled = false
    const q = category ? `?category=${encodeURIComponent(category)}` : ''
    setLoading(true)
    apiGet<{ products: Product[] }>(`/products${q}`)
      .then((r) => {
        if (!cancelled) setProducts(r.products)
      })
      .catch(() => {
        if (!cancelled) setProducts([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [category])

  async function addToCart(p: Product) {
    if (!user) {
      setMsg('请先登录后再加入购物车')
      return
    }
    setMsg(null)
    try {
      await apiPost('/cart', { product_id: p.id, quantity: 1 })
      setMsg(`已加入：${p.name}`)
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '加入失败')
    }
  }

  return (
    <div>
      <section className="mb-10 overflow-hidden rounded-3xl border border-stoneborder bg-gradient-to-br from-white via-cream to-amber-50/40 p-8 shadow-soft md:p-12">
        <p className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-accent">
          <Sparkles className="h-4 w-4" aria-hidden />
          今日选品
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">
          用一点温度，点亮日常
        </h1>
        <p className="mt-3 max-w-xl text-muted">
          小型精选集合，慢挑细选。库存实时同步，购物车与订单在边缘节点完成，阅读舒适、动线简单。
        </p>
      </section>

      {msg && (
        <div
          className="mb-6 rounded-2xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          role="status"
        >
          {msg}
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setCategory(null)}
          className={`cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition-default ${
            category === null ? 'bg-ink text-cream' : 'bg-white text-muted ring-1 ring-stoneborder hover:text-ink'
          }`}
        >
          全部
        </button>
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={`cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition-default ${
              category === c ? 'bg-ink text-cream' : 'bg-white text-muted ring-1 ring-stoneborder hover:text-ink'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted">加载中…</p>
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <li
              key={p.id}
              className="group flex flex-col overflow-hidden rounded-2xl border border-stoneborder bg-white shadow-soft transition-default hover:shadow-lift"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-stone-100">
                {p.images[0] ? (
                  <img
                    src={p.images[0]}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted">暂无图片</div>
                )}
                {p.category && (
                  <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-ink shadow-soft backdrop-blur">
                    {p.category}
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h2 className="font-display text-lg font-semibold text-ink">{p.name}</h2>
                {p.description && <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">{p.description}</p>}
                <div className="mt-4 flex items-end justify-between gap-3">
                  <div>
                    <p className="font-display text-2xl font-semibold text-accent">¥{p.price.toFixed(2)}</p>
                    <p className="text-xs text-muted">库存 {p.stock}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void addToCart(p)}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white shadow-soft transition-default hover:bg-accent-hover"
                  >
                    <Plus className="h-4 w-4" aria-hidden />
                    加入购物车
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
