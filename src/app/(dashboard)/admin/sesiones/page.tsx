'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Clock, MapPin, User, X } from 'lucide-react'

interface Session {
  id: string
  status: string
  opening_amount: string
  closing_amount: string | null
  total_sales: string | null
  total_cash: string | null
  total_card: string | null
  total_transfer: string | null
  total_cancelled: string | null
  opened_at: string
  closed_at: string | null
  location_name: string | null
  user_name: string | null
  force_closed_note: string | null
}

const fmt = (n: number) =>
  n.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 })

function duration(openedAt: string, closedAt: string | null) {
  const end = closedAt ? new Date(closedAt) : new Date()
  const ms = end.getTime() - new Date(openedAt).getTime()
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function ForceCloseModal({
  session,
  onClose,
  onClosed,
}: {
  session: Session
  onClose: () => void
  onClosed: () => void
}) {
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleForce() {
    if (!note.trim()) { setError('La nota es obligatoria'); return }
    setSaving(true); setError('')
    try {
      const res = await fetch(`/api/pos/sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true, force_closed_note: note.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al forzar cierre')
      onClosed()
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-500" />
            Forzar cierre de caja
          </h2>
          <button type="button" onClick={onClose} aria-label="Cancelar"
            className="rounded p-1 text-slate-400 transition hover:bg-slate-100">
            <X size={15} />
          </button>
        </div>
        <div className="space-y-4 px-5 py-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            Estás cerrando la caja de <strong>{session.user_name ?? 'un usuario'}</strong> en{' '}
            <strong>{session.location_name ?? 'ubicación desconocida'}</strong>. Esta acción quedará registrada.
          </div>
          {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
          <div className="space-y-1.5">
            <label htmlFor="force-note" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Motivo del cierre forzado *
            </label>
            <textarea
              id="force-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Ej: Cajero se retiró sin cerrar, falla técnica…"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 resize-none"
            />
          </div>
        </div>
        <div className="flex gap-2 border-t border-slate-200 px-5 py-4">
          <button type="button" onClick={onClose}
            className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
            Cancelar
          </button>
          <button type="button" onClick={handleForce} disabled={saving}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-500 py-2 text-sm font-bold text-white transition hover:bg-amber-600 disabled:opacity-60">
            {saving ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <CheckCircle2 size={14} />}
            {saving ? 'Cerrando…' : 'Forzar cierre'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SesionesPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [forceTarget, setForceTarget] = useState<Session | null>(null)

  function load() {
    setLoading(true)
    fetch('/api/pos/sessions?all=true')
      .then((r) => r.json())
      .then((d) => setSessions(d.sessions ?? []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const open = sessions.filter((s) => s.status === 'OPEN')
  const closed = sessions.filter((s) => s.status !== 'OPEN')

  return (
    <section className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          <span className="text-fuchsia-600">Sesiones</span> de Caja
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Monitorea cajas abiertas y revisa el historial de turnos
        </p>
      </header>

      {/* Active sessions */}
      <div className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          Cajas abiertas ahora ({open.length})
        </h2>
        {loading ? (
          <p className="text-sm text-slate-400">Cargando…</p>
        ) : open.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">
            No hay cajas abiertas en este momento
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {open.map((s) => (
              <div key={s.id} className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <User size={13} className="text-emerald-600" />
                      <span className="text-sm font-bold text-slate-900">{s.user_name ?? '—'}</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <MapPin size={12} className="text-slate-400" />
                      <span className="text-xs text-slate-500">{s.location_name ?? '—'}</span>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-700">Abierta</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Clock size={12} />
                  {duration(s.opened_at, null)} · desde {new Date(s.opened_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Apertura</span>
                  <span className="font-semibold tabular-nums">{fmt(Number(s.opening_amount))}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setForceTarget(s)}
                  className="w-full rounded-lg border border-amber-300 bg-white py-1.5 text-xs font-semibold text-amber-600 transition hover:bg-amber-50"
                >
                  Forzar cierre
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Session history */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-800">Historial de turnos</h2>
        </div>
        {loading ? (
          <div className="py-10 text-center text-sm text-slate-400">Cargando…</div>
        ) : closed.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-400">Sin turnos cerrados aún</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Cajero</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Ubicación</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Apertura</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Cierre</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Ventas</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Efectivo</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Tarjeta</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {closed.map((s) => {
                  const expectedCash = Number(s.opening_amount) + Number(s.total_cash ?? 0)
                  const diff = s.closing_amount ? Number(s.closing_amount) - expectedCash : null
                  return (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{s.user_name ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{s.location_name ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {new Date(s.opened_at).toLocaleDateString('es-CL')}{' '}
                        {new Date(s.opened_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {s.closed_at
                          ? `${duration(s.opened_at, s.closed_at)} · ${new Date(s.closed_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-900">
                        {fmt(Number(s.total_sales ?? 0))}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                        <div>{fmt(Number(s.total_cash ?? 0))}</div>
                        {diff !== null && (
                          <div className={`text-[11px] font-semibold ${diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                            {diff > 0 ? `+${fmt(diff)}` : diff < 0 ? fmt(diff) : 'Cuadre ✓'}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                        {fmt(Number(s.total_card ?? 0))}
                      </td>
                      <td className="px-4 py-3">
                        {s.status === 'FORCE_CLOSED' ? (
                          <span title={s.force_closed_note ?? ''} className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700 cursor-help">
                            Forzado
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500">
                            Cerrado
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {forceTarget && (
        <ForceCloseModal
          session={forceTarget}
          onClose={() => setForceTarget(null)}
          onClosed={() => { setForceTarget(null); load() }}
        />
      )}
    </section>
  )
}
