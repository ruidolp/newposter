'use client'

import { useEffect, useState } from 'react'
import {
  Package,
  AlertTriangle,
  ShoppingCart,
  TrendingUp,
  Truck,
  ClipboardList,
  RefreshCw,
} from 'lucide-react'
import SalesSheet from '@/components/SalesSheet'

interface DashboardData {
  products: { total: number; lowStock: number }
  orders: {
    today: { count: number; revenue: number }
    month: { count: number; revenue: number }
  }
  recentPurchases: {
    id: string
    invoice_number: string | null
    total_amount: number
    status: string | null
    purchased_at: string | null
    supplier_name: string | null
  }[]
  recentLogs: {
    id: string
    action: string
    entity_type: string | null
    user_name: string | null
    created_at: string | null
  }[]
}

function fmt(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)
}

function timeAgo(dateStr: string | null) {
  if (!dateStr) return '—'
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'hace un momento'
  if (m < 60) return `hace ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `hace ${h}h`
  return `hace ${Math.floor(h / 24)}d`
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  RECEIVED: 'Recibida',
  CANCELLED: 'Cancelada',
}
const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  RECEIVED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-red-100 text-red-700',
}

export default function DashboardClient({ userName }: { userName: string }) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showSales, setShowSales] = useState(false)

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/dashboard')
      if (!res.ok) throw new Error('Error al cargar datos')
      setData(await res.json())
    } catch {
      setError('No se pudo cargar el resumen')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 [text-wrap:balance]">
            Bienvenido{userName ? `, ${userName.split(' ')[0]}` : ''}
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">Resumen de actividad</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          aria-label="Actualizar datos"
          className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500 disabled:opacity-50"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} aria-hidden="true" />
        </button>
      </div>

      {error && (
        <div role="alert" aria-live="assertive" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : data ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <KpiCard
              icon={<Package size={18} aria-hidden="true" />}
              label="Productos activos"
              value={data.products.total.toString()}
              color="fuchsia"
            />
            <KpiCard
              icon={<AlertTriangle size={18} aria-hidden="true" />}
              label="Stock bajo"
              value={data.products.lowStock.toString()}
              color={data.products.lowStock > 0 ? 'amber' : 'slate'}
              alert={data.products.lowStock > 0}
            />
            <KpiCard
              icon={<ShoppingCart size={18} aria-hidden="true" />}
              label="Ventas hoy"
              value={data.orders.today.count.toString()}
              sub={fmt(data.orders.today.revenue)}
              color="emerald"
              onClick={() => setShowSales(true)}
            />
            <KpiCard
              icon={<TrendingUp size={18} aria-hidden="true" />}
              label="Ingresos del mes"
              value={fmt(data.orders.month.revenue)}
              sub={`${data.orders.month.count} órdenes`}
              color="violet"
            />
          </div>

          {/* Lower panels */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Recent Purchases */}
            <section aria-label="Últimas compras" className="rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
                <Truck size={15} className="text-fuchsia-600" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-slate-800">Últimas compras</h2>
              </div>
              {data.recentPurchases.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-slate-400">Sin compras registradas</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {data.recentPurchases.map((p) => {
                    const s = (p.status ?? 'PENDING').toUpperCase()
                    return (
                      <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-800">
                            {p.supplier_name ?? 'Sin proveedor'}
                          </p>
                          <p className="text-xs text-slate-400">
                            {p.invoice_number ? `#${p.invoice_number}` : 'Sin factura'} · {timeAgo(p.purchased_at)}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span className="text-sm font-semibold text-slate-800">{fmt(p.total_amount)}</span>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[s] ?? 'bg-slate-100 text-slate-600'}`}>
                            {STATUS_LABELS[s] ?? s}
                          </span>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>

            {/* Recent Logs */}
            <section aria-label="Actividad reciente" className="rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
                <ClipboardList size={15} className="text-fuchsia-600" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-slate-800">Actividad reciente</h2>
              </div>
              {data.recentLogs.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-slate-400">Sin actividad registrada</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {data.recentLogs.map((log) => (
                    <li key={log.id} className="flex items-center justify-between gap-3 px-5 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800 capitalize">
                          {log.action.toLowerCase().replace(/_/g, ' ')}
                          {log.entity_type ? <span className="ml-1 text-slate-400 font-normal text-xs">({log.entity_type})</span> : null}
                        </p>
                        <p className="text-xs text-slate-400">{log.user_name ?? 'Sistema'}</p>
                      </div>
                      <span className="shrink-0 text-xs text-slate-400">{timeAgo(log.created_at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      ) : null}

      {showSales && (
        <SalesSheet
          mine={false}
          canVoid={true}
          formatCurrency={fmt}
          onClose={() => setShowSales(false)}
          title="Ventas del día — todos los usuarios"
        />
      )}
    </div>
  )
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
const COLOR_MAP = {
  fuchsia: 'bg-fuchsia-50 text-fuchsia-600',
  amber:   'bg-amber-50 text-amber-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  violet:  'bg-violet-50 text-violet-600',
  slate:   'bg-slate-100 text-slate-500',
}

function KpiCard({
  icon, label, value, sub, color, alert, onClick,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
  color: keyof typeof COLOR_MAP
  alert?: boolean
  onClick?: () => void
}) {
  const base = `rounded-xl border bg-white p-5 ${alert ? 'border-amber-200' : 'border-slate-200'}`
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${base} text-left transition hover:shadow-md hover:border-fuchsia-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500 w-full`}
      >
        <div className={`mb-3 inline-flex rounded-lg p-2 ${COLOR_MAP[color]}`}>{icon}</div>
        <p className="text-2xl font-bold tracking-tight text-slate-900">{value}</p>
        <p className="mt-0.5 text-xs text-slate-500">{label}</p>
        {sub && <p className="mt-1 text-xs font-medium text-slate-400">{sub}</p>}
      </button>
    )
  }
  return (
    <div className={base}>
      <div className={`mb-3 inline-flex rounded-lg p-2 ${COLOR_MAP[color]}`}>{icon}</div>
      <p className="text-2xl font-bold tracking-tight text-slate-900">{value}</p>
      <p className="mt-0.5 text-xs text-slate-500">{label}</p>
      {sub && <p className="mt-1 text-xs font-medium text-slate-400">{sub}</p>}
    </div>
  )
}
