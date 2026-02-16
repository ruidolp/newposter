'use client'

import { useEffect, useState } from 'react'
import { Plus, Clock, CheckCircle2, XCircle } from 'lucide-react'
import Link from 'next/link'

interface OvertimeRecord {
  id: string
  employee_id: string
  employee_name: string
  overtime_date: string
  hours: number
  overtime_type: string
  multiplier: number
  hourly_rate: number
  amount: number
  status: string
  description: string | null
  approved_at: string | null
}

const TYPE_LABEL: Record<string, string> = {
  regular: 'Regular (x1.5)',
  domingo: 'Domingo (x2)',
  festivo: 'Festivo (x2)',
}
const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  paid: 'bg-blue-100 text-blue-700',
}
const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  paid: 'Pagada',
}

export default function HorasExtraClient() {
  const [records, setRecords] = useState<OvertimeRecord[]>([])
  const [statusFilter, setStatusFilter] = useState('pending')
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`/api/rrhh/overtime?status=${statusFilter}`)
      const data = await res.json()
      setRecords(data.overtime ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [statusFilter])

  async function handleAction(id: string, action: 'approved' | 'rejected') {
    setProcessing(id)
    try {
      const res = await fetch(`/api/rrhh/overtime/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (res.ok) load()
    } finally {
      setProcessing(null)
    }
  }

  const totalAmount = records.reduce((s, r) => s + Number(r.amount), 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Horas Extra</h1>
          <p className="mt-0.5 text-sm text-slate-500">Registro y aprobación de HHEE</p>
        </div>
        <Link
          href="/rrhh/horas-extra/nueva"
          className="flex items-center gap-2 rounded-lg bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-fuchsia-700"
        >
          <Plus size={16} />
          Registrar HHEE
        </Link>
      </div>

      {/* Filtro estado */}
      <div className="flex gap-2 flex-wrap">
        {Object.entries(STATUS_LABEL).map(([val, lbl]) => (
          <button
            key={val}
            onClick={() => setStatusFilter(val)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              statusFilter === val ? 'bg-fuchsia-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {lbl}
          </button>
        ))}
        <button
          onClick={() => setStatusFilter('all')}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
            statusFilter === 'all' ? 'bg-fuchsia-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Todas
        </button>
      </div>

      {records.length > 0 && (
        <div className="rounded-lg border border-fuchsia-100 bg-fuchsia-50 px-4 py-3 text-sm">
          <span className="text-slate-600">Total monto en vista: </span>
          <span className="font-bold text-fuchsia-700">${totalAmount.toLocaleString('es-CL')}</span>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-400">Cargando...</div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center">
            <Clock size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-sm text-slate-500">No hay registros de HHEE</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Empleado</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Fecha</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Horas</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Tipo</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Monto</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Estado</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-medium text-slate-800">{r.employee_name}</td>
                    <td className="px-4 py-3 text-slate-600">{new Date(r.overtime_date).toLocaleDateString('es-CL')}</td>
                    <td className="px-4 py-3 text-slate-700">{r.hours}h</td>
                    <td className="px-4 py-3 text-slate-600">{TYPE_LABEL[r.overtime_type] ?? r.overtime_type}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">
                      ${Number(r.amount).toLocaleString('es-CL')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[r.status]}`}>
                        {STATUS_LABEL[r.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {r.status === 'pending' && (
                        <div className="flex gap-1.5">
                          <button
                            disabled={processing === r.id}
                            onClick={() => handleAction(r.id, 'approved')}
                            title="Aprobar"
                            className="rounded p-1 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50 transition"
                          >
                            <CheckCircle2 size={16} />
                          </button>
                          <button
                            disabled={processing === r.id}
                            onClick={() => handleAction(r.id, 'rejected')}
                            title="Rechazar"
                            className="rounded p-1 text-red-500 hover:bg-red-50 disabled:opacity-50 transition"
                          >
                            <XCircle size={16} />
                          </button>
                        </div>
                      )}
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
