'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  BriefcaseBusiness, CalendarClock, ChevronRight,
  Clock, Download, FileText, Loader2, X,
} from 'lucide-react'
import Link from 'next/link'

interface SystemUser {
  id: string
  name: string
  email: string
  role: string
}

const ROLE_LABEL: Record<string, string> = {
  OWNER: 'Propietario', ADMIN: 'Administrador',
  CASHIER: 'Cajero', STAFF: 'Staff', EMPLOYEE: 'Empleado',
}
const ROLE_COLOR: Record<string, string> = {
  OWNER: 'bg-rose-100 text-rose-700',
  ADMIN: 'bg-fuchsia-100 text-fuchsia-700',
  CASHIER: 'bg-amber-100 text-amber-700',
  STAFF: 'bg-slate-100 text-slate-600',
  EMPLOYEE: 'bg-blue-100 text-blue-700',
}

const FEATURES = [
  { icon: BriefcaseBusiness, label: 'Fichas de empleados', desc: 'Datos personales, laborales y contractuales' },
  { icon: CalendarClock, label: 'Vacaciones y permisos', desc: 'Solicitudes con aprobación de jefes' },
  { icon: Clock, label: 'Horas extra', desc: 'Registro y aprobación de HHEE con cálculo automático' },
  { icon: FileText, label: 'Liquidaciones de sueldo', desc: 'Cálculo completo AFP, salud, impuesto y neto' },
]

type Step = 'welcome' | 'import' | 'done'

