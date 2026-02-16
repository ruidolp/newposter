'use client'

import { useEffect, useState } from 'react'
import { Plus, CalendarClock, CheckCircle2, XCircle } from 'lucide-react'
import Link from 'next/link'

interface Solicitud {
  id: string
  employee_id: string
  employee_name: string
  employee_rut: string
  request_type: string
  start_date: string
  end_date: string
  working_days: number
  reason: string | null
  status: string
  reviewer_name: string | null
  reviewed_at: string | null
  review_notes: string | null
  created_at: string
}

const TYPE_LABEL: Record<string, string> = {
  vacaciones: 'Vacaciones',
  permiso_con_goce: 'Permiso con goce',
  permiso_sin_goce: 'Permiso sin goce',
  otro: 'Otro',
}

const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  cancelled: 'bg-slate-100 text-slate-500',
}
const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  cancelled: 'Cancelada',
}

export default function SolicitudesClient() {
  const [requests, setRequests] = useState<Solicitud[]>([])
  const [statusFilter, setStatusFilter] = useState('pending')
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`/api/rrhh/requests?status=${statusFilter}`)
      const data = await res.json()
      setRequests(data.requests ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [statusFilter])

  async function handleAction(id: string, action: 'approved' | 'rejected') {
    setProcessing(id)
    try {
      const res = await fetch(`/api/rrhh/requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (res.ok) load()
    } finally {
      setProcessing(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Solicitudes</h1>
          <p className="mt-0.5 text-sm text-slate-500">Vacaciones y permisos</p>
        </div>
        <Link
          href="/rrhh/solicitudes/nueva"
          className="flex items-center gap-2 rounded-lg bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-fuchsia-700"
        >
          <Plus size={16} />
          Nueva solicitud
        </Link>
      </div>

      <div className="flex gap-2">
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

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-400">Cargando...</div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center">
            <CalendarClock size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-sm text-slate-500">No hay solicitudes en este estado</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {requests.map((req) => (
              <div key={req.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-slate-800">{req.employee_name}</p>
                    <span className="text-xs text-slate-400">{req.employee_rut}</span>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[req.status]}`}>
                      {STATUS_LABEL[req.status]}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-slate-500">
                    <span>{TYPE_LABEL[req.request_type] ?? req.request_type}</span>
                    <span>
                      {new Date(req.start_date).toLocaleDateString('es-CL')} —{' '}
                      {new Date(req.end_date).toLocaleDateString('es-CL')}
                    </span>
                    <span className="font-medium text-slate-700">{req.working_days} día(s) hábil(es)</span>
                  </div>
                  {req.reason && <p className="mt-1 text-xs text-slate-400 italic">"{req.reason}"</p>}
                  {req.reviewer_name && (
                    <p className="mt-1 text-xs text-slate-400">
                      {STATUS_LABEL[req.status]} por {req.reviewer_name}
                      {req.review_notes && ` — "${req.review_notes}"`}
                    </p>
                  )}
                </div>

                {req.status === 'pending' && (
                  <div className="flex gap-2 sm:ml-4">
                    <button
                      disabled={processing === req.id}
                      onClick={() => handleAction(req.id, 'approved')}
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 transition"
                    >
                      <CheckCircle2 size={14} />
                      Aprobar
                    </button>
                    <button
                      disabled={processing === req.id}
                      onClick={() => handleAction(req.id, 'rejected')}
                      className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50 transition"
                    >
                      <XCircle size={14} />
                      Rechazar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
