'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Building2 } from 'lucide-react'
import Link from 'next/link'

interface Props {
  tenantId: string
  tenantName: string
  tenantSlug: string
}

export default function SlugLoginClient({ tenantId, tenantName, tenantSlug }: Props) {
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
      const result = await signIn('credentials', {
        email,
        password,
        tenantId,
        redirect: false,
      })
      if (result?.error) {
        setError('Email o contraseña incorrectos')
      } else {
        // Guardar cookie para persistencia en desarrollo/fallback
        document.cookie = `tenant_slug=${tenantSlug}; path=/; max-age=2592000` // 30 días
        router.push('/admin/dashboard')
      }
    } catch {
      setError('Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200'

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm">
        {/* Tenant badge */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-fuchsia-600 shadow-lg">
            <Building2 size={26} className="text-white" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 [text-wrap:balance]">
            {tenantName}
          </h1>
          <p className="mt-1 text-sm text-slate-500">Inicia sesión en tu cuenta</p>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <form onSubmit={handleSubmit} noValidate className="space-y-4" aria-label={`Iniciar sesión en ${tenantName}`}>
            {error && (
              <div
                role="alert"
                aria-live="assertive"
                className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                spellCheck={false}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.cl"
                className={inputCls}
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`${inputCls} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((s) => !s)}
                  aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 transition hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500"
                >
                  {showPass ? <EyeOff size={15} aria-hidden="true" /> : <Eye size={15} aria-hidden="true" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-md bg-fuchsia-600 py-2.5 text-sm font-semibold text-white transition hover:bg-fuchsia-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400 focus-visible:ring-offset-2 disabled:opacity-60"
            >
              {loading && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" />
              )}
              {loading ? 'Verificando…' : 'Iniciar sesión'}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          ¿Empresa equivocada?{' '}
          <Link
            href="/login"
            className="text-fuchsia-600 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500 rounded"
          >
            Cambiar empresa
          </Link>
        </p>
      </div>
    </div>
  )
}
