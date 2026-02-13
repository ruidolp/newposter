'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, FileText, ChevronRight } from 'lucide-react'

interface LogEntry {
  id: string; action: string; entity_type: string | null; entity_id: string | null
  user_name: string | null; detail: any; ip_address: string | null; created_at: string
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

  useEffect(() => { fetchLogs() }, [page])

  async function fetchLogs() {
    setLoading(true)
    try {
      const res = await fetch(`/api/operation-logs?page=${page}&limit=50`)
      const data = await res.json()
      setLogs(data.logs ?? [])
    } catch {} finally {
      setLoading(false)
    }
  }

  function fmtDetail(detail: any): string {
    if (!detail || typeof detail !== 'object') return ''
    return Object.entries(detail)
      .filter(([, v]) => v !== null && v !== undefined)
      .map(([k, v]) => `${k}: ${v}`)
      .join(' · ')
  }

  return (
    <>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Log de <span>Operaciones</span></h1>
          <p className="admin-page-subtitle">Registro completo de acciones del sistema</p>
        </div>
        <button className="admin-btn admin-btn-secondary" onClick={fetchLogs}>
          <RefreshCw size={14} /> Actualizar
        </button>
      </div>

      <div className="admin-panel">
        <div className="admin-panel-header">
          <span className="admin-panel-title">Actividad reciente</span>
          <span style={{ fontSize: 11, fontFamily: 'var(--a-font-mono)', color: 'var(--a-text-3)' }}>{logs.length} registros</span>
        </div>

        {loading ? (
          <div style={{ padding: 48, display: 'flex', justifyContent: 'center' }}>
            <span className="admin-spinner" />
          </div>
        ) : logs.length === 0 ? (
          <div className="admin-empty">
            <FileText size={36} className="admin-empty-icon" />
            <p className="admin-empty-text">Sin registros de operaciones</p>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Fecha / Hora</th>
                  <th>Acción</th>
                  <th>Entidad</th>
                  <th>Usuario</th>
                  <th>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id}>
                    <td>
                      <span className="admin-mono" style={{ fontSize: 11 }}>
                        {new Date(log.created_at).toLocaleString('es-CL')}
                      </span>
                    </td>
                    <td>
                      <span className="log-action-badge">
                        {ACTION_LABELS[log.action] ?? log.action}
                      </span>
                    </td>
                    <td>
                      {log.entity_type && (
                        <span style={{ color: 'var(--a-text-3)', fontSize: 11, fontFamily: 'var(--a-font-mono)' }}>
                          {log.entity_type}
                          {log.entity_id && (
                            <> <ChevronRight size={10} style={{ display: 'inline' }} /> {log.entity_id.slice(0, 8)}…</>
                          )}
                        </span>
                      )}
                    </td>
                    <td style={{ color: 'var(--a-text-2)', fontSize: 12 }}>
                      {log.user_name ?? '—'}
                    </td>
                    <td>
                      <span style={{ color: 'var(--a-text-3)', fontSize: 11, fontFamily: 'var(--a-font-mono)' }}>
                        {fmtDetail(log.detail)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && (
          <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid var(--a-border)' }}>
            <button className="admin-btn admin-btn-secondary admin-btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              Anterior
            </button>
            <span style={{ lineHeight: '30px', fontSize: 11, fontFamily: 'var(--a-font-mono)', color: 'var(--a-text-3)' }}>
              Página {page}
            </span>
            <button className="admin-btn admin-btn-secondary admin-btn-sm" disabled={logs.length < 50} onClick={() => setPage(p => p + 1)}>
              Siguiente
            </button>
          </div>
        )}
      </div>
    </>
  )
}
