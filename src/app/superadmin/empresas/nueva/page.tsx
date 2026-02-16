'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Building2, CheckCircle2, Eye, EyeOff, ShieldCheck } from 'lucide-react'

const PLANS = ['FREE', 'BASIC', 'PRO', 'ENTERPRISE']

function slugify(str: string) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export default function NuevaEmpresaPage() {
  const router = useRouter()

  const [form, setForm] = useState({
    name: '', slug: '', plan: 'FREE',
    owner_name: '', owner_email: '', owner_password: '',
  })
  const [showPass, setShowPass] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [slugManual, setSlugManual] = useState(false)

  function setField(key: string, value: string) {
    setForm((prev) => {
      const next = { ...prev, [key]: value }
      if (key === 'name' && !slugManual) {
        next.slug = slugify(value)
      }
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    // Validaciones cliente
    if (!form.name.trim()) { setError('El nombre de la empresa es requerido'); return }
    if (!form.slug.trim()) { setError('El slug es requerido'); return }
    if (!/^[a-z0-9-]+$/.test(form.slug)) { setError('El slug solo puede tener letras minúsculas, números y guiones'); return }
    if (!form.owner_name.trim()) { setError('El nombre del responsable es requerido'); return }
    if (!form.owner_email.trim()) { setError('El email del responsable es requerido'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.owner_email)) { setError('Ingresa un email válido'); return }
    if (!form.owner_password || form.owner_password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }

    setSaving(true)
    try {
      const res = await fetch('/api/superadmin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al crear empresa')
      }
      router.push('/superadmin/dashboard')
    } catch (e: unknown) {
      setError((e as Error).message)
      setSaving(false)
    }
  }

  const inputCls = 'h-10 w-full rounded-md border border-slate-700 bg-slate-800 px-3 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 disabled:opacity-50'
  const labelCls = 'block text-xs font-medium uppercase tracking-wide text-slate-400'

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Topbar */}
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-violet-600">
            <ShieldCheck size={16} aria-hidden="true" />
          </div>
          <span className="font-bold tracking-tight">
            Venta<span className="text-violet-400">Fácil</span>
            <span className="ml-2 text-xs font-normal text-slate-400">Root</span>
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {/* Back */}
        <Link
          href="/superadmin/dashboard"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Volver al dashboard
        </Link>

        <h1 className="mb-6 text-2xl font-bold tracking-tight [text-wrap:balance]">
          <Building2 className="mb-1 inline-block mr-2 text-violet-400" size={22} aria-hidden="true" />
          Nueva Empresa
        </h1>

        <form onSubmit={handleSubmit} noValidate className="space-y-6" aria-label="Formulario nueva empresa">

          {error && (
            <div
              role="alert"
              aria-live="assertive"
              className="rounded-md border border-red-800 bg-red-950/60 px-4 py-3 text-sm text-red-300"
            >
              {error}
            </div>
          )}

          {/* Sección empresa */}
          <fieldset className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <legend className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-400">
              Datos de la empresa
            </legend>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5 md:col-span-2">
                <label htmlFor="company-name" className={labelCls}>Nombre *</label>
                <input
                  id="company-name"
                  name="company-name"
                  autoComplete="organization"
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                  placeholder="Ferretería El Clavo S.A."
                  autoFocus
                  required
                  className={inputCls}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="company-slug" className={labelCls}>
                  Slug (URL) *
                </label>
                <input
                  id="company-slug"
                  name="company-slug"
                  autoComplete="off"
                  spellCheck={false}
                  value={form.slug}
                  onChange={(e) => { setSlugManual(true); setField('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')) }}
                  placeholder="ferreteria-el-clavo"
                  required
                  pattern="[a-z0-9-]+"
                  className={`${inputCls} font-mono`}
                />
                <p className="text-xs text-slate-500">
                  URL de acceso: <code className="text-violet-400">/login/{form.slug || 'slug'}</code>
                </p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="company-plan" className={labelCls}>Plan</label>
                <select
                  id="company-plan"
                  name="company-plan"
                  value={form.plan}
                  onChange={(e) => setField('plan', e.target.value)}
                  className="h-10 w-full rounded-md border border-slate-700 bg-slate-800 px-3 text-sm text-white outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30"
                >
                  {PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
          </fieldset>

          {/* Sección owner */}
          <fieldset className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <legend className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-400">
              Responsable (Owner)
            </legend>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5 md:col-span-2">
                <label htmlFor="owner-name" className={labelCls}>Nombre completo *</label>
                <input
                  id="owner-name"
                  name="owner-name"
                  autoComplete="name"
                  value={form.owner_name}
                  onChange={(e) => setField('owner_name', e.target.value)}
                  placeholder="Juan Pérez"
                  required
                  className={inputCls}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="owner-email" className={labelCls}>Email *</label>
                <input
                  id="owner-email"
                  name="owner-email"
                  type="email"
                  autoComplete="email"
                  spellCheck={false}
                  value={form.owner_email}
                  onChange={(e) => setField('owner_email', e.target.value)}
                  placeholder="juan@empresa.cl"
                  required
                  className={inputCls}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="owner-password" className={labelCls}>Contraseña inicial *</label>
                <div className="relative">
                  <input
                    id="owner-password"
                    name="owner-password"
                    type={showPass ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={form.owner_password}
                    onChange={(e) => setField('owner_password', e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required
                    minLength={6}
                    className={`${inputCls} pr-10`}
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
                <p className="text-xs text-slate-500">El owner podrá cambiarla desde su perfil</p>
              </div>
            </div>
          </fieldset>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <Link
              href="/superadmin/dashboard"
              className="rounded-md border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-md bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:opacity-60"
            >
              {saving
                ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" />
                : <CheckCircle2 size={15} aria-hidden="true" />
              }
              {saving ? 'Creando empresa…' : 'Crear empresa'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
