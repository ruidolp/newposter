'use client'

import { CheckCircle2, Printer, RotateCcw } from 'lucide-react'
import type { PaymentMethod } from './CheckoutModal'
import { printTicket } from '@/lib/print-ticket'

interface SaleResult {
  order_number: string
  total: number
  payment_method: PaymentMethod
  amount_paid: number
  change: number
  items_count: number
  created_at?: string
  items?: { name: string; quantity: number; unit_price: number }[]
  customer_name?: string | null
}

const METHOD_LABELS: Record<string, string> = {
  CASH:     'Efectivo',
  CARD:     'Tarjeta',
  TRANSFER: 'Transferencia',
}

interface Props {
  result: SaleResult
  storeName: string
  printEnabled: boolean
  formatCurrency: (n: number) => string
  onNewSale: () => void
}

export default function SuccessScreen({ result, storeName, printEnabled, formatCurrency, onNewSale }: Props) {
  function handlePrint() {
    printTicket({
      order_number: result.order_number,
      store_name: storeName,
      created_at: result.created_at ?? new Date().toISOString(),
      payment_method: result.payment_method,
      customer_name: result.customer_name,
      items: result.items ?? [],
      total: result.total,
    })
  }
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm space-y-5">
        {/* Icon + title */}
        <div className="text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-fuchsia-500 to-rose-500 shadow-lg shadow-fuchsia-200">
            <CheckCircle2 size={32} className="text-white" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 [text-wrap:balance]">¡Venta registrada!</h1>
          <p className="mt-1 text-sm text-slate-500">Orden <span className="font-semibold text-slate-700">{result.order_number}</span></p>
        </div>

        {/* Summary card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <dl className="space-y-3">
            <Row label="Total cobrado" value={formatCurrency(result.total)} bold />
            <Row label="Método de pago" value={METHOD_LABELS[result.payment_method] ?? result.payment_method} />
            {result.payment_method === 'CASH' && result.change > 0 && (
              <Row label="Vuelto entregado" value={formatCurrency(result.change)} highlight />
            )}
            <Row label="Productos" value={`${result.items_count} ítem${result.items_count !== 1 ? 's' : ''}`} />
          </dl>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          {printEnabled && (
            <button
              type="button"
              onClick={handlePrint}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500"
            >
              <Printer size={16} aria-hidden="true" />
              Imprimir ticket
            </button>
          )}
          <button
            type="button"
            onClick={onNewSale}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-rose-500 py-3.5 text-sm font-bold text-white shadow-md shadow-fuchsia-200 transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500 focus-visible:ring-offset-2"
          >
            <RotateCcw size={16} aria-hidden="true" />
            Nueva venta
          </button>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, bold, highlight }: { label: string; value: string; bold?: boolean; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className={`text-sm tabular-nums ${bold ? 'text-lg font-black text-slate-900' : highlight ? 'font-bold text-fuchsia-600' : 'font-medium text-slate-800'}`}>
        {value}
      </dd>
    </div>
  )
}
