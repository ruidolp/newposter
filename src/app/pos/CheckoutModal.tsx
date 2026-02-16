'use client'

import { useEffect, useRef, useState } from 'react'
import { Banknote, CreditCard, ArrowUpRight, X, UserCircle2 } from 'lucide-react'
import CustomerSelector, { type CustomerSnap } from './CustomerSelector'

export type PaymentMethod = 'CASH' | 'CARD' | 'TRANSFER'

interface Props {
  total: number
  customer: CustomerSnap | null
  onCustomerChange: (c: CustomerSnap | null) => void
  onConfirm: (method: PaymentMethod, amountPaid: number) => void
  onClose: () => void
  loading: boolean
  formatCurrency: (n: number) => string
}

const METHODS: { id: PaymentMethod; label: string; icon: React.ElementType }[] = [
  { id: 'CARD',     label: 'Tarjeta',        icon: CreditCard },
  { id: 'CASH',     label: 'Efectivo',       icon: Banknote },
  { id: 'TRANSFER', label: 'Transferencia',  icon: ArrowUpRight },
]

export default function CheckoutModal({ total, customer, onCustomerChange, onConfirm, onClose, loading, formatCurrency }: Props) {
  const [method, setMethod] = useState<PaymentMethod>('CARD')
  const [received, setReceived] = useState('')
  const receivedRef = useRef<HTMLInputElement>(null)

  const receivedNum = parseFloat(received.replace(/[^0-9.]/g, '')) || 0
  const change = method === 'CASH' ? Math.max(0, receivedNum - total) : 0
  const canConfirm = method !== 'CASH' || receivedNum >= total

  useEffect(() => {
    if (method === 'CASH') {
      setReceived(String(total))
      setTimeout(() => receivedRef.current?.select(), 50)
    }
  }, [method, total])

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function handleConfirm() {
    if (!canConfirm || loading) return
    onConfirm(method, method === 'CASH' ? receivedNum : total)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-sm overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 id="checkout-title" className="text-base font-bold text-slate-900">Cobrar</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Total */}
          <div className="rounded-xl bg-slate-50 px-4 py-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total a cobrar</p>
            <p className="mt-1 text-4xl font-black tabular-nums text-slate-900">{formatCurrency(total)}</p>
          </div>

          {/* Customer */}
          <div className="space-y-1.5">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <UserCircle2 size={12} aria-hidden="true" />
              Cliente
            </p>
            <CustomerSelector selected={customer} onSelect={onCustomerChange} />
          </div>

          {/* Payment method */}
          <fieldset>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Método de pago
            </legend>
            <div className="grid grid-cols-3 gap-2">
              {METHODS.map(({ id, label, icon: Icon }) => (
                <label
                  key={id}
                  className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border-2 px-2 py-3 text-center transition-colors ${
                    method === id
                      ? 'border-fuchsia-500 bg-fuchsia-50 text-fuchsia-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment_method"
                    value={id}
                    checked={method === id}
                    onChange={() => setMethod(id)}
                    className="sr-only"
                  />
                  <Icon size={18} aria-hidden="true" />
                  <span className="text-xs font-semibold">{label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Cash: received + change */}
          {method === 'CASH' && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label htmlFor="amount-received" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Monto recibido
                </label>
                <input
                  id="amount-received"
                  ref={receivedRef}
                  name="amount-received"
                  type="number"
                  inputMode="numeric"
                  autoComplete="off"
                  min={0}
                  value={received}
                  onChange={(e) => setReceived(e.target.value)}
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-lg font-bold tabular-nums text-slate-900 outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200"
                />
              </div>
              <div className={`flex items-center justify-between rounded-xl px-4 py-3 ${change > 0 ? 'bg-fuchsia-50' : 'bg-slate-50'}`}>
                <span className="text-sm font-semibold text-slate-600">Vuelto</span>
                <span className={`text-xl font-black tabular-nums ${change > 0 ? 'text-fuchsia-600' : 'text-slate-400'}`}>
                  {formatCurrency(change)}
                </span>
              </div>
            </div>
          )}

          {/* Confirm */}
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm || loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-rose-500 py-3.5 text-sm font-bold text-white shadow-md shadow-fuchsia-200 transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500 focus-visible:ring-offset-2 disabled:translate-y-0 disabled:opacity-60 disabled:shadow-none"
          >
            {loading
              ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" />
              : null}
            {loading ? 'Procesando…' : 'Confirmar venta'}
          </button>
        </div>
      </div>
    </div>
  )
}
