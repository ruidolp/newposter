'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Ban, Calendar, ExternalLink, FileText as FileIcon, RefreshCw, User, X } from 'lucide-react'

interface PurchaseSummary {
  id: string
  invoice_number: string | null
  total_amount: string
  status: string
  purchased_at: string | null
  created_at: string
  supplier_name: string | null
  created_by_name: string | null
}

interface PurchaseDetail extends PurchaseSummary {
  notes: string | null
  invoice_photo: string | null
  supplier_id: string | null
  supplier_rut: string | null
  supplier_email: string | null
  supplier_phone: string | null
  supplier_address: string | null
  supplier_contact_name: string | null
  items: Array<{
    id: string
    product_id: string | null
    product_name: string
    quantity: number
    purchase_price: string
    previous_stock: number
    new_stock: number
    sale_price: string | null
    sku: string | null
  }>
}

function fmt(n: number) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(n)
}

function fmtDate(str: string | null) {
  if (!str) return '—'
  return new Date(str).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
}

const STATUS_CONFIG: Record<string, { label: string; badge: string }> = {
  COMPLETED: { label: 'Finalizada', badge: 'bg-emerald-50 text-emerald-700' },
  DRAFT: { label: 'Borrador', badge: 'bg-amber-50 text-amber-700' },
  CANCELLED: { label: 'Anulada', badge: 'bg-red-50 text-red-700' },
}

