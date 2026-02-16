'use client'

import { useCallback, useEffect, useState } from 'react'
import { X, Banknote, CreditCard, ArrowUpRight, RefreshCw, TrendingUp } from 'lucide-react'
import SaleDetailModal from './SaleDetailModal'

interface Sale {
  id: string
  order_number: string
  total: number
  payment_method: string | null
  customer_name: string | null
  items_count: number
  created_at: string | null
}

interface Props {
  mine: boolean
  canVoid: boolean
  printEnabled?: boolean
  storeName?: string
  formatCurrency: (n: number) => string
  onClose: () => void
  title?: string
}

const METHOD_ICON: Record<string, React.ElementType> = {
  CASH: Banknote, CARD: CreditCard, TRANSFER: ArrowUpRight,
}
const METHOD_LABEL: Record<string, string> = {
  CASH: 'Efectivo', CARD: 'Tarjeta', TRANSFER: 'Transferencia',
}

function timeHM(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Intl.DateTimeFormat('es-CL', { hour: '2-digit', minute: '2-digit' }).format(new Date(dateStr))
}

export default function SalesSheet({ mine, canVoid, printEnabled = false, storeName, formatCurrency, onClose, title }: Props) {
  const [sales, setSales] = useState<Sale[]>([])
  const [revenue, setRevenue] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const url = `/api/sales?mine=${mine}`
      const res = await fetch(url)
      const data = await res.json()
      if (res.ok) {
        setSales(data.sales)
        setRevenue(data.total_revenue)
      }
    } finally {
      setLoading(false)
    }
  }, [mine])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !selectedId) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, selectedId])

  function handleVoided(id: string) {
    setSales((prev) => prev.filter((s) => s.id !== id))
    setRevenue((prev) => {
      const sale = sales.find((s) => s.id === id)
      return sale ? prev - sale.total : prev
    })
  }

  const today = new Intl.DateTimeFormat('es-CL', { dateStyle: 'full' }).format(new Date())

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Sheet */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="sales-sheet-title"
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 id="sales-sheet-title" className="font-bold text-slate-900 [text-wrap:balance]">
              {title ?? (mine ? 'Mis ventas de hoy' : 'Ventas del día')}
            </h2>
            <p className="mt-0.5 text-xs capitalize text-slate-400">{today}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={load}
              disabled={loading}
              aria-label="Actualizar"
              className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500 disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Summary bar */}
        {!loading && (
          <div className="flex items-center gap-4 border-b border-slate-100 bg-slate-50 px-5 py-3">
            <div className="flex items-center gap-1.5">
              <TrendingUp size={14} className="text-fuchsia-500" aria-hidden="true" />
              <span className="text-xs text-slate-500">
                <span className="font-bold text-slate-800 tabular-nums">{sales.length}</span>
                {' '}venta{sales.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="h-3 w-px bg-slate-200" aria-hidden="true" />
            <span className="text-xs text-slate-500">
              Total: <span className="font-bold text-slate-800 tabular-nums">{formatCurrency(revenue)}</span>
            </span>
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex h-48 flex-col items-center justify-center gap-2 text-sm text-slate-400">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-fuchsia-500" aria-hidden="true" />
              Cargando ventas…
            </div>
          ) : sales.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center gap-2 text-slate-400">
              <TrendingUp size={28} aria-hidden="true" />
              <p className="text-sm">Sin ventas registradas hoy</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-50 px-2 py-2" role="list">
              {sales.map((sale) => {
                const Icon = METHOD_ICON[sale.payment_method ?? ''] ?? CreditCard
                return (
                  <li key={sale.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(sale.id)}
                      aria-label={`Ver detalle de ${sale.order_number}`}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500"
                    >
                      {/* Method icon */}
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-fuchsia-50">
                        <Icon size={16} className="text-fuchsia-600" aria-hidden="true" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-1.5">
                          <p className="text-sm font-semibold text-slate-800">{sale.order_number}</p>
                          {sale.customer_name && (
                            <p className="truncate text-xs text-slate-400">· {sale.customer_name}</p>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">
                          {METHOD_LABEL[sale.payment_method ?? ''] ?? sale.payment_method} · {sale.items_count} ítem{sale.items_count !== 1 ? 's' : ''} · {timeHM(sale.created_at)}
                        </p>
                      </div>

                      {/* Total */}
                      <span className="shrink-0 font-black tabular-nums text-slate-900">
                        {formatCurrency(sale.total)}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </aside>

      {/* Detail modal */}
      {selectedId && (
        <SaleDetailModal
          orderId={selectedId}
          canVoid={canVoid}
          printEnabled={printEnabled}
          storeName={storeName}
          formatCurrency={formatCurrency}
          onClose={() => setSelectedId(null)}
          onVoided={handleVoided}
        />
      )}
    </>
  )
}
