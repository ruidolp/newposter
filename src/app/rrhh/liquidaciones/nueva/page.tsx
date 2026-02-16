'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface Employee { id: string; full_name: string; rut: string }

const inputCls = 'w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-fuchsia-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-fuchsia-400'

const MONTHS = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

export default function NuevaLiquidacionPage() {
  const router = useRouter()
  const now = new Date()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    employee_id: '',
    period_year: String(now.getFullYear()),
    period_month: String(now.getMonth() + 1),
    absent_days: '0',
    vacation_days: '0',
    other_deductions: '0',
    utm_value: '67294',
    notes: '',
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
      const res = await fetch('/api/rrhh/payrolls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: form.employee_id,
          period_year: Number(form.period_year),
          period_month: Number(form.period_month),
          absent_days: Number(form.absent_days),
          vacation_days: Number(form.vacation_days),
          other_deductions: Number(form.other_deductions),
          utm_value: Number(form.utm_value),
          notes: form.notes,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Error'); return }
      router.push(`/rrhh/liquidaciones/${data.id}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/rrhh/liquidaciones" className="rounded-lg p-2 hover:bg-slate-100 transition">
          <ArrowLeft size={18} className="text-slate-500" />
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Generar liquidación</h1>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Empleado *</label>
          <select required value={form.employee_id} onChange={(e) => set('employee_id', e.target.value)} className={inputCls}>
            <option value="">Seleccionar...</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.rut})</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Mes *</label>
            <select required value={form.period_month} onChange={(e) => set('period_month', e.target.value)} className={inputCls}>
              {MONTHS.slice(1).map((m, i) => (
                <option key={i + 1} value={String(i + 1)}>{m}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Año *</label>
            <select required value={form.period_year} onChange={(e) => set('period_year', e.target.value)} className={inputCls}>
              {[2025, 2026, 2027].map((y) => <option key={y} value={String(y)}>{y}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Días ausente</label>
            <input type="number" min="0" max="30" value={form.absent_days}
              onChange={(e) => set('absent_days', e.target.value)} className={inputCls} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Días vacaciones en período</label>
            <input type="number" min="0" value={form.vacation_days}
              onChange={(e) => set('vacation_days', e.target.value)} className={inputCls} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Otros descuentos (CLP)</label>
            <input type="number" min="0" value={form.other_deductions}
              onChange={(e) => set('other_deductions', e.target.value)} className={inputCls} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Valor UTM (CLP)</label>
            <input type="number" min="0" value={form.utm_value}
              onChange={(e) => set('utm_value', e.target.value)} className={inputCls} />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Notas</label>
          <textarea rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} className={inputCls} />
        </div>

        <div className="rounded-lg bg-fuchsia-50 border border-fuchsia-100 px-4 py-3 text-xs text-slate-600">
          Se incluirán automáticamente las HHEE aprobadas del período.
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Link href="/rrhh/liquidaciones" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
            Cancelar
          </Link>
          <button type="submit" disabled={loading}
            className="rounded-lg bg-fuchsia-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-fuchsia-700 disabled:opacity-50 transition">
            {loading ? 'Calculando...' : 'Generar liquidación'}
          </button>
        </div>
      </form>
    </div>
  )
}