export default function HistorialComprasPage() {
  const searchParams = useSearchParams()
  const [purchases, setPurchases] = useState<PurchaseSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<PurchaseDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('ALL')

  const openFromQuery = useMemo(() => searchParams.get('purchase_id'), [searchParams])

  useEffect(() => {
    fetchPurchases(1)
  }, [filterStatus])

  useEffect(() => {
    if (!openFromQuery) return
    handleOpenDrawer(openFromQuery)
  }, [openFromQuery])

  async function fetchPurchases(p: number) {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), limit: '20' })
      if (filterStatus !== 'ALL') params.set('status', filterStatus)
      const res = await fetch(`/api/purchases?${params}`)
      const data = await res.json()
      const list: PurchaseSummary[] = data.purchases ?? []
      setPurchases((prev) => (p === 1 ? list : [...prev, ...list]))
      setHasMore(list.length === 20)
      setPage(p)
    } finally {
      setLoading(false)
    }
  }

  async function handleOpenDrawer(id: string) {
    setDrawerOpen(true)
    setDetail(null)
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/purchases/${id}`)
      const data = await res.json()
      setDetail(data)
    } catch {
      setDetail(null)
    } finally {
      setDetailLoading(false)
    }
  }

  async function handleCancelPurchase() {
    if (!detail || detail.status === 'CANCELLED') return
    const reason = window.prompt('Motivo de anulación', 'Error en factura')
    if (reason === null) return
    const ok = window.confirm('¿Seguro que deseas anular esta factura? Se revertirá el stock y el costo asociado a la compra.')
    if (!ok) return

    setCancelling(true)
    try {
      const res = await fetch(`/api/purchases/${detail.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CANCEL', reason }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'No se pudo anular la factura')

      await fetchPurchases(1)
      await handleOpenDrawer(detail.id)
      alert('Factura anulada correctamente')
    } catch (err: any) {
      alert(err?.message || 'Error al anular factura')
    } finally {
      setCancelling(false)
    }
  }

  const productItems = (detail?.items ?? []).filter((i) => !i.product_name.startsWith('[EXTRA]'))
  const extraItems = (detail?.items ?? []).filter((i) => i.product_name.startsWith('[EXTRA]'))
  const productGrossTotal = productItems.reduce((sum, i) => sum + parseFloat(i.purchase_price) * i.quantity, 0)
  const extrasGrossTotal = extraItems.reduce((sum, i) => sum + parseFloat(i.purchase_price), 0)

  return (
    <section className="space-y-5">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 [text-wrap:balance]">
            Historial de <span className="text-fuchsia-600">Compras</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">Consulta y audita facturas de compra</p>
        </div>
        <button
          type="button"
          onClick={() => fetchPurchases(1)}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500 disabled:opacity-60"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </header>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold text-slate-800">Compras</h2>
          <div className="flex flex-wrap gap-2">
            {(['ALL', 'COMPLETED', 'DRAFT', 'CANCELLED'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setFilterStatus(s)
                  setDrawerOpen(false)
                }}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  filterStatus === s ? 'bg-fuchsia-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {s === 'ALL' ? 'Todas' : STATUS_CONFIG[s]?.label ?? s}
              </button>
            ))}
          </div>
        </div>

        {loading && purchases.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-slate-500">Cargando…</div>
        ) : purchases.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-slate-500">Sin compras para este filtro</div>
        ) : (
          <>
            <div className="hidden grid-cols-7 gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid">
              <span>Fecha</span>
              <span>N° Factura</span>
              <span>Proveedor</span>
              <span>Estado</span>
              <span className="text-right">Total Bruto</span>
              <span>Registrado por</span>
              <span />
            </div>

            <div className="divide-y divide-slate-100">
              {purchases.map((p) => {
                const sc = STATUS_CONFIG[p.status] ?? { label: p.status, badge: 'bg-slate-100 text-slate-700' }
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleOpenDrawer(p.id)}
                    className="grid w-full grid-cols-1 gap-1 px-4 py-3 text-left transition hover:bg-slate-50 md:grid-cols-7 md:items-center md:gap-2"
                  >
                    <span className="inline-flex items-center gap-1.5 text-sm text-slate-700">
                      <Calendar size={12} />
                      {fmtDate(p.created_at)}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-sm text-slate-700">
                      <FileIcon size={12} />
                      {p.invoice_number || <span className="text-slate-400">Sin folio</span>}
                    </span>
                    <span className="text-sm text-slate-700">{p.supplier_name || <span className="text-slate-400">Sin proveedor</span>}</span>
                    <span>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${sc.badge}`}>{sc.label}</span>
                    </span>
                    <span className="text-right text-sm font-medium text-slate-900">{fmt(parseFloat(p.total_amount))}</span>
                    <span className="inline-flex items-center gap-1.5 text-sm text-slate-600">
                      <User size={12} />
                      {p.created_by_name || '—'}
                    </span>
                    <span className="hidden justify-end text-slate-400 md:flex">
                      <ExternalLink size={14} />
                    </span>
                  </button>
                )
              })}
            </div>

            {hasMore && (
              <div className="px-4 py-3 text-center">
                <button
                  type="button"
                  onClick={() => fetchPurchases(page + 1)}
                  disabled={loading}
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500 disabled:opacity-60"
                >
                  {loading ? 'Cargando…' : 'Cargar más'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {drawerOpen && <div className="fixed inset-0 z-40 bg-slate-900/30" onClick={() => setDrawerOpen(false)} />}

      <aside
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-3xl transform overflow-y-auto border-l border-slate-200 bg-white shadow-2xl transition-transform duration-200 ${
          drawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Factura de compra</h3>
            <p className="text-xs text-slate-500">Vista detallada y acciones</p>
          </div>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="rounded p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        {detailLoading || !detail ? (
          <div className="px-6 py-10 text-center text-sm text-slate-500">Cargando…</div>
        ) : (
          <div className="space-y-4 p-5">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Factura {detail.invoice_number || detail.id}</h4>
                  <p className="text-xs text-slate-500">Fecha: {fmtDate(detail.purchased_at || detail.created_at)}</p>
                </div>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${(STATUS_CONFIG[detail.status] ?? { badge: 'bg-slate-100 text-slate-700' }).badge}`}>
                  {(STATUS_CONFIG[detail.status] ?? { label: detail.status }).label}
                </span>
              </div>

              <div className="mb-3 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Proveedor</p>
                  <p className="font-medium text-slate-900">{detail.supplier_name || 'Sin proveedor'}</p>
                  {detail.supplier_rut && <p className="text-xs text-slate-500">RUT: {detail.supplier_rut}</p>}
                  {detail.supplier_contact_name && <p className="text-xs text-slate-500">Contacto: {detail.supplier_contact_name}</p>}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Registrado por</p>
                  <p className="font-medium text-slate-900">{detail.created_by_name || '—'}</p>
                  {detail.supplier_email && <p className="text-xs text-slate-500">Email proveedor: {detail.supplier_email}</p>}
                  {detail.supplier_phone && <p className="text-xs text-slate-500">Teléfono proveedor: {detail.supplier_phone}</p>}
                </div>
              </div>

              {detail.supplier_address && (
                <div className="mb-2 rounded-md border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-600">
                  <p className="mb-0.5 font-semibold uppercase tracking-wide text-slate-500">Dirección proveedor</p>
                  {detail.supplier_address}
                </div>
              )}

              {detail.notes && (
                <div className="mb-2 rounded-md border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-600">
                  <p className="mb-0.5 font-semibold uppercase tracking-wide text-slate-500">Notas</p>
                  {detail.notes}
                </div>
              )}

              <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
                <div className="grid min-w-[640px] grid-cols-5 gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <span>Producto</span>
                  <span>SKU</span>
                  <span className="text-right">Cant.</span>
                  <span className="text-right">P. Unitario</span>
                  <span className="text-right">Subtotal</span>
                </div>
                {productItems.map((item) => (
                  <div key={item.id} className="grid min-w-[640px] grid-cols-5 gap-2 border-b border-slate-100 px-3 py-2 text-sm last:border-b-0">
                    <span className="text-slate-900">{item.product_name}</span>
                    <span className="font-mono text-xs text-slate-500">{item.sku || '—'}</span>
                    <span className="text-right text-slate-700">{item.quantity}</span>
                    <span className="text-right text-slate-700">{fmt(parseFloat(item.purchase_price))}</span>
                    <span className="text-right font-medium text-slate-900">{fmt(parseFloat(item.purchase_price) * item.quantity)}</span>
                  </div>
                ))}
                {extraItems.length > 0 && (
                  <>
                    <div className="border-t border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Otros cargos
                    </div>
                    {extraItems.map((item) => (
                      <div key={item.id} className="grid min-w-[640px] grid-cols-5 gap-2 border-b border-slate-100 px-3 py-2 text-sm last:border-b-0">
                        <span className="col-span-3 text-slate-900">{item.product_name.replace('[EXTRA] ', '')}</span>
                        <span className="col-span-2 text-right font-medium text-slate-900">{fmt(parseFloat(item.purchase_price))}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>

              <div className="mt-3 ml-auto grid w-full max-w-sm grid-cols-2 gap-2 text-sm">
                <span className="text-slate-600">Subtotal productos</span>
                <strong className="text-right text-slate-900">{fmt(productGrossTotal)}</strong>
                <span className="text-slate-600">Otros cargos</span>
                <strong className="text-right text-slate-900">{fmt(extrasGrossTotal)}</strong>
                <span className="font-semibold text-slate-700">Total factura</span>
                <strong className="text-right text-slate-900">{fmt(parseFloat(detail.total_amount))}</strong>
              </div>
            </div>

            {detail.invoice_photo && (
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Documento adjunto</p>
                {detail.invoice_photo.startsWith('data:image') ? (
                  <img src={detail.invoice_photo} alt="Factura adjunta" className="max-h-[480px] w-full rounded-md border border-slate-200 object-contain" />
                ) : detail.invoice_photo.startsWith('data:application/pdf') ? (
                  <iframe src={detail.invoice_photo} title="PDF factura" className="h-[480px] w-full rounded-md border border-slate-200" />
                ) : (
                  <a
                    href={detail.invoice_photo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500"
                  >
                    Abrir adjunto
                  </a>
                )}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleCancelPurchase}
                disabled={detail.status === 'CANCELLED' || cancelling}
                className="inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 disabled:opacity-60"
              >
                {cancelling ? <RefreshCw size={14} className="animate-spin" /> : <Ban size={14} />}
                {detail.status === 'CANCELLED' ? 'Factura anulada' : 'Anular factura'}
              </button>
            </div>
          </div>
        )}
      </aside>
    </section>
  )
}
