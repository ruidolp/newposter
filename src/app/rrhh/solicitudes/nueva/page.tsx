'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface Employee { id: string; full_name: string; rut: string }

const inputCls = 'w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-fuchsia-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-fuchsia-400'

export default function NuevaSolicitudPage() {
  const router = useRouter()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    employee_id: '', request_type: 'vacaciones',
    start_date: '', end_date: '', reason: '',
  })

  useEffect(() => {
    fetch('/api/rrhh/employees?status=active')
      .then((r) => r.json())
      .then((d) => setEmployees(d.employees ?? []))
  }, [])

  function set(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/rrhh/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
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
        <h1 className="text-2xl font-bold text-slate-900">Nueva solicitud</h1>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Empleado *</label>
          <select required value={form.employee_id} onChange={(e) => set('employee_id', e.target.value)} className={inputCls}>
            <option value="">Seleccionar empleado...</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.rut})</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Tipo *</label>
          <select required value={form.request_type} onChange={(e) => set('request_type', e.target.value)} className={inputCls}>
            <option value="vacaciones">Vacaciones</option>
            <option value="permiso_con_goce">Permiso con goce de sueldo</option>
            <option value="permiso_sin_goce">Permiso sin goce de sueldo</option>
            <option value="otro">Otro</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Desde *</label>
            <input required type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} className={inputCls} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Hasta *</label>
            <input required type="date" value={form.end_date} onChange={(e) => set('end_date', e.target.value)} className={inputCls} />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Motivo</label>
          <textarea rows={3} value={form.reason} onChange={(e) => set('reason', e.target.value)}
            placeholder="Descripción opcional..." className={inputCls} />
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
            {loading ? 'Guardando...' : 'Crear solicitud'}
          </button>
        </div>
      </form>
    </div>
  )
}
