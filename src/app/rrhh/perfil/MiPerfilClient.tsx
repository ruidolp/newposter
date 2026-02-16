'use client'

import { useState } from 'react'
import { Eye, EyeOff, KeyRound, User } from 'lucide-react'

const inputCls = 'w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-fuchsia-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-fuchsia-400'

const ROLE_LABEL: Record<string, string> = {
  OWNER: 'Propietario', ADMIN: 'Administrador',
  EMPLOYEE: 'Empleado', CASHIER: 'Cajero', STAFF: 'Staff',
}

interface Props { name: string; email: string; role: string }

export default function MiPerfilClient({ name, email, role }: Props) {
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)

  function set(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setError('')
    setSuccess(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.new_password !== form.confirm_password) {
      setError('Las contraseñas nuevas no coinciden')
      return
    }
    if (form.new_password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/rrhh/me/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_password: form.current_password,
          new_password: form.new_password,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Error al cambiar contraseña'); return }
      setSuccess(true)
      setForm({ current_password: '', new_password: '', confirm_password: '' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Mi perfil</h1>
        <p className="mt-0.5 text-sm text-slate-500">Información de tu cuenta y acceso</p>
      </div>

      {/* Info de cuenta */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <User size={16} className="text-fuchsia-600" />
          <h2 className="font-semibold text-slate-800">Datos de acceso</h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Nombre</p>
            <p className="text-sm font-medium text-slate-800">{name || '—'}</p>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Email</p>
            <p className="text-sm font-medium text-slate-800">{email || '—'}</p>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Rol</p>
            <p className="text-sm font-medium text-slate-800">{ROLE_LABEL[role] ?? (role || '—')}</p>
          </div>
        </div>
      </section>

      {/* Cambio de contraseña */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound size={16} className="text-fuchsia-600" />
          <h2 className="font-semibold text-slate-800">Cambiar contraseña</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Contraseña actual *</label>
            <div className="relative">
              <input required type={showCurrent ? 'text' : 'password'}
                value={form.current_password} onChange={(e) => set('current_password', e.target.value)}
                className={`${inputCls} pr-10`} placeholder="Tu contraseña actual" />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Nueva contraseña *</label>
            <div className="relative">
              <input required type={showNew ? 'text' : 'password'}
                value={form.new_password} onChange={(e) => set('new_password', e.target.value)}
                className={`${inputCls} pr-10`} placeholder="Mínimo 6 caracteres" />
              <button type="button" onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Confirmar nueva contraseña *</label>
            <input required type="password"
              value={form.confirm_password} onChange={(e) => set('confirm_password', e.target.value)}
              className={inputCls} placeholder="Repite la nueva contraseña" />
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}
          {success && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 font-medium">
              ✓ Contraseña actualizada correctamente
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button type="submit" disabled={loading}
              className="rounded-lg bg-fuchsia-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-fuchsia-700 disabled:opacity-50 transition">
              {loading ? 'Guardando...' : 'Cambiar contraseña'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
