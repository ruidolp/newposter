'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Building2, ArrowRight, Store } from 'lucide-react'

type Step = 'slug' | 'credentials'

interface Tenant { id: string; name: string; slug: string }

export default function LoginPage() {
  const router = useRouter()

  const [step, setStep] = useState<Step>('slug')
  const [slug, setSlug] = useState('')
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // ── Step 1: buscar empresa por slug ───────────────────────────────────────
  async function handleSlugSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!slug.trim()) return
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`/api/tenant/${slug.trim().toLowerCase()}`)
      if (!res.ok) throw new Error('Empresa no encontrada')
      const data = await res.json()
      if (!data.id) throw new Error('Empresa no encontrada')
      setTenant(data)
      setStep('credentials')
    } catch {
      setError('No encontramos una empresa con ese nombre. Verifica el slug e intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  // ── Step 2: login con credenciales ────────────────────────────────────────
  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!tenant) return
    setError('')
    setLoading(true)
    try {
      const result = await signIn('credentials', {
        email,
        password,
        tenantId: tenant.id,
        redirect: false,
      })
      if (result?.error) {
        setError('Email o contraseña incorrectos')
      } else {
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
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-tr from-fuchsia-600 to-rose-500 shadow-md">
            <Store size={22} className="text-white" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">
            <span className="bg-gradient-to-r from-fuchsia-600 to-rose-600 bg-clip-text text-transparent">POSFER</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {step === 'slug' ? 'Ingresa el nombre de tu empresa' : `Iniciando sesión en ${tenant?.name}`}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">

          {/* Step 1: Slug */}
          {step === 'slug' && (
            <form onSubmit={handleSlugSubmit} noValidate className="space-y-4" aria-label="Buscar empresa">
              {error && (
                <div role="alert" aria-live="assertive" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="company-slug" className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Nombre de la empresa (slug)
                </label>
                <input
                  id="company-slug"
                  name="company-slug"
                  type="text"
                  autoComplete="organization"
                  spellCheck={false}
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                  placeholder="mi-empresa"
                  autoFocus
                  className={`${inputCls} font-mono`}
                />
                <p className="text-xs text-slate-400">
                  Ejemplo: si tu URL es <code className="text-fuchsia-600">/login/ferreteria-el-clavo</code>, ingresa <code className="text-fuchsia-600">ferreteria-el-clavo</code>
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || !slug.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-fuchsia-600 py-2.5 text-sm font-semibold text-white transition hover:bg-fuchsia-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400 focus-visible:ring-offset-2 disabled:opacity-60"
              >
                {loading
                  ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" />
                  : <ArrowRight size={15} aria-hidden="true" />
                }
                {loading ? 'Buscando…' : 'Continuar'}
              </button>
            </form>
          )}

          {/* Step 2: Credentials */}
          {step === 'credentials' && tenant && (
            <form onSubmit={handleLoginSubmit} noValidate className="space-y-4" aria-label={`Iniciar sesión en ${tenant.name}`}>
              {/* Tenant badge */}
              <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                <Building2 size={14} className="shrink-0 text-fuchsia-600" aria-hidden="true" />
                <span className="text-sm font-medium text-slate-800">{tenant.name}</span>
                <button
                  type="button"
                  onClick={() => { setStep('slug'); setError(''); setTenant(null) }}
                  className="ml-auto text-xs text-slate-400 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500 rounded"
                >
                  Cambiar
                </button>
              </div>

              {error && (
                <div role="alert" aria-live="assertive" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
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
                  autoFocus
                  className={inputCls}
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
                className="flex w-full items-center justify-center gap-2 rounded-md bg-fuchsia-600 py-2.5 text-sm font-semibold text-white transition hover:bg-fuchsia-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400 focus-visible:ring-offset-2 disabled:opacity-60"
              >
                {loading && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" />
                )}
                {loading ? 'Verificando…' : 'Iniciar sesión'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
