'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Sun } from 'lucide-react'
import Link from 'next/link'

interface Employee { id: string; full_name: string; rut: string }

const inputCls = 'w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-fuchsia-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-fuchsia-400'

const PERMISO_TYPES = [
  { value: 'permiso_con_goce', label: 'Permiso con goce de sueldo' },
  { value: 'permiso_sin_goce', label: 'Permiso sin goce de sueldo' },
  { value: 'otro', label: 'Otro' },
]

export default function SolicitarPermisoPage() {
  const router = useRouter()

  const [isAdmin, setIsAdmin] = useState(false)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [myEmployee, setMyEmployee] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    employee_id: '',
    request_type: 'permiso_con_goce',
    date: '',
    end_date: '',
    is_half_day: false,
    half_day_period: 'AM' as 'AM' | 'PM',
    reason: '',
  })

  useEffect(() => {
    fetch('/api/rrhh/me')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (!d) return
        const admin = d.role === 'ADMIN' || d.role === 'OWNER'
        setIsAdmin(admin)
        if (d.employee) {
          setMyEmployee(d.employee)
          if (!admin) setForm((prev) => ({ ...prev, employee_id: d.employee.id }))
        }
        if (admin) {
          fetch('/api/rrhh/employees?status=active')
            .then((r) => r.json())
            .then((emp) => setEmployees(emp.employees ?? []))
        }
      })
  }, [])

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const payload = {
        employee_id: form.employee_id,
        request_type: form.request_type,
        start_date: form.date,
        end_date: form.is_half_day ? form.date : form.end_date,
        is_half_day: form.is_half_day,
        half_day_period: form.is_half_day ? form.half_day_period : undefined,
        reason: form.reason,
      }
      const res = await fetch('/api/rrhh/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Error'); return }
      router.push('/rrhh/solicitudes')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/rrhh/solicitudes" className="rounded-lg p-2 hover:bg-slate-100 transition">
          <ArrowLeft size={18} className="text-slate-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Solicitar permiso</h1>
          <p className="text-sm text-slate-500">Permiso laboral con o sin goce de sueldo</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">

        {isAdmin ? (
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Empleado *</label>
            <select required value={form.employee_id} onChange={(e) => set('employee_id', e.target.value)} className={inputCls}>
              <option value="">Seleccionar empleado...</option>
              {myEmployee && (
                <option value={myEmployee.id}>🧑 Yo mismo — {myEmployee.full_name}</option>
              )}
              {employees.filter((emp) => emp.id !== myEmployee?.id).map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.rut})</option>
              ))}
            </select>
          </div>
        ) : (
          myEmployee && (
            <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 block mb-0.5">Empleado</span>
              {myEmployee.full_name}
            </div>
          )
        )}

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Tipo de permiso *</label>
          <select value={form.request_type} onChange={(e) => set('request_type', e.target.value)} className={inputCls}>
            {PERMISO_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Toggle medio día */}
        <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <input type="checkbox" id="half_day" checked={form.is_half_day}
            onChange={(e) => set('is_half_day', e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 accent-fuchsia-600" />
          <label htmlFor="half_day" className="flex-1 text-sm font-medium text-slate-700 cursor-pointer">
            Medio día
          </label>
          {form.is_half_day && (
            <div className="flex items-center gap-1 rounded-lg border border-fuchsia-200 bg-white overflow-hidden">
              <button type="button" onClick={() => set('half_day_period', 'AM')}
                className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold transition ${form.half_day_period === 'AM' ? 'bg-fuchsia-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                <Sun size={11} />AM
              </button>
              <button type="button" onClick={() => set('half_day_period', 'PM')}
                className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold transition ${form.half_day_period === 'PM' ? 'bg-fuchsia-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                PM
              </button>
            </div>
          )}
        </div>

        {form.is_half_day ? (
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Fecha *</label>
            <input required type="date" value={form.date} onChange={(e) => set('date', e.target.value)} className={inputCls} />
            {form.date && (
              <p className="text-xs text-fuchsia-600 font-medium mt-1">
                0.5 días — {form.half_day_period === 'AM' ? 'Mañana (AM)' : 'Tarde (PM)'}
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Desde *</label>
              <input required type="date" value={form.date} onChange={(e) => set('date', e.target.value)} className={inputCls} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Hasta *</label>
              <input required type="date" value={form.end_date} onChange={(e) => set('end_date', e.target.value)} className={inputCls} />
            </div>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Motivo *</label>
          <textarea required rows={3} value={form.reason} onChange={(e) => set('reason', e.target.value)}
            placeholder="Describe el motivo del permiso..." className={inputCls} />
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Link href="/rrhh/solicitudes" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
            Cancelar
          </Link>
          <button type="submit" disabled={loading}
            className="rounded-lg bg-fuchsia-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-fuchsia-700 disabled:opacity-50 transition">
            {loading ? 'Enviando...' : 'Solicitar permiso'}
          </button>
        </div>
      </form>
    </div>
  )
}
