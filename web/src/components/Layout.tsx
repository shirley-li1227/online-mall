import { Link, NavLink, Outlet } from 'react-router-dom'
import { ShoppingBag, Package, UserRound, LogOut, LayoutGrid } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'

const navCls = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-default cursor-pointer ${
    isActive ? 'bg-ink text-cream shadow-soft' : 'text-muted hover:bg-white/80 hover:text-ink'
  }`

export default function Layout() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-4 z-50 px-4 md:px-8">
        <div className="mx-auto max-w-6xl rounded-2xl border border-stoneborder bg-white/90 px-4 py-3 shadow-soft backdrop-blur-md md:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link to="/" className="group flex items-baseline gap-2 cursor-pointer">
              <span className="font-display text-xl font-semibold tracking-tight text-ink group-hover:text-accent transition-default">
                Studio Mall
              </span>
              <span className="hidden text-xs text-muted sm:inline">精选生活好物</span>
            </Link>
            <nav className="flex flex-wrap items-center gap-1">
              <NavLink to="/" className={navCls} end>
                <LayoutGrid className="h-4 w-4 shrink-0" aria-hidden />
                选购
              </NavLink>
              {user && (
                <>
                  <NavLink to="/cart" className={navCls}>
                    <ShoppingBag className="h-4 w-4 shrink-0" aria-hidden />
                    购物车
                  </NavLink>
                  <NavLink to="/orders" className={navCls}>
                    <Package className="h-4 w-4 shrink-0" aria-hidden />
                    订单
                  </NavLink>
                </>
              )}
              {user ? (
                <div className="ml-2 flex items-center gap-2 border-l border-stoneborder pl-4">
                  <span className="hidden max-w-[10rem] truncate text-sm text-muted sm:inline" title={user.email}>
                    <UserRound className="mr-1 inline h-4 w-4 align-text-bottom" aria-hidden />
                    {user.username}
                  </span>
                  <button
                    type="button"
                    onClick={() => void logout()}
                    className="flex items-center gap-1 rounded-full border border-stoneborder px-3 py-1.5 text-sm text-muted transition-default hover:border-ink hover:text-ink cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" aria-hidden />
                    退出
                  </button>
                </div>
              ) : (
                <NavLink to="/login" className={navCls}>
                  <UserRound className="h-4 w-4 shrink-0" aria-hidden />
                  登录
                </NavLink>
              )}
            </nav>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-8 md:px-8">
        <Outlet />
      </main>

      <footer className="border-t border-stoneborder bg-white/60 py-8 text-center text-sm text-muted">
        <p>Cloudflare Workers · D1 · KV · React · Hono</p>
      </footer>
    </div>
  )
}
