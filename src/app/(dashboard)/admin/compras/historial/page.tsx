'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Calendar, User, FileText as FileIcon, RefreshCw, ExternalLink, X, Ban,
} from 'lucide-react'

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

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  COMPLETED: { label: 'Finalizada', className: 'badge-completed' },
  DRAFT: { label: 'Borrador', className: 'badge-draft' },
  CANCELLED: { label: 'Anulada', className: 'badge-cancelled' },
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

  useEffect(() => { fetchPurchases(1) }, [filterStatus])

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
      setPurchases(prev => p === 1 ? list : [...prev, ...list])
      setHasMore(list.length === 20)
      setPage(p)
    } catch {
      // no-op
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
    if (!detail) return
    if (detail.status === 'CANCELLED') return

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

  const productItems = (detail?.items ?? []).filter(i => !i.product_name.startsWith('[EXTRA]'))
  const extraItems = (detail?.items ?? []).filter(i => i.product_name.startsWith('[EXTRA]'))
  const productGrossTotal = productItems.reduce((sum, i) => sum + (parseFloat(i.purchase_price) * i.quantity), 0)
  const extrasGrossTotal = extraItems.reduce((sum, i) => sum + parseFloat(i.purchase_price), 0)

  return (
    <>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Historial de <span>Compras</span></h1>
          <p className="admin-page-subtitle">Consulta y audita facturas de compra</p>
        </div>
        <button
          className="admin-btn admin-btn-secondary"
          onClick={() => fetchPurchases(1)}
          disabled={loading}
        >
          <RefreshCw size={14} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
          Actualizar
        </button>
      </div>

      <div className="admin-panel">
        <div className="admin-panel-header" style={{ gap: 8 }}>
          <span className="admin-panel-title">Compras</span>
          <div className="hist-status-filters">
            {(['ALL', 'COMPLETED', 'DRAFT', 'CANCELLED'] as const).map(s => (
              <button
                key={s}
                className={`hist-filter-btn${filterStatus === s ? ' active' : ''}`}
                onClick={() => { setFilterStatus(s); setDrawerOpen(false) }}
              >
                {s === 'ALL' ? 'Todas' : STATUS_CONFIG[s]?.label ?? s}
              </button>
            ))}
          </div>
        </div>

        {loading && purchases.length === 0 ? (
          <div className="admin-empty-state"><span className="admin-spinner" /> Cargando…</div>
        ) : purchases.length === 0 ? (
          <div className="admin-empty-state">Sin compras para este filtro</div>
        ) : (
          <div>
            <div className="purchase-history-head">
              <span>Fecha</span>
              <span>N° Factura</span>
              <span>Proveedor</span>
              <span>Estado</span>
              <span className="a-text-right">Total Bruto</span>
              <span>Registrado por</span>
              <span></span>
            </div>

            {purchases.map(p => {
              const sc = STATUS_CONFIG[p.status] ?? { label: p.status, className: 'badge-draft' }
              return (
                <div key={p.id} className="purchase-history-row" onClick={() => handleOpenDrawer(p.id)}>
                  <span className="ph-date">
                    <Calendar size={12} style={{ flexShrink: 0 }} />
                    {fmtDate(p.created_at)}
                  </span>
                  <span className="ph-invoice">
                    {p.invoice_number
                      ? <><FileIcon size={12} style={{ flexShrink: 0 }} />{p.invoice_number}</>
                      : <span style={{ color: 'var(--a-text-3)' }}>Sin folio</span>}
                  </span>
                  <span className="ph-supplier">
                    {p.supplier_name ?? <span style={{ color: 'var(--a-text-3)' }}>Sin proveedor</span>}
                  </span>
                  <span>
                    <span className={`hist-status-badge ${sc.className}`}>{sc.label}</span>
                  </span>
                  <span className="ph-total a-text-right">{fmt(parseFloat(p.total_amount))}</span>
                  <span className="ph-user">
                    <User size={12} style={{ flexShrink: 0 }} />
                    {p.created_by_name ?? '—'}
                  </span>
                  <span className="ph-chevron">
                    <ExternalLink size={13} />
                  </span>
                </div>
              )
            })}

            {hasMore && (
              <div style={{ padding: '12px 16px', textAlign: 'center' }}>
                <button
                  className="admin-btn admin-btn-secondary admin-btn-sm"
                  onClick={() => fetchPurchases(page + 1)}
                  disabled={loading}
                >
                  {loading ? <span className="admin-spinner" /> : 'Cargar más'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {drawerOpen && <div className="invoice-drawer-backdrop" onClick={() => setDrawerOpen(false)} />}

      <aside className={`invoice-drawer${drawerOpen ? ' open' : ''}`}>
        <div className="invoice-drawer-head">
          <div>
            <div className="invoice-drawer-title">Factura de compra</div>
            <div className="invoice-drawer-subtitle">Vista detallada y acciones</div>
          </div>
          <button className="admin-btn-icon" onClick={() => setDrawerOpen(false)}>
            <X size={16} />
          </button>
        </div>

        {detailLoading || !detail ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--a-text-3)' }}>
            <span className="admin-spinner" />
          </div>
        ) : (
          <div className="invoice-drawer-body">
            <div className="invoice-card">
              <div className="invoice-card-head">
                <div>
                  <div className="invoice-card-title">Factura {detail.invoice_number || detail.id}</div>
                  <div className="invoice-card-meta">Fecha: {fmtDate(detail.purchased_at || detail.created_at)}</div>
                </div>
                <span className={`hist-status-badge ${(STATUS_CONFIG[detail.status] ?? { className: 'badge-draft' }).className}`}>
                  {(STATUS_CONFIG[detail.status] ?? { label: detail.status }).label}
                </span>
              </div>

              <div className="invoice-party-grid">
                <div>
                  <div className="invoice-label">Proveedor</div>
                  <div className="invoice-value">{detail.supplier_name || 'Sin proveedor'}</div>
                  {detail.supplier_rut && <div className="invoice-sub">RUT: {detail.supplier_rut}</div>}
                  {detail.supplier_contact_name && <div className="invoice-sub">Contacto: {detail.supplier_contact_name}</div>}
                </div>
                <div>
                  <div className="invoice-label">Registrado por</div>
                  <div className="invoice-value">{detail.created_by_name || '—'}</div>
                  {detail.supplier_email && <div className="invoice-sub">Email proveedor: {detail.supplier_email}</div>}
                  {detail.supplier_phone && <div className="invoice-sub">Teléfono proveedor: {detail.supplier_phone}</div>}
                </div>
              </div>

              {detail.supplier_address && (
                <div className="invoice-note-block">
                  <div className="invoice-label">Dirección proveedor</div>
                  <div className="invoice-sub">{detail.supplier_address}</div>
                </div>
              )}

              {detail.notes && (
                <div className="invoice-note-block">
                  <div className="invoice-label">Notas</div>
                  <div className="invoice-sub">{detail.notes}</div>
                </div>
              )}

              <div className="invoice-items-head">
                <span>Producto</span>
                <span>SKU</span>
                <span className="a-text-right">Cant.</span>
                <span className="a-text-right">P. Unitario</span>
                <span className="a-text-right">Subtotal</span>
              </div>
              {productItems.map(item => (
                <div key={item.id} className="invoice-items-row">
                  <span>{item.product_name}</span>
                  <span className="admin-mono" style={{ color: 'var(--a-text-2)', fontSize: 11 }}>{item.sku || '—'}</span>
                  <span className="a-text-right">{item.quantity}</span>
                  <span className="a-text-right">{fmt(parseFloat(item.purchase_price))}</span>
                  <span className="a-text-right">{fmt(parseFloat(item.purchase_price) * item.quantity)}</span>
                </div>
              ))}

              {extraItems.length > 0 && (
                <>
                  <div className="invoice-extra-title">Otros cargos</div>
                  {extraItems.map(item => (
                    <div key={item.id} className="invoice-items-row">
                      <span style={{ gridColumn: '1 / 4' }}>{item.product_name.replace('[EXTRA] ', '')}</span>
                      <span className="a-text-right" style={{ gridColumn: '4 / 6' }}>{fmt(parseFloat(item.purchase_price))}</span>
                    </div>
                  ))}
                </>
              )}

              <div className="invoice-total-grid">
                <span>Subtotal productos</span>
                <strong>{fmt(productGrossTotal)}</strong>
                <span>Otros cargos</span>
                <strong>{fmt(extrasGrossTotal)}</strong>
                <span>Total factura</span>
                <strong>{fmt(parseFloat(detail.total_amount))}</strong>
              </div>
            </div>

            {detail.invoice_photo && (
              <div className="invoice-card" style={{ marginTop: 12 }}>
                <div className="invoice-label" style={{ marginBottom: 8 }}>Documento adjunto</div>
                {detail.invoice_photo.startsWith('data:image') ? (
                  <img src={detail.invoice_photo} alt="Factura adjunta" className="invoice-preview-media" />
                ) : detail.invoice_photo.startsWith('data:application/pdf') ? (
                  <iframe src={detail.invoice_photo} title="PDF factura" className="invoice-preview-media" />
                ) : (
                  <a
                    href={detail.invoice_photo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="admin-btn admin-btn-secondary admin-btn-sm"
                  >
                    Abrir adjunto
                  </a>
                )}
              </div>
            )}

            <div className="invoice-actions">
              <button
                className="admin-btn admin-btn-danger"
                disabled={detail.status === 'CANCELLED' || cancelling}
                onClick={handleCancelPurchase}
              >
                {cancelling ? <span className="admin-spinner" /> : <Ban size={14} />}
                {detail.status === 'CANCELLED' ? 'Factura anulada' : 'Anular factura'}
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}
