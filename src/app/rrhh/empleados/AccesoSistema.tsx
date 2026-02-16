'use client'

import { useEffect, useState } from 'react'
import {
  CheckCircle2, Link2Off, Loader2,
  MessageCircle, ShieldCheck, UserPlus, X, AlertCircle,
} from 'lucide-react'

interface LinkedUser {
  id: string
  name: string
  email: string
  role: string
}

interface Credentials {
  email: string
  password: string
}

interface Props {
  employeeId: string
  employeeName: string
  employeePhone: string | null
  initialUserId: string | null
}

const ROLE_LABEL: Record<string, string> = {
  OWNER: 'Propietario', ADMIN: 'Administrador',
  EMPLOYEE: 'Empleado RRHH', CASHIER: 'Cajero', STAFF: 'Staff',
}
const ROLE_COLOR: Record<string, string> = {
  OWNER: 'bg-rose-100 text-rose-700',
  ADMIN: 'bg-fuchsia-100 text-fuchsia-700',
  EMPLOYEE: 'bg-blue-100 text-blue-700',
  CASHIER: 'bg-amber-100 text-amber-700',
  STAFF: 'bg-slate-100 text-slate-600',
}

export default function AccesoSistema({ employeeId, employeeName, employeePhone, initialUserId }: Props) {
  const [linkedUser, setLinkedUser] = useState<LinkedUser | null>(null)
  const [loadingUser, setLoadingUser] = useState(!!initialUserId)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [newCreds, setNewCreds] = useState<Credentials | null>(null)

  useEffect(() => {
    if (!initialUserId) return
    fetch(`/api/users/${initialUserId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.id) setLinkedUser(data) })
      .finally(() => setLoadingUser(false))
  }, [initialUserId])

  async function handleCreateLogin() {
    setCreating(true)
    setError('')
    try {
      const res = await fetch(`/api/rrhh/employees/${employeeId}/create-user`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error al crear acceso'); return }
      setLinkedUser(data.user)
      setNewCreds(data.credentials)
    } finally {
      setCreating(false)
    }
  }

  async function handleUnlink() {
    if (!confirm('¿Quitar el vínculo con esta cuenta? La cuenta del sistema no se elimina.')) return
    const res = await fetch(`/api/rrhh/employees/${employeeId}/link-user`, { method: 'DELETE' })
    if (res.ok) { setLinkedUser(null); setNewCreds(null) }
  }

  function buildWhatsAppLink(creds: Credentials, phone: string | null): string {
    const appUrl = typeof window !== 'undefined' ? window.location.origin : ''
    const msg = [
      `¡Hola ${employeeName}! 👋`,
      ``,
      `Ya tienes acceso al sistema. Tus credenciales son:`,
      ``,
      `📧 *Usuario:* ${creds.email}`,
      `🔑 *Contraseña:* ${creds.password}`,
      ``,
      `🔗 *Ingresa aquí:* ${appUrl}/login`,
      ``,
      `Te recomendamos cambiar tu contraseña al ingresar por primera vez.`,
    ].join('\n')

    const encodedMsg = encodeURIComponent(msg)
    const cleanPhone = phone ? phone.replace(/\D/g, '') : ''
    return cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodedMsg}`
      : `https://wa.me/?text=${encodedMsg}`
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
      <div className="flex items-center gap-2">
        <ShieldCheck size={17} className="text-fuchsia-600" />
        <h2 className="font-semibold text-slate-800">Login al sistema</h2>
      </div>

      {loadingUser ? (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 size={14} className="animate-spin" /> Cargando...
        </div>
      ) : linkedUser ? (
        /* ── Con cuenta vinculada ── */
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3.5">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0 text-emerald-600" />
              <div>
                <p className="text-sm font-semibold text-slate-800">{linkedUser.name}</p>
                <p className="text-xs text-slate-500">{linkedUser.email}</p>
                <span className={`mt-1.5 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_COLOR[linkedUser.role] ?? 'bg-slate-100 text-slate-500'}`}>
                  {ROLE_LABEL[linkedUser.role] ?? linkedUser.role}
                </span>
                <p className="mt-1.5 text-xs text-slate-400">
                  Este empleado usa este login para acceder al sistema.
                  {['OWNER', 'ADMIN'].includes(linkedUser.role) && ' También gestiona el sistema de ventas.'}
                  {linkedUser.role === 'EMPLOYEE' && ' Solo tiene acceso al módulo de RRHH.'}
                  {linkedUser.role === 'CASHIER' && ' Accede al POS y al módulo de RRHH.'}
                </p>
              </div>
            </div>
            <button onClick={handleUnlink} title="Quitar vínculo"
              className="flex-shrink-0 rounded p-1 text-slate-300 hover:bg-slate-100 hover:text-red-500 transition">
              <Link2Off size={14} />
            </button>
          </div>

          {/* Credenciales recién creadas */}
          {newCreds && (
            <div className="rounded-lg border border-fuchsia-200 bg-fuchsia-50 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-fuchsia-700">
                Credenciales creadas — solo visibles ahora
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded bg-white border border-fuchsia-100 px-3 py-2">
                  <p className="text-xs text-slate-400 mb-0.5">Email</p>
                  <p className="font-mono text-sm font-medium text-slate-800 break-all">{newCreds.email}</p>
                </div>
                <div className="rounded bg-white border border-fuchsia-100 px-3 py-2">
                  <p className="text-xs text-slate-400 mb-0.5">Contraseña inicial</p>
                  <p className="font-mono text-sm font-bold text-fuchsia-700">{newCreds.password}</p>
                </div>
              </div>
              <p className="text-[11px] text-slate-400">La contraseña es el RUT sin puntos ni guión. No se vuelve a mostrar.</p>
              <a href={buildWhatsAppLink(newCreds, employeePhone)} target="_blank" rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#1fbb58] transition">
                <MessageCircle size={16} />
                Enviar credenciales por WhatsApp
              </a>
              <button onClick={() => setNewCreds(null)}
                className="flex w-full items-center justify-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition">
                <X size={11} /> Cerrar
              </button>
            </div>
          )}
        </div>
      ) : (
        /* ── Sin cuenta ── */
        <div className="space-y-3">
          <p className="text-sm text-slate-500">
            Este empleado <strong>no tiene login</strong> en el sistema. Si necesita ver sus vacaciones,
            liquidaciones o hacer solicitudes, créale un acceso.
          </p>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button onClick={handleCreateLogin} disabled={creating}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-fuchsia-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-fuchsia-700 disabled:opacity-50 transition">
            {creating ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
            {creating ? 'Creando acceso...' : 'Crear login para este empleado'}
          </button>
          <p className="text-xs text-slate-400 text-center">
            Se creará con rol <strong>Empleado RRHH</strong> y contraseña inicial = RUT sin puntos.
            Podrás enviarle las credenciales por WhatsApp.
          </p>
        </div>
      )}
    </section>
  )
}
