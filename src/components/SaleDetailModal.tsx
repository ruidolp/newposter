'use client'

import { useEffect, useState } from 'react'
import { X, Banknote, CreditCard, ArrowUpRight, AlertTriangle, Package, Printer } from 'lucide-react'
import { printTicket } from '@/lib/print-ticket'

interface OrderItem {
  id: string
  product_name: string | null
  sku: string | null
  quantity: number
  unit_price: number
  subtotal: number
}

interface OrderDetail {
  id: string
  order_number: string
  total: number
  subtotal: number
  payment_method: string | null
  payment_status: string | null
  status: string | null
  customer_name: string | null
  created_at: string | null
  items: OrderItem[]
}

interface Props {
  orderId: string
  canVoid: boolean
  printEnabled: boolean
  storeName?: string
  timezone?: string
  formatCurrency: (n: number) => string
  onClose: () => void
  onVoided: (orderId: string) => void
}

const METHOD_LABEL: Record<string, string> = {
  CASH: 'Efectivo', CARD: 'Tarjeta', TRANSFER: 'Transferencia',
}
const METHOD_ICON: Record<string, React.ElementType> = {
  CASH: Banknote, CARD: CreditCard, TRANSFER: ArrowUpRight,
}
const STATUS_STYLE: Record<string, string> = {
  COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CANCELLED: 'bg-rose-50 text-rose-700 border-rose-200',
}

export default function SaleDetailModal({ orderId, canVoid, printEnabled, storeName, timezone = 'America/Santiago', formatCurrency, onClose, onVoided }: Props) {
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [voiding, setVoiding] = useState(false)
  const [voidError, setVoidError] = useState('')

  useEffect(() => {
    fetch(`/api/sales/${orderId}`)
      .then((r) => r.json())
      .then((d) => { if (d.error) throw new Error(d.error); setOrder(d) })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [orderId])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (confirming) { setConfirming(false); return }
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, confirming])

  async function handleVoid() {
    setVoiding(true)
    setVoidError('')
    try {
      const res = await fetch(`/api/sales/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'void' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al anular')
      onVoided(orderId)
      onClose()
    } catch (e: unknown) {
      setVoidError((e as Error).message)
      setConfirming(false)
    } finally {
      setVoiding(false)
    }
  }

  const isVoided = order?.status === 'CANCELLED'

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-title"
      onClick={(e) => { if (e.target === e.currentTarget && !confirming) onClose() }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 id="detail-title" className="font-bold text-slate-900">{order?.order_number ?? '—'}</h2>
            {order?.created_at && (
              <p className="text-xs text-slate-400">
                {new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeStyle: 'short', timeZone: timezone }).format(new Date(order.created_at))}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar detalle"
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="flex h-40 items-center justify-center text-sm text-slate-400">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-fuchsia-500 mr-2" aria-hidden="true" />
              Cargando…
            </div>
          ) : error ? (
            <p role="alert" className="p-6 text-center text-sm text-rose-600">{error}</p>
          ) : order ? (
            <div className="p-5 space-y-4">
              {/* Status + payment */}
              <div className="flex flex-wrap gap-2">
                {order.status && (
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[order.status] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                    {order.status === 'COMPLETED' ? 'Completada' : order.status === 'CANCELLED' ? 'Anulada' : order.status}
                  </span>
                )}
                {order.payment_method && (() => {
                  const Icon = METHOD_ICON[order.payment_method] ?? CreditCard
                  return (
                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                      <Icon size={11} aria-hidden="true" />
                      {METHOD_LABEL[order.payment_method] ?? order.payment_method}
                    </span>
                  )
                })()}
                {order.customer_name && (
                  <span className="inline-flex items-center rounded-full border border-fuchsia-100 bg-fuchsia-50 px-2.5 py-0.5 text-xs font-semibold text-fuchsia-700">
                    {order.customer_name}
                  </span>
                )}
              </div>

              {/* Items */}
              <section aria-label="Productos de la venta">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Productos</p>
                {order.items.length === 0 ? (
                  <p className="text-sm text-slate-400">Sin ítems registrados</p>
                ) : (
                  <ul className="divide-y divide-slate-50 rounded-xl border border-slate-100" role="list">
                    {order.items.map((item) => (
                      <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100">
                          <Package size={14} className="text-slate-400" aria-hidden="true" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-800">{item.product_name ?? '—'}</p>
                          <p className="text-xs text-slate-400">{item.sku ?? ''} · {formatCurrency(item.unit_price)} c/u</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-xs font-bold tabular-nums text-slate-900">{formatCurrency(item.subtotal)}</p>
                          <p className="text-xs text-slate-400">×{item.quantity}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Total */}
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                <span className="text-sm font-semibold text-slate-600">Total</span>
                <span className="text-xl font-black tabular-nums text-slate-900">{formatCurrency(order.total)}</span>
              </div>

              {/* Reprint */}
              {printEnabled && !isVoided && order && (
                <button
                  type="button"
                  onClick={() => printTicket({
                    order_number: order.order_number,
                    store_name: storeName ?? 'Mi Tienda',
                    created_at: order.created_at,
                    payment_method: order.payment_method ?? 'CARD',
                    customer_name: order.customer_name,
                    items: order.items.map((i) => ({
                      name: i.product_name ?? '—',
                      sku: i.sku,
                      quantity: i.quantity,
                      unit_price: i.unit_price,
                    })),
                    total: order.total,
                  })}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500"
                >
                  <Printer size={15} aria-hidden="true" />
                  Reimprimir boleta
                </button>
              )}

              {/* Void error */}
              {voidError && (
                <p role="alert" aria-live="assertive" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  {voidError}
                </p>
              )}

              {/* Void section */}
              {!isVoided && (
                confirming ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 space-y-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle size={16} className="mt-0.5 shrink-0 text-rose-500" aria-hidden="true" />
                      <p className="text-sm text-rose-700 [text-wrap:balance]">
                        Esto anulará la venta y devolverá el stock de todos los productos. No se puede deshacer.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirming(false)}
                        disabled={voiding}
                        className="flex-1 rounded-lg border border-slate-200 bg-white py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500 disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleVoid}
                        disabled={voiding}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-rose-600 py-2 text-sm font-bold text-white transition hover:bg-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 disabled:opacity-60"
                      >
                        {voiding && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" />}
                        {voiding ? 'Anulando…' : 'Sí, anular venta'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirming(true)}
                    className="w-full rounded-xl border border-rose-200 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                  >
                    Anular venta
                  </button>
                )
              )}

              {isVoided && (
                <p className="rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-center text-sm text-slate-400">
                  Esta venta fue anulada
                </p>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