export default function ActivarRrhhPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('welcome')
  const [activating, setActivating] = useState(false)
  const [usersToImport, setUsersToImport] = useState<SystemUser[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')

  async function handleActivate() {
    setActivating(true)
    setError('')
    try {
      const res = await fetch('/api/rrhh/activate', { method: 'POST' })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'Error al activar')
        return
      }
      // Cargar usuarios para importar
      const usersRes = await fetch('/api/rrhh/users-without-profile')
      const usersData = await usersRes.json()
      const users: SystemUser[] = usersData.users ?? []
      setUsersToImport(users)
      // Pre-seleccionar todos
      setSelectedIds(new Set(users.map((u) => u.id)))
      setStep('import')
    } finally {
      setActivating(false)
    }
  }

  function toggleUser(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleImport() {
    if (selectedIds.size === 0) {
      setStep('done')
      return
    }
    setImporting(true)
    try {
      // Redirigir uno por uno al formulario sería confuso.
      // Aquí hacemos una importación básica en lote: crea empleado mínimo vinculado al user.
      // El admin completa la ficha después.
      const selected = usersToImport.filter((u) => selectedIds.has(u.id))
      for (const user of selected) {
        await fetch('/api/rrhh/employees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: user.name,
            email: user.email,
            rut: 'pendiente',          // se completa después en la ficha
            position: 'Por definir',
            hire_date: new Date().toISOString().split('T')[0],
            contract_type: 'indefinido',
            user_id: user.id,
          }),
        })
      }
      setStep('done')
    } finally {
      setImporting(false)
    }
  }

  // ── Pantalla bienvenida ──────────────────────────────────────
  if (step === 'welcome') {
    return (
      <div className="flex min-h-[70vh] items-center justify-center p-4">
        <div className="w-full max-w-lg space-y-6">
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-tr from-fuchsia-600 to-rose-500 shadow-lg shadow-fuchsia-200">
              <BriefcaseBusiness size={30} className="text-white" />
            </div>
            <h1 className="text-2xl font-black text-slate-900">Módulo de Gestión de Personal</h1>
            <p className="mt-2 text-slate-500">
              Administra empleados, vacaciones, horas extra y liquidaciones de sueldo desde un solo lugar.
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-2 gap-3">
            {FEATURES.map((f) => {
              const Icon = f.icon
              return (
                <div key={f.label} className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
                  <div className="mb-2 inline-flex rounded-lg bg-fuchsia-50 p-2">
                    <Icon size={16} className="text-fuchsia-600" />
                  </div>
                  <p className="text-sm font-semibold text-slate-800">{f.label}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{f.desc}</p>
                </div>
              )
            })}
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          {/* Acciones */}
          <div className="space-y-2">
            <button
              onClick={handleActivate}
              disabled={activating}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-fuchsia-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-fuchsia-200 hover:bg-fuchsia-700 disabled:opacity-50 transition"
            >
              {activating
                ? <><Loader2 size={16} className="animate-spin" /> Activando...</>
                : <><BriefcaseBusiness size={16} /> Activar módulo RRHH</>}
            </button>
            <Link
              href="/admin/dashboard"
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-500 hover:bg-slate-50 transition"
            >
              <X size={14} />
              Continuar sin activar por ahora
            </Link>
          </div>
          <p className="text-center text-xs text-slate-400">
            Solo propietarios y administradores pueden activar este módulo.
          </p>
        </div>
      </div>
    )
  }

  // ── Paso importar usuarios ───────────────────────────────────
  if (step === 'import') {
    return (
      <div className="flex min-h-[70vh] items-center justify-center p-4">
        <div className="w-full max-w-lg space-y-5">
          <div className="text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-fuchsia-100">
              <Download size={22} className="text-fuchsia-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">¡Módulo activado!</h2>
            <p className="mt-1.5 text-sm text-slate-500">
              {usersToImport.length > 0
                ? `Encontramos ${usersToImport.length} usuario${usersToImport.length !== 1 ? 's' : ''} en tu sistema sin ficha de empleado. ¿Quieres crearles su perfil RRHH ahora?`
                : 'Tu módulo RRHH está listo. Puedes comenzar agregando empleados.'}
            </p>
          </div>

          {usersToImport.length > 0 && (
            <>
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-slate-100 bg-slate-50 px-4 py-2.5 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Usuarios encontrados</p>
                  <button
                    onClick={() => setSelectedIds(
                      selectedIds.size === usersToImport.length
                        ? new Set()
                        : new Set(usersToImport.map((u) => u.id))
                    )}
                    className="text-xs text-fuchsia-600 hover:underline"
                  >
                    {selectedIds.size === usersToImport.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                  </button>
                </div>
                <div className="divide-y divide-slate-100">
                  {usersToImport.map((user) => (
                    <label key={user.id} className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-slate-50 transition">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(user.id)}
                        onChange={() => toggleUser(user.id)}
                        className="h-4 w-4 rounded border-slate-300 accent-fuchsia-600"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{user.name}</p>
                        <p className="text-xs text-slate-400 truncate">{user.email}</p>
                      </div>
                      <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_COLOR[user.role] ?? 'bg-slate-100 text-slate-500'}`}>
                        {ROLE_LABEL[user.role] ?? user.role}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <p className="text-xs text-slate-400">
                Se creará una ficha básica vinculada a su login existente.
                Podrás completar los datos laborales después.
              </p>
            </>
          )}

          <div className="space-y-2">
            <button
              onClick={handleImport}
              disabled={importing}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-fuchsia-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-fuchsia-200 hover:bg-fuchsia-700 disabled:opacity-50 transition"
            >
              {importing
                ? <><Loader2 size={16} className="animate-spin" /> Importando...</>
                : selectedIds.size > 0
                  ? <><Download size={16} /> Importar {selectedIds.size} usuario{selectedIds.size !== 1 ? 's' : ''} seleccionado{selectedIds.size !== 1 ? 's' : ''}</>
                  : <>Continuar sin importar <ChevronRight size={16} /></>}
            </button>
            <button
              onClick={() => setStep('done')}
              className="flex w-full items-center justify-center text-sm text-slate-400 hover:text-slate-600 transition py-1"
            >
              Hacer esto después
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Paso final ───────────────────────────────────────────────
  return (
    <div className="flex min-h-[70vh] items-center justify-center p-4">
      <div className="w-full max-w-sm text-center space-y-5">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-100">
          <BriefcaseBusiness size={30} className="text-emerald-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">¡Todo listo!</h2>
          <p className="mt-1.5 text-sm text-slate-500">Tu módulo RRHH está configurado y listo para usar.</p>
        </div>
        <button
          onClick={() => router.push('/rrhh/dashboard')}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-fuchsia-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-fuchsia-200 hover:bg-fuchsia-700 transition"
        >
          Ir al dashboard RRHH <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
