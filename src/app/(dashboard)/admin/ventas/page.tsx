'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Banknote,
  Calendar,
  CreditCard,
  ArrowUpRight,
  Globe,
  MapPin,
  Receipt,
  RefreshCw,
  Scan,
  TrendingUp,
} from 'lucide-react'
import SaleDetailModal from '@/components/SaleDetailModal'

const fmt = (n: number) =>
  n.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 })

type DateRange = 'today' | 'week' | 'month'

interface Sale {
  id: string
  order_number: string
  total: number
  status: string | null
  payment_method: string | null
  channel: string | null
  location_id: string | null
  customer_name: string | null
  items_count: number
  created_at: string | null
}

interface Location {
  id: string
  name: string
  type: string
  is_default: boolean
}

const METHOD_ICON: Record<string, React.ElementType> = {
  CASH: Banknote,
  CARD: CreditCard,
  TRANSFER: ArrowUpRight,
}
const METHOD_LABEL: Record<string, string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
}

const RANGES: { value: DateRange; label: string }[] = [
  { value: 'today', label: 'Hoy' },
  { value: 'week', label: 'Esta semana' },
  { value: 'month', label: 'Este mes' },
]

function StatCard({
  icon: Icon,
  iconClass,
  label,
  count,
  revenue,
  loading,
  accent,
}: {
  icon: React.ElementType
  iconClass: string
  label: string
  count: number
  revenue: number
  loading: boolean
  accent?: boolean
}) {
  return (
    <div
      className={`rounded-xl border p-4 shadow-sm ${
        accent
          ? 'border-fuchsia-100 bg-gradient-to-br from-fuchsia-50 to-white'
          : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className={`grid h-7 w-7 place-items-center rounded-lg ${accent ? 'bg-fuchsia-100' : 'bg-slate-100'}`}>
          <Icon size={14} className={iconClass} aria-hidden="true" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      </div>
      <p className="text-2xl font-black tabular-nums text-slate-900">
        {loading ? '—' : fmt(revenue)}
      </p>
      <p className="mt-0.5 text-xs text-slate-400">
        {loading ? '—' : `${count} venta${count !== 1 ? 's' : ''}`}
      </p>
    </div>
  )
}

export default function VentasPage() {
  const [range, setRange] = useState<DateRange>('today')
  const [sales, setSales] = useState<Sale[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [timezone, setTimezone] = useState('America/Santiago')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [storeName, setStoreName] = useState('')
  const [printEnabled, setPrintEnabled] = useState(false)

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d) => {
        setStoreName(d.store_name ?? '')
        setPrintEnabled(d.metadata?.print_ticket === true)
        if (d.settings?.timezone) setTimezone(d.settings.timezone)
      })
    fetch('/api/locations?all=true')
      .then((r) => r.json())
      .then((d) => setLocations(d.locations ?? []))
  }, [])

  const load = useCallback(() => {
    setLoading(true)
    fetch(`/api/sales?range=${range}`)
      .then((r) => r.json())
      .then((d) => {
        setSales(d.sales ?? [])
        if (d.timezone) setTimezone(d.timezone)
      })
      .finally(() => setLoading(false))
  }, [range])

  useEffect(() => { load() }, [load])

  function fmtTime(dateStr: string | null) {
    if (!dateStr) return '—'
    return new Intl.DateTimeFormat('es-CL', { hour: '2-digit', minute: '2-digit', timeZone: timezone }).format(new Date(dateStr))
  }

  function fmtDate(dateStr: string | null) {
    if (!dateStr) return '—'
    return new Intl.DateTimeFormat('es-CL', { dateStyle: 'short', timeStyle: 'short', timeZone: timezone }).format(new Date(dateStr))
  }

  function handleVoided(id: string) {
    setSales((prev) => prev.map((s) => (s.id === id ? { ...s, status: 'CANCELLED' } : s)))
  }

  // Derived stats
  const active = sales.filter((s) => s.status !== 'CANCELLED')

  const WEB_CHANNELS = ['ONLINE', 'STOREFRONT', 'WEB']
  const isWebChannel = (ch: string | null) => WEB_CHANNELS.includes(ch ?? '')

  const physical = active.filter((s) => !isWebChannel(s.channel))
  const online   = active.filter((s) => isWebChannel(s.channel))

  const totalRevenue  = active.reduce((s, r) => s + r.total, 0)
  const physRevenue   = physical.reduce((s, r) => s + r.total, 0)
  const onlineRevenue = online.reduce((s, r) => s + r.total, 0)

  // Per-location stats — physical locations
  const locationStats: {
    id: string; name: string; isDefault: boolean; count: number; revenue: number; isOnline: boolean
  }[] = locations
    .map((loc) => {
      const locSales = active.filter((s) => s.location_id === loc.id)
      return { id: loc.id, name: loc.name, isDefault: loc.is_default, count: locSales.length, revenue: locSales.reduce((s, r) => s + r.total, 0), isOnline: false }
    })
    .filter((ls) => ls.count > 0)

  // POS sales with no location_id (legacy / pre-locations)
  const noLocation = physical.filter((s) => !s.location_id)
  if (noLocation.length > 0) {
    locationStats.push({
      id: '__nolocation__',
      name: 'Sin sucursal asignada',
      isDefault: false,
      count: noLocation.length,
      revenue: noLocation.reduce((s, r) => s + r.total, 0),
      isOnline: false,
    })
  }

  // Online/web channel sales
  if (online.length > 0) {
    locationStats.push({
      id: '__online__',
      name: 'Online / eCommerce',
      isDefault: false,
      count: online.length,
      revenue: onlineRevenue,
      isOnline: true,
    })
  }

  return (
    <section className="space-y-5">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 [text-wrap:balance]">
            Reporte de <span className="text-fuchsia-600">Ventas</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">Totales, desglose por canal y detalle de transacciones</p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500 disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </header>

      {/* Range tabs */}
      <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 w-fit">
        {RANGES.map((r) => (
          <button
            key={r.value}
            type="button"
            onClick={() => setRange(r.value)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500 ${
              range === r.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Calendar size={13} />
            {r.label}
          </button>
        ))}
      </div>

      {/* Total + canal cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={TrendingUp}
          iconClass="text-fuchsia-600"
          label="Total general"
          count={active.length}
          revenue={totalRevenue}
          loading={loading}
          accent
        />
        <StatCard
          icon={Scan}
          iconClass="text-slate-600"
          label="Ventas físicas (POS)"
          count={physical.length}
          revenue={physRevenue}
          loading={loading}
        />
        <StatCard
          icon={Globe}
          iconClass="text-slate-600"
          label="Ventas online"
          count={online.length}
          revenue={onlineRevenue}
          loading={loading}
        />
      </div>

      {/* Per-location breakdown (only when there are sales) */}
      {!loading && locationStats.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-200 px-4 py-3">
            <p className="text-sm font-semibold text-slate-800">Por sucursal</p>
          </div>
          <div className="divide-y divide-slate-100">
            {locationStats.map(({ id, name, isDefault, count, revenue, isOnline }) => (
              <div key={id} className="flex items-center gap-3 px-4 py-3">
                <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${isOnline ? 'bg-sky-50' : 'bg-slate-100'}`}>
                  {isOnline
                    ? <Globe size={14} className="text-sky-500" aria-hidden="true" />
                    : <MapPin size={14} className="text-slate-500" aria-hidden="true" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">
                    {name}
                    {isDefault && (
                      <span className="ml-2 rounded-full bg-fuchsia-100 px-1.5 py-0.5 text-[10px] font-semibold text-fuchsia-600">
                        Principal
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-400">{count} venta{count !== 1 ? 's' : ''}</p>
                </div>
                <span className="shrink-0 font-black tabular-nums text-slate-900">{fmt(revenue)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sales list */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <p className="text-sm font-semibold text-slate-800">Transacciones</p>
          {!loading && sales.length > 0 && (
            <p className="text-xs text-slate-400">
              {sales.length} registro{sales.length !== 1 ? 's' : ''}
              {sales.length !== active.length && (
                <span className="ml-1 text-rose-500">
                  · {sales.length - active.length} anulada{sales.length - active.length !== 1 ? 's' : ''}
                </span>
              )}
            </p>
          )}
        </div>

        {loading ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 text-sm text-slate-400">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-fuchsia-500" />
            Cargando ventas…
          </div>
        ) : sales.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 text-slate-400">
            <Receipt size={28} />
            <p className="text-sm">Sin ventas en este período</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100" role="list">
            {sales.map((sale) => {
              const Icon = METHOD_ICON[sale.payment_method ?? ''] ?? CreditCard
              const cancelled = sale.status === 'CANCELLED'
              const locName = locations.find((l) => l.id === sale.location_id)?.name
              return (
                <li key={sale.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(sale.id)}
                    aria-label={`Ver detalle de ${sale.order_number}`}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-fuchsia-500 ${
                      cancelled ? 'opacity-50' : ''
                    }`}
                  >
                    <div
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                        cancelled ? 'bg-slate-100' : 'bg-fuchsia-50'
                      }`}
                    >
                      <Icon size={16} className={cancelled ? 'text-slate-400' : 'text-fuchsia-600'} aria-hidden="true" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-slate-800">{sale.order_number}</p>
                        {cancelled && (
                          <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600">
                            Anulada
                          </span>
                        )}
                        {isWebChannel(sale.channel) ? (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold text-sky-600">
                            <Globe size={9} aria-hidden="true" />
                            Online
                          </span>
                        ) : locName ? (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                            <MapPin size={9} aria-hidden="true" />
                            {locName}
                          </span>
                        ) : null}
                        {sale.customer_name && (
                          <p className="truncate text-xs text-slate-400">· {sale.customer_name}</p>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">
                        {METHOD_LABEL[sale.payment_method ?? ''] ?? sale.payment_method ?? '—'}
                        {' · '}
                        {sale.items_count} ítem{sale.items_count !== 1 ? 's' : ''}
                        {' · '}
                        {range === 'today' ? fmtTime(sale.created_at) : fmtDate(sale.created_at)}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 font-black tabular-nums ${
                        cancelled ? 'text-slate-400 line-through' : 'text-slate-900'
                      }`}
                    >
                      {fmt(sale.total)}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {selectedId && (
        <SaleDetailModal
          orderId={selectedId}
          canVoid={true}
          printEnabled={printEnabled}
          storeName={storeName}
          timezone={timezone}
          formatCurrency={fmt}
          onClose={() => setSelectedId(null)}
          onVoided={handleVoided}
        />
      )}
    </section>
  )
}
