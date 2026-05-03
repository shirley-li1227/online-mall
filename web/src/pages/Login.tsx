import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const { login, register, user } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  if (user) return <Navigate to="/" replace />

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      if (mode === 'login') {
        await login(email.trim(), password)
      } else {
        await register(username.trim(), email.trim(), password)
      }
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : '请求失败')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-3xl border border-stoneborder bg-white p-8 shadow-soft">
        <h1 className="font-display text-2xl font-semibold text-ink">欢迎回来</h1>
        <p className="mt-2 text-sm text-muted">使用邮箱登录或注册，会话保存在安全 Cookie 中。</p>

        <div className="mt-8 flex rounded-full bg-cream p-1 ring-1 ring-stoneborder">
          <button
            type="button"
            className={`flex-1 cursor-pointer rounded-full py-2 text-sm font-medium transition-default ${
              mode === 'login' ? 'bg-white text-ink shadow-soft' : 'text-muted hover:text-ink'
            }`}
            onClick={() => setMode('login')}
          >
            登录
          </button>
          <button
            type="button"
            className={`flex-1 cursor-pointer rounded-full py-2 text-sm font-medium transition-default ${
              mode === 'register' ? 'bg-white text-ink shadow-soft' : 'text-muted hover:text-ink'
            }`}
            onClick={() => setMode('register')}
          >
            注册
          </button>
        </div>

        <form className="mt-8 space-y-4" onSubmit={(e) => void onSubmit(e)}>
          {mode === 'register' && (
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-ink">
                用户名
              </label>
              <input
                id="username"
                autoComplete="username"
                className="mt-1 w-full rounded-xl border border-stoneborder bg-cream/50 px-4 py-3 text-ink outline-none ring-accent/0 transition-default focus:border-accent focus:ring-2 focus:ring-accent/20"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          )}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-ink">
              邮箱
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className="mt-1 w-full rounded-xl border border-stoneborder bg-cream/50 px-4 py-3 text-ink outline-none transition-default focus:border-accent focus:ring-2 focus:ring-accent/20"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-ink">
              密码（至少 6 位）
            </label>
            <input
              id="password"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className="mt-1 w-full rounded-xl border border-stoneborder bg-cream/50 px-4 py-3 text-ink outline-none transition-default focus:border-accent focus:ring-2 focus:ring-accent/20"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>
          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="w-full cursor-pointer rounded-full bg-ink py-3 text-sm font-semibold text-cream shadow-soft transition-default hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? '提交中…' : mode === 'login' ? '登录' : '创建账户'}
          </button>
        </form>
      </div>
    </div>
  )
}
