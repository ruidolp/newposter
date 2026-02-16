'use client'

import { useEffect, useState } from 'react'
import { Plus, FileText, ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface Payroll {
  id: string
  employee_id: string
  employee_name: string
  employee_rut: string
  period_year: number
  period_month: number
  gross_salary: number
  total_deductions: number
  net_salary: number
  status: string
  issued_at: string | null
  paid_at: string | null
  created_at: string
}

const MONTHS = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const STATUS_COLOR: Record<string, string> = {
  draft: 'bg-amber-100 text-amber-700',
  issued: 'bg-blue-100 text-blue-700',
  paid: 'bg-emerald-100 text-emerald-700',
}
const STATUS_LABEL: Record<string, string> = {
  draft: 'Borrador',
  issued: 'Emitida',
  paid: 'Pagada',
}

export default function LiquidacionesClient() {
  const [payrolls, setPayrolls] = useState<Payroll[]>([])
  const [loading, setLoading] = useState(true)
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear())

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`/api/rrhh/payrolls?year=${yearFilter}`)
      const data = await res.json()
      setPayrolls(data.payrolls ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [yearFilter])

  async function handleStatusChange(id: string, action: 'issue' | 'pay') {
    const res = await fetch(`/api/rrhh/payrolls/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    if (res.ok) load()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Liquidaciones</h1>
          <p className="mt-0.5 text-sm text-slate-500">Historial de remuneraciones</p>
        </div>
        <Link
          href="/rrhh/liquidaciones/nueva"
          className="flex items-center gap-2 rounded-lg bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-fuchsia-700"
        >
          <Plus size={16} />
          Generar liquidación
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <label className="text-sm text-slate-600 font-medium">Año:</label>
        <select
          value={yearFilter}
          onChange={(e) => setYearFilter(Number(e.target.value))}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-fuchsia-400 focus:outline-none"
        >
          {[2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-400">Cargando...</div>
        ) : payrolls.length === 0 ? (
          <div className="p-12 text-center">
            <FileText size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-sm text-slate-500">No hay liquidaciones para {yearFilter}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Empleado</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Período</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Sueldo bruto</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Descuentos</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Sueldo neto</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Estado</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payrolls.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{p.employee_name}</p>
                      <p className="text-xs text-slate-400">{p.employee_rut}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {MONTHS[p.period_month]} {p.period_year}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      ${Number(p.gross_salary).toLocaleString('es-CL')}
                    </td>
                    <td className="px-4 py-3 text-right text-red-600">
                      -${Number(p.total_deductions).toLocaleString('es-CL')}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">
                      ${Number(p.net_salary).toLocaleString('es-CL')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[p.status]}`}>
                          {STATUS_LABEL[p.status]}
                        </span>
                        {p.status === 'draft' && (
                          <button
                            onClick={() => handleStatusChange(p.id, 'issue')}
                            className="text-xs text-blue-600 hover:underline text-left"
                          >
                            Marcar emitida
                          </button>
                        )}
                        {p.status === 'issued' && (
                          <button
                            onClick={() => handleStatusChange(p.id, 'pay')}
                            className="text-xs text-emerald-600 hover:underline text-left"
                          >
                            Marcar pagada
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/rrhh/liquidaciones/${p.id}`}
                        className="flex items-center gap-1 text-xs font-medium text-fuchsia-600 hover:underline"
                      >
                        Ver <ChevronRight size={13} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
