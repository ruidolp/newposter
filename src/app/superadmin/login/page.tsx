'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, ShieldCheck } from 'lucide-react'

export default function SuperadminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/superadmin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al iniciar sesión')
      }
      router.push('/superadmin/dashboard')
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-violet-600">
            <ShieldCheck size={24} className="text-white" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white [text-wrap:balance]">
            posfer.com <span className="text-violet-400">Root</span>
          </h1>
          <p className="mt-1 text-sm text-slate-400">Acceso exclusivo para administradores de la plataforma</p>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {error && (
              <div
                role="alert"
                aria-live="assertive"
                className="rounded-md border border-red-800 bg-red-950/60 px-3 py-2 text-sm text-red-300"
              >
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="sa-email" className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Email
              </label>
              <input
                id="sa-email"
                name="email"
                type="email"
                autoComplete="email"
                spellCheck={false}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="root@posfer.com"
                className="h-10 w-full rounded-md border border-slate-700 bg-slate-800 px-3 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="sa-password" className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="sa-password"
                  name="password"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-10 w-full rounded-md border border-slate-700 bg-slate-800 px-3 pr-10 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((s) => !s)}
                  aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 transition hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                >
                  {showPass ? <EyeOff size={15} aria-hidden="true" /> : <Eye size={15} aria-hidden="true" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-md bg-violet-600 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:opacity-60"
            >
              {loading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" />
              ) : (
                <ShieldCheck size={15} aria-hidden="true" />
              )}
              {loading ? 'Verificando…' : 'Acceder'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
