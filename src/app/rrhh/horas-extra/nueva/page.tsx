'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface Employee { id: string; full_name: string; rut: string }

const inputCls = 'w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-fuchsia-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-fuchsia-400'

export default function NuevaHorasExtraPage() {
  const router = useRouter()

  const [isAdmin, setIsAdmin] = useState(false)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [myEmployee, setMyEmployee] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    employee_id: '',
    overtime_date: new Date().toISOString().split('T')[0],
    hours: '',
    overtime_type: 'regular',
    description: '',
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

  function set(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/rrhh/overtime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, hours: Number(form.hours) }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Error'); return }
      router.push('/rrhh/horas-extra')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/rrhh/horas-extra" className="rounded-lg p-2 hover:bg-slate-100 transition">
          <ArrowLeft size={18} className="text-slate-500" />
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Registrar horas extra</h1>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">

        {/* Selector de empleado — solo ADMIN/OWNER */}
        {isAdmin ? (
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Empleado *</label>
            <select required value={form.employee_id} onChange={(e) => set('employee_id', e.target.value)} className={inputCls}>
              <option value="">Seleccionar empleado...</option>
              {myEmployee && (
                <option value={myEmployee.id}>🧑 Yo mismo — {myEmployee.full_name}</option>
              )}
              {employees
                .filter((emp) => emp.id !== myEmployee?.id)
                .map((emp) => (
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

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Fecha *</label>
            <input required type="date" value={form.overtime_date} onChange={(e) => set('overtime_date', e.target.value)} className={inputCls} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Horas *</label>
            <input required type="number" min="0.5" max="12" step="0.5"
              value={form.hours} onChange={(e) => set('hours', e.target.value)}
              placeholder="Ej: 2" className={inputCls} />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Tipo</label>
          <select value={form.overtime_type} onChange={(e) => set('overtime_type', e.target.value)} className={inputCls}>
            <option value="regular">Regular — factor x1.5</option>
            <option value="domingo">Domingo — factor x2</option>
            <option value="festivo">Festivo — factor x2</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Descripción</label>
          <textarea rows={2} value={form.description} onChange={(e) => set('description', e.target.value)}
            placeholder="Motivo de las horas extra..." className={inputCls} />
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Link href="/rrhh/horas-extra" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
            Cancelar
          </Link>
          <button type="submit" disabled={loading}
            className="rounded-lg bg-fuchsia-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-fuchsia-700 disabled:opacity-50 transition">
            {loading ? 'Registrando...' : 'Registrar HHEE'}
          </button>
        </div>
      </form>
    </div>
  )
}
