'use client'

import { useEffect, useRef, useState } from 'react'
import { X, CreditCard, Banknote, ArrowRightLeft, AlertTriangle, CheckCircle2, TrendingUp } from 'lucide-react'

export interface SessionInfo {
  id: string
  location_name: string
  opening_amount: number
  opened_at: string
}

interface SessionOrder {
  id: string
  order_number: string
  total: string
  payment_method: string | null
  status: string | null
  created_at: string
}

interface Props {
  session: SessionInfo
  onClose: () => void
  onClosed: () => void
}

const METHOD_LABEL: Record<string, string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
}

const fmt = (n: number) =>
  n.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 })

export default function SessionCloseModal({ session, onClose, onClosed }: Props) {
  const [orders, setOrders] = useState<SessionOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [closingAmount, setClosingAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState<'review' | 'confirm'>('review')
  const initialRef = useRef(JSON.stringify({ closingAmount: '', notes: '', step: 'review' as 'review' | 'confirm' }))

  useEffect(() => {
    fetch(`/api/pos/sessions/${session.id}`)
      .then((r) => r.json())
      .then((d) => setOrders(d.orders ?? []))
      .finally(() => setLoading(false))
  }, [session.id])

  const activeOrders = orders.filter((o) => o.status !== 'CANCELLED')
  const cancelledOrders = orders.filter((o) => o.status === 'CANCELLED')

  const totalSales = activeOrders.reduce((s, o) => s + Number(o.total), 0)
  const totalCash = activeOrders.filter((o) => o.payment_method === 'CASH').reduce((s, o) => s + Number(o.total), 0)
  const totalCard = activeOrders.filter((o) => o.payment_method === 'CARD').reduce((s, o) => s + Number(o.total), 0)
  const totalTransfer = activeOrders.filter((o) => o.payment_method === 'TRANSFER').reduce((s, o) => s + Number(o.total), 0)
  const totalCancelled = cancelledOrders.reduce((s, o) => s + Number(o.total), 0)

  const expectedCash = session.opening_amount + totalCash
  const enteredAmount = parseFloat(closingAmount) || 0
  const diff = enteredAmount - expectedCash
  const hasDiff = closingAmount !== '' && Math.abs(diff) > 0

  const duration = (() => {
    const ms = Date.now() - new Date(session.opened_at).getTime()
    const h = Math.floor(ms / 3600000)
    const m = Math.floor((ms % 3600000) / 60000)
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  })()

  function hasUnsavedChanges() {
    return JSON.stringify({
      closingAmount: closingAmount.trim(),
      notes: notes.trim(),
      step,
    }) !== initialRef.current
  }

  function requestClose() {
    if (saving) return
    if (hasUnsavedChanges()) {
      const ok = window.confirm('Tienes cambios sin guardar. ¿Salir y descartarlos?')
      if (!ok) return
    }
    onClose()
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        requestClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [requestClose])

  async function handleClose() {
    setSaving(true); setError('')
    try {
      const res = await fetch(`/api/pos/sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          closing_amount: closingAmount !== '' ? parseFloat(closingAmount) : null,
          closing_notes: notes.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al cerrar caja')
      onClosed()
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl border border-slate-200 bg-white shadow-2xl flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900">Cierre de Caja</h2>
            <p className="text-xs text-slate-500">{session.location_name} · {duration} de turno</p>
          </div>
          <button type="button" onClick={requestClose} aria-label="Cancelar"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500">
            <X size={16} />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center py-16 text-sm text-slate-500">Cargando ventas…</div>
        ) : step === 'review' ? (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Total ventas</p>
                  <p className="mt-1 text-xl font-black text-slate-900 tabular-nums">{fmt(totalSales)}</p>
                  <p className="text-[11px] text-slate-400">{activeOrders.length} orden{activeOrders.length !== 1 ? 'es' : ''}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Anuladas</p>
                  <p className="mt-1 text-xl font-black text-rose-500 tabular-nums">{fmt(totalCancelled)}</p>
                  <p className="text-[11px] text-slate-400">{cancelledOrders.length} orden{cancelledOrders.length !== 1 ? 'es' : ''}</p>
                </div>
              </div>

              {/* Payment breakdown */}
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200">
                  <p className="text-xs font-semibold text-slate-700">Desglose por método de pago</p>
                </div>
                <div className="divide-y divide-slate-100">
                  {[
                    { label: 'Tarjeta', icon: CreditCard, amount: totalCard, color: 'text-sky-600' },
                    { label: 'Efectivo', icon: Banknote, amount: totalCash, color: 'text-emerald-600' },
                    { label: 'Transferencia', icon: ArrowRightLeft, amount: totalTransfer, color: 'text-violet-600' },
                  ].map(({ label, icon: Icon, amount, color }) => (
                    <div key={label} className="flex items-center justify-between px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <Icon size={14} className={color} />
                        <span className="text-sm text-slate-700">{label}</span>
                      </div>
                      <span className={`text-sm font-semibold tabular-nums ${amount === 0 ? 'text-slate-300' : 'text-slate-900'}`}>
                        {fmt(amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cash reconciliation */}
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200">
                  <p className="text-xs font-semibold text-slate-700">Cuadre de efectivo</p>
                </div>
                <div className="space-y-3 px-4 py-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Monto apertura</span>
                    <span className="font-medium tabular-nums">{fmt(session.opening_amount)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Ventas en efectivo</span>
                    <span className="font-medium tabular-nums">+ {fmt(totalCash)}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-sm font-bold">
                    <span className="text-slate-700">Efectivo esperado</span>
                    <span className="tabular-nums text-slate-900">{fmt(expectedCash)}</span>
                  </div>

                  {/* Closing amount input */}
                  <div className="space-y-1.5 pt-1">
                    <label htmlFor="closing-amount" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Efectivo contado en caja
                    </label>
                    <input
                      id="closing-amount"
                      type="number"
                      min={0}
                      step={1}
                      inputMode="numeric"
                      value={closingAmount}
                      onChange={(e) => setClosingAmount(e.target.value)}
                      placeholder="Ingresa el monto…"
                      className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm tabular-nums outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200"
                    />
                  </div>

                  {/* Difference */}
                  {hasDiff && (
                    <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${
                      diff > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                    }`}>
                      {diff > 0
                        ? <TrendingUp size={14} />
                        : <AlertTriangle size={14} />}
                      {diff > 0
                        ? `Sobrante: ${fmt(diff)}`
                        : `Faltante: ${fmt(Math.abs(diff))}`}
                    </div>
                  )}
                </div>
              </div>

              {/* Orders list */}
              {orders.length > 0 && (
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200">
                    <p className="text-xs font-semibold text-slate-700">Ventas del turno ({orders.length})</p>
                  </div>
                  <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
                    {orders.map((o) => (
                      <div key={o.id} className="flex items-center justify-between px-4 py-2">
                        <div>
                          <span className="text-xs font-mono font-medium text-slate-700">{o.order_number}</span>
                          {o.status === 'CANCELLED' && (
                            <span className="ml-2 rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600">ANULADA</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-400">{o.payment_method ? METHOD_LABEL[o.payment_method] ?? o.payment_method : '—'}</span>
                          <span className={`text-xs font-semibold tabular-nums ${o.status === 'CANCELLED' ? 'text-slate-300 line-through' : 'text-slate-900'}`}>
                            {fmt(Number(o.total))}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="space-y-1.5">
                <label htmlFor="closing-notes" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Notas del turno (opcional)
                </label>
                <textarea
                  id="closing-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Observaciones, incidencias…"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 resize-none"
                />
              </div>
            </div>

            <div className="shrink-0 border-t border-slate-100 px-5 py-4 space-y-2">
              {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}
              <button type="button" onClick={() => setStep('confirm')}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-fuchsia-600 py-3 text-sm font-bold text-white transition hover:bg-fuchsia-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500">
                <CheckCircle2 size={16} />
                Continuar con cierre
              </button>
              <button type="button" onClick={requestClose}
                className="w-full rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
                Cancelar
              </button>
            </div>
          </>
        ) : (
          /* Confirm step */
          <>
            <div className="flex-1 px-5 py-6 space-y-4">
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="grid h-14 w-14 place-items-center rounded-full bg-fuchsia-100">
                  <CheckCircle2 size={28} className="text-fuchsia-600" />
                </div>
                <h3 className="text-base font-bold text-slate-900">¿Confirmar cierre de caja?</h3>
                <p className="text-sm text-slate-500">Esta acción cerrará tu turno. Podrás ver el historial en el panel de administración.</p>
              </div>

              <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 text-sm">
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-slate-500">Total ventas</span>
                  <span className="font-bold text-slate-900 tabular-nums">{fmt(totalSales)}</span>
                </div>
                {closingAmount !== '' && (
                  <>
                    <div className="flex justify-between px-4 py-2.5">
                      <span className="text-slate-500">Efectivo esperado</span>
                      <span className="font-medium tabular-nums">{fmt(expectedCash)}</span>
                    </div>
                    <div className="flex justify-between px-4 py-2.5">
                      <span className="text-slate-500">Efectivo contado</span>
                      <span className="font-medium tabular-nums">{fmt(enteredAmount)}</span>
                    </div>
                    {hasDiff && (
                      <div className={`flex justify-between px-4 py-2.5 font-semibold ${diff > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        <span>{diff > 0 ? 'Sobrante' : 'Faltante'}</span>
                        <span className="tabular-nums">{fmt(Math.abs(diff))}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="shrink-0 border-t border-slate-100 px-5 py-4 space-y-2">
              {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}
              <button type="button" onClick={handleClose} disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-fuchsia-600 py-3 text-sm font-bold text-white transition hover:bg-fuchsia-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500 disabled:opacity-60">
                {saving
                  ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  : <CheckCircle2 size={16} />}
                {saving ? 'Cerrando caja…' : 'Confirmar cierre'}
              </button>
              <button type="button" onClick={() => setStep('review')}
                className="w-full rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
                Volver a revisar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
