'use client'

import { useEffect, useState } from 'react'
import { ChevronRight, FileText, RefreshCw } from 'lucide-react'

interface LogEntry {
  id: string
  action: string
  entity_type: string | null
  entity_id: string | null
  user_name: string | null
  detail: unknown
  ip_address: string | null
  created_at: string
}

const ACTION_LABELS: Record<string, string> = {
  CREATE_PURCHASE: 'Nueva compra',
  CREATE_SUPPLIER: 'Proveedor creado',
  UPDATE_SUPPLIER: 'Proveedor editado',
  DELETE_SUPPLIER: 'Proveedor eliminado',
  CREATE_PRODUCT_FROM_PURCHASE: 'Producto creado en compra',
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  useEffect(() => {
    fetchLogs()
  }, [page])

  async function fetchLogs() {
    setLoading(true)
    try {
      const res = await fetch(`/api/operation-logs?page=${page}&limit=50`)
      const data = await res.json()
      setLogs(data.logs ?? [])
    } catch {
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  function fmtDetail(detail: unknown): string {
    if (!detail || typeof detail !== 'object') return ''
    return Object.entries(detail as Record<string, unknown>)
      .filter(([, v]) => v !== null && v !== undefined)
      .map(([k, v]) => `${k}: ${String(v)}`)
      .join(' · ')
  }

  return (
    <section className="space-y-5">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 [text-wrap:balance]">
            Log de <span className="text-fuchsia-600">Operaciones</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">Registro completo de acciones del sistema</p>
        </div>

        <button
          type="button"
          onClick={fetchLogs}
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </header>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-800">Actividad Reciente</h2>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
            {logs.length} registros
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center px-4 py-12 text-sm text-slate-500">
            <RefreshCw size={16} className="mr-2 animate-spin" />
            Cargando registros…
          </div>
        ) : logs.length === 0 ? (
          <div className="px-4 py-12 text-center text-slate-500">
            <FileText size={34} className="mx-auto mb-2 text-slate-300" />
            <p className="text-sm">Sin registros de operaciones</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Fecha / Hora</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Acción</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Entidad</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Usuario</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="align-top hover:bg-slate-50/70">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs tabular-nums text-slate-600">
                      {new Date(log.created_at).toLocaleString('es-CL')}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-md border border-fuchsia-200 bg-fuchsia-50 px-2 py-0.5 text-xs font-medium text-fuchsia-700">
                        {ACTION_LABELS[log.action] ?? log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {log.entity_type ? (
                        <>
                          {log.entity_type}
                          {log.entity_id && (
                            <>
                              {' '}
                              <ChevronRight size={10} className="inline" /> {log.entity_id.slice(0, 8)}…
                            </>
                          )}
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{log.user_name ?? '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{fmtDetail(log.detail) || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && (
          <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-4 py-3">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Anterior
            </button>
            <span className="text-xs text-slate-500">Página {page}</span>
            <button
              type="button"
              disabled={logs.length < 50}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
