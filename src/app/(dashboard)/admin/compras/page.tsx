'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Plus, Trash2, Search, ChevronDown, Upload, X, CheckCircle2,
  AlertCircle, Info, Package, RefreshCw, Eye, EyeOff
} from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────

interface Supplier { id: string; name: string; rut: string | null; contact_name: string | null }
interface Category  { id: string; name: string }
interface ProductHit {
  id: string; name: string; sku: string; barcode: string | null
  base_price: string; stock: number; category_id: string | null
}

interface PurchaseRow {
  rowId: string
  // search
  query: string
  results: ProductHit[]
  showDropdown: boolean
  searching: boolean
  // producto seleccionado
  productId: string | null
  productName: string
  salePrice: number
  currentStock: number
  isExisting: boolean
  // nuevo producto inline
  isNew: boolean
  newSku: string
  newCategoryId: string
  newBasePrice: string
  // campos compra
  qty: number
  purchasePrice: string
}

interface Toast { id: number; type: 'success' | 'error' | 'info'; msg: string }

interface PurchaseSummary {
  id: string; invoice_number: string | null; total_amount: string
  purchased_at: string; supplier_name: string | null; created_by_name: string | null
}

// ─── Helpers ───────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 9)

function fmt(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)
}

function emptyRow(): PurchaseRow {
  return {
    rowId: uid(), query: '', results: [], showDropdown: false, searching: false,
    productId: null, productName: '', salePrice: 0, currentStock: 0, isExisting: false,
    isNew: false, newSku: '', newCategoryId: '', newBasePrice: '',
    qty: 1, purchasePrice: '',
  }
}

// ─── Toast component ───────────────────────────────────────────────────────

function Toasts({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: number) => void }) {
  return (
    <div className="admin-toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`admin-toast ${t.type}`}>
          <span className={`admin-toast-icon ${t.type}`}>
            {t.type === 'success' ? <CheckCircle2 size={15} />
              : t.type === 'error' ? <AlertCircle size={15} />
              : <Info size={15} />}
          </span>
          <span className="admin-toast-msg">{t.msg}</span>
          <button className="admin-btn-icon" style={{ marginLeft: 'auto' }} onClick={() => onRemove(t.id)}>
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  )
}

// ─── SupplierSelector ─────────────────────────────────────────────────────

function SupplierSelector({
  suppliers, selected, onSelect, onCreated,
}: {
  suppliers: Supplier[]
  selected: Supplier | null
  onSelect: (s: Supplier | null) => void
  onCreated: (s: Supplier) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.rut || '').toLowerCase().includes(search.toLowerCase())
  )

  async function handleCreate() {
    if (!newName.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      })
      if (!res.ok) throw new Error()
      const supplier = await res.json()
      onCreated(supplier)
      onSelect(supplier)
      setNewName('')
      setCreating(false)
      setOpen(false)
    } catch {
      // handled upstream
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="supplier-selector-wrap" ref={ref}>
      <div
        className={`supplier-selected${open ? ' open' : ''}`}
        onClick={() => setOpen(!open)}
      >
        {selected
          ? <span className="supplier-selected-name">{selected.name}</span>
          : <span className="supplier-placeholder">Seleccionar proveedor…</span>}
        <ChevronDown size={14} style={{ color: 'var(--a-text-3)', flexShrink: 0 }} />
      </div>

      {open && (
        <div className="supplier-dropdown">
          <div className="supplier-dropdown-search">
            <input
              autoFocus
              className="admin-input admin-input-sm"
              placeholder="Buscar proveedor…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {creating ? (
            <div style={{ padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'center', borderBottom: '1px solid var(--a-border)' }}>
              <input
                autoFocus
                className="admin-input admin-input-sm"
                placeholder="Nombre del proveedor"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                style={{ flex: 1 }}
              />
              <button className="admin-btn admin-btn-primary admin-btn-sm" onClick={handleCreate} disabled={saving || !newName.trim()}>
                {saving ? <span className="admin-spinner" /> : 'Crear'}
              </button>
              <button className="admin-btn-icon" onClick={() => setCreating(false)}><X size={13} /></button>
            </div>
          ) : null}

          <div className="supplier-dropdown-list">
            {selected && (
              <div className="supplier-dropdown-item" onClick={() => { onSelect(null); setOpen(false) }}>
                <div className="supplier-dropdown-item-name" style={{ color: 'var(--a-text-3)' }}>Sin proveedor</div>
              </div>
            )}
            {filtered.map(s => (
              <div
                key={s.id}
                className="supplier-dropdown-item"
                onClick={() => { onSelect(s); setOpen(false); setSearch('') }}
              >
                <div className="supplier-dropdown-item-name">{s.name}</div>
                {(s.rut || s.contact_name) && (
                  <div className="supplier-dropdown-item-meta">
                    {[s.rut, s.contact_name].filter(Boolean).join(' · ')}
                  </div>
                )}
              </div>
            ))}
            {filtered.length === 0 && !creating && (
              <div style={{ padding: '10px 14px', color: 'var(--a-text-3)', fontSize: 12 }}>Sin resultados</div>
            )}
          </div>

          {!creating && (
            <div className="supplier-add-new" onClick={() => setCreating(true)}>
              <Plus size={13} /> Nuevo proveedor
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── ProductRow ────────────────────────────────────────────────────────────

function ProductRow({
  row, categories, onChange, onRemove,
}: {
  row: PurchaseRow
  categories: Category[]
  onChange: (id: string, patch: Partial<PurchaseRow>) => void
  onRemove: (id: string) => void
}) {
  const searchTimer = useRef<NodeJS.Timeout | null>(null)
  const dropRef = useRef<HTMLDivElement>(null)
  const stockDisplay = row.currentStock + row.qty
  const prevNewStock = useRef(stockDisplay)

  // Flash animation when stock changes
  const stockRef = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (prevNewStock.current !== stockDisplay && stockRef.current) {
      stockRef.current.classList.remove('flash')
      void stockRef.current.offsetWidth // reflow
      stockRef.current.classList.add('flash')
      prevNewStock.current = stockDisplay
    }
  }, [stockDisplay])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        onChange(row.rowId, { showDropdown: false })
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [row.rowId, onChange])

  async function handleSearch(q: string) {
    onChange(row.rowId, { query: q, isNew: false, productId: null, productName: '', salePrice: 0, currentStock: 0, isExisting: false })
    if (!q.trim()) { onChange(row.rowId, { results: [], showDropdown: false }); return }
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(async () => {
      onChange(row.rowId, { searching: true, showDropdown: true })
      try {
        const res = await fetch(`/api/products?search=${encodeURIComponent(q)}&limit=8&active=true`)
        const data = await res.json()
        onChange(row.rowId, { results: data.products ?? [], searching: false })
      } catch {
        onChange(row.rowId, { searching: false })
      }
    }, 280)
  }

  function selectProduct(p: ProductHit) {
    onChange(row.rowId, {
      query: p.name,
      productId: p.id,
      productName: p.name,
      salePrice: parseFloat(p.base_price),
      currentStock: p.stock,
      isExisting: true,
      isNew: false,
      showDropdown: false,
      results: [],
    })
  }

  function createNew() {
    onChange(row.rowId, {
      showDropdown: false,
      isNew: true,
      productId: null,
      isExisting: false,
      productName: row.query,
      newSku: '',
      newCategoryId: '',
      newBasePrice: '',
      currentStock: 0,
    })
  }

  const hasProduct = row.isExisting || row.isNew

  return (
    <>
      <div className="purchase-items-row">
        {/* Búsqueda / nombre */}
        <div className="product-search-wrap" ref={dropRef}>
          <input
            className={`admin-input admin-input-sm${row.isNew ? ' mono' : ''}`}
            placeholder="Nombre o SKU…"
            value={row.query}
            onChange={e => handleSearch(e.target.value)}
            onFocus={() => { if (row.results.length > 0) onChange(row.rowId, { showDropdown: true }) }}
            readOnly={row.isExisting}
            style={row.isExisting ? { opacity: 0.7, cursor: 'default' } : {}}
          />
          {row.showDropdown && (
            <div className="product-dropdown">
              {row.searching && (
                <div style={{ padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'center', color: 'var(--a-text-3)', fontSize: 12 }}>
                  <span className="admin-spinner" /> Buscando…
                </div>
              )}
              {!row.searching && row.results.map(p => (
                <div key={p.id} className="product-dropdown-item" onMouseDown={() => selectProduct(p)}>
                  <div className="product-dropdown-item-name">{p.name}</div>
                  <div className="product-dropdown-item-meta">
                    SKU: {p.sku} · Stock: {p.stock} · {fmt(parseFloat(p.base_price))}
                  </div>
                </div>
              ))}
              {!row.searching && (
                <div className="product-dropdown-create" onMouseDown={createNew}>
                  <Plus size={13} /> Crear: &ldquo;{row.query}&rdquo;
                </div>
              )}
            </div>
          )}
          {row.isExisting && (
            <button
              className="admin-btn-icon"
              style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)' }}
              title="Cambiar producto"
              onClick={() => onChange(row.rowId, { isExisting: false, productId: null, productName: '', query: '', currentStock: 0, salePrice: 0 })}
            >
              <X size={11} />
            </button>
          )}
        </div>

        {/* Precio de venta */}
        <div className={`admin-mono`} style={{ padding: '6px 2px' }}>
          {row.isExisting ? fmt(row.salePrice) : row.isNew
            ? <input
                className="admin-input admin-input-sm mono"
                placeholder="Precio venta"
                value={row.newBasePrice}
                onChange={e => onChange(row.rowId, { newBasePrice: e.target.value })}
              />
            : <span style={{ color: 'var(--a-text-3)' }}>—</span>
          }
        </div>

        {/* Stock actual */}
        <span className="prev-stock-display">
          {hasProduct ? row.currentStock : <span style={{ color: 'var(--a-text-3)' }}>—</span>}
        </span>

        {/* Cantidad */}
        <input
          type="number"
          min="1"
          className="admin-input admin-input-sm mono"
          style={{ textAlign: 'right' }}
          value={row.qty}
          onChange={e => onChange(row.rowId, { qty: Math.max(1, parseInt(e.target.value) || 1) })}
        />

        {/* Precio compra */}
        <input
          type="number"
          min="0"
          className="admin-input admin-input-sm mono"
          placeholder="0"
          style={{ textAlign: 'right' }}
          value={row.purchasePrice}
          onChange={e => onChange(row.rowId, { purchasePrice: e.target.value })}
        />

        {/* Stock nuevo */}
        <span ref={stockRef} className="new-stock-display">
          {hasProduct ? stockDisplay : <span style={{ color: 'var(--a-text-3)', fontSize: 13 }}>—</span>}
        </span>

        {/* Eliminar */}
        <button className="admin-btn-icon danger" onClick={() => onRemove(row.rowId)}>
          <Trash2 size={14} />
        </button>
      </div>

      {/* Formulario nuevo producto inline */}
      {row.isNew && (
        <div className="purchase-items-row" style={{ display: 'block', padding: 0 }}>
          <div className="new-product-inline">
            <div>
              <div className="new-product-label">Nombre</div>
              <input
                className="admin-input admin-input-sm"
                value={row.productName}
                onChange={e => onChange(row.rowId, { productName: e.target.value, query: e.target.value })}
                placeholder="Nombre del producto"
              />
            </div>
            <div>
              <div className="new-product-label">SKU</div>
              <input
                className="admin-input admin-input-sm mono"
                value={row.newSku}
                onChange={e => onChange(row.rowId, { newSku: e.target.value })}
                placeholder="Ej: PROD-001"
              />
            </div>
            <div>
              <div className="new-product-label">Categoría</div>
              <select
                className="admin-select"
                style={{ padding: '6px 28px 6px 10px', fontSize: 12 }}
                value={row.newCategoryId}
                onChange={e => onChange(row.rowId, { newCategoryId: e.target.value })}
              >
                <option value="">Sin categoría</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <div className="new-product-label">Precio de venta</div>
              <input
                className="admin-input admin-input-sm mono"
                placeholder="0"
                value={row.newBasePrice}
                onChange={e => onChange(row.rowId, { newBasePrice: e.target.value })}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span className="admin-badge admin-badge-warning" style={{ whiteSpace: 'nowrap' }}>
                Nuevo
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function ComprasPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [totalAmount, setTotalAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [rows, setRows] = useState<PurchaseRow[]>([emptyRow()])
  const [photoB64, setPhotoB64] = useState<string | null>(null)
  const [photoName, setPhotoName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [history, setHistory] = useState<PurchaseSummary[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [expandedPurchase, setExpandedPurchase] = useState<string | null>(null)
  const [purchaseDetail, setPurchaseDetail] = useState<any>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  // ── Init ──
  useEffect(() => {
    fetchSuppliers()
    fetchCategories()
    fetchHistory()
  }, [])

  async function fetchSuppliers() {
    try {
      const res = await fetch('/api/suppliers')
      const data = await res.json()
      setSuppliers(data.suppliers ?? [])
    } catch {}
  }

  async function fetchCategories() {
    try {
      const res = await fetch('/api/products?limit=0') // just for categories
      // Fetch categories from the category endpoint
      const res2 = await fetch('/api/products?limit=1')
      const data = await res2.json()
      // We need categories — fetch from a dedicated endpoint if it exists
      // For now we'll fetch them inline from product data's category
    } catch {}
    // Fetch categories
    try {
      const res = await fetch('/api/products?limit=50')
      const data = await res.json()
      const seen = new Set<string>()
      const cats: Category[] = []
      ;(data.products ?? []).forEach((p: any) => {
        if (p.category_id && !seen.has(p.category_id)) {
          seen.add(p.category_id)
          cats.push({ id: p.category_id, name: p.category_id })
        }
      })
      // Better: fetch from /api/categories if available
      const catRes = await fetch('/api/products?limit=1&_expand=categories').catch(() => null)
      setCategories(cats)
    } catch {}
  }

  async function fetchHistory() {
    setLoadingHistory(true)
    try {
      const res = await fetch('/api/purchases?limit=10')
      const data = await res.json()
      setHistory(data.purchases ?? [])
    } catch {} finally {
      setLoadingHistory(false)
    }
  }

  async function loadDetail(id: string) {
    if (expandedPurchase === id) { setExpandedPurchase(null); setPurchaseDetail(null); return }
    setExpandedPurchase(id)
    setPurchaseDetail(null)
    setLoadingDetail(true)
    try {
      const res = await fetch(`/api/purchases/${id}`)
      const data = await res.json()
      setPurchaseDetail(data)
    } catch {} finally {
      setLoadingDetail(false)
    }
  }

  // ── Toast helpers ──
  function toast(type: Toast['type'], msg: string) {
    const id = Date.now()
    setToasts(t => [...t, { id, type, msg }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4500)
  }

  // ── Row helpers ──
  const updateRow = useCallback((rowId: string, patch: Partial<PurchaseRow>) => {
    setRows(rs => rs.map(r => r.rowId === rowId ? { ...r, ...patch } : r))
  }, [])

  function addRow() { setRows(rs => [...rs, emptyRow()]) }
  function removeRow(rowId: string) { setRows(rs => rs.length > 1 ? rs.filter(r => r.rowId !== rowId) : rs) }

  // ── Photo upload ──
  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoName(file.name)
    const reader = new FileReader()
    reader.onload = () => setPhotoB64(reader.result as string)
    reader.readAsDataURL(file)
  }

  // ── Submit ──
  async function handleSubmit() {
    const validRows = rows.filter(r => (r.isExisting || r.isNew) && r.qty > 0)
    if (validRows.length === 0) { toast('error', 'Agrega al menos un producto válido'); return }
    if (!totalAmount || isNaN(parseFloat(totalAmount))) { toast('error', 'Ingresa el monto total de la compra'); return }

    const items = validRows.map(r => ({
      product_id: r.isExisting ? r.productId : null,
      product_name: r.productName,
      quantity: r.qty,
      purchase_price: parseFloat(r.purchasePrice) || 0,
      previous_stock: r.currentStock,
      new_stock: r.currentStock + r.qty,
      ...(r.isNew ? {
        new_product: {
          name: r.productName,
          sku: r.newSku || null,
          category_id: r.newCategoryId || null,
          base_price: parseFloat(r.newBasePrice) || 0,
        }
      } : {}),
    }))

    setSubmitting(true)
    try {
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier_id: selectedSupplier?.id ?? null,
          invoice_number: invoiceNumber.trim() || null,
          total_amount: parseFloat(totalAmount),
          invoice_photo: photoB64,
          notes: notes.trim() || null,
          items,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error desconocido')
      }

      toast('success', `Compra registrada con ${validRows.length} producto(s)`)
      // Reset form
      setSelectedSupplier(null)
      setInvoiceNumber('')
      setTotalAmount('')
      setNotes('')
      setRows([emptyRow()])
      setPhotoB64(null)
      setPhotoName('')
      fetchHistory()
    } catch (e: any) {
      toast('error', e.message || 'Error al registrar compra')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Computed totals ──
  const itemsTotal = rows.reduce((sum, r) => {
    const pp = parseFloat(r.purchasePrice) || 0
    return sum + (pp * r.qty)
  }, 0)

  const validProductCount = rows.filter(r => r.isExisting || r.isNew).length

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Page header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Registro de <span>Compras</span></h1>
          <p className="admin-page-subtitle">Registra nuevas compras a proveedores y actualiza el stock</p>
        </div>
        <button className="admin-btn admin-btn-primary admin-btn-lg" onClick={handleSubmit} disabled={submitting}>
          {submitting ? <span className="admin-spinner" /> : <CheckCircle2 size={16} />}
          {submitting ? 'Registrando…' : 'Finalizar Compra'}
        </button>
      </div>

      {/* ── FORMULARIO ── */}
      <div className="admin-panel">
        <div className="admin-panel-header">
          <span className="admin-panel-title">Datos de la Compra</span>
        </div>
        <div className="admin-panel-body">
          <div className="admin-form-grid cols-4">
            {/* Proveedor */}
            <div className="admin-form-field" style={{ gridColumn: 'span 2' }}>
              <label className="admin-label">Proveedor</label>
              <SupplierSelector
                suppliers={suppliers}
                selected={selectedSupplier}
                onSelect={setSelectedSupplier}
                onCreated={s => setSuppliers(prev => [...prev, s])}
              />
            </div>

            {/* N° Factura */}
            <div className="admin-form-field">
              <label className="admin-label">N° Factura / Folio</label>
              <input
                className="admin-input mono"
                placeholder="Ej: FAC-0001234"
                value={invoiceNumber}
                onChange={e => setInvoiceNumber(e.target.value)}
              />
            </div>

            {/* Monto total */}
            <div className="admin-form-field">
              <label className="admin-label">Monto Total</label>
              <input
                type="number"
                min="0"
                className="admin-input mono"
                placeholder="0"
                value={totalAmount}
                onChange={e => setTotalAmount(e.target.value)}
              />
            </div>
          </div>

          <div className="admin-form-grid cols-4 a-mt-4">
            {/* Notas */}
            <div className="admin-form-field" style={{ gridColumn: 'span 3' }}>
              <label className="admin-label">Notas (opcional)</label>
              <textarea
                className="admin-textarea"
                placeholder="Observaciones, condiciones de pago, etc."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            {/* Foto factura */}
            <div className="admin-form-field">
              <label className="admin-label">Foto Factura</label>
              <div className={`photo-upload-zone${photoB64 ? ' has-file' : ''}`}>
                <input type="file" accept="image/*,.pdf" onChange={handlePhoto} title="Subir foto de factura" />
                {photoB64
                  ? <>
                      {photoB64.startsWith('data:image') && (
                        <img src={photoB64} alt="Factura" className="photo-upload-preview" />
                      )}
                      <span className="photo-upload-text" style={{ color: 'var(--a-green)' }}>
                        ✓ {photoName}
                      </span>
                    </>
                  : <>
                      <Upload size={20} style={{ color: 'var(--a-text-3)' }} />
                      <span className="photo-upload-text">Subir foto o PDF</span>
                    </>
                }
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── PRODUCTOS ── */}
      <div className="admin-panel">
        <div className="admin-panel-header">
          <span className="admin-panel-title">
            Productos Comprados
            {validProductCount > 0 && (
              <span style={{ marginLeft: 8, color: 'var(--a-accent)', fontSize: 10 }}>
                {validProductCount} ítem{validProductCount !== 1 ? 's' : ''}
              </span>
            )}
          </span>
        </div>

        {/* Header columns */}
        <div className="purchase-items-container">
          <div className="purchase-items-table">
            <div className="purchase-items-head">
              <span className="purchase-col-label">Buscar Producto</span>
              <span className="purchase-col-label">Precio Venta</span>
              <span className="purchase-col-label">Stock Actual</span>
              <span className="purchase-col-label a-text-right">Cantidad</span>
              <span className="purchase-col-label a-text-right">Precio Compra</span>
              <span className="purchase-col-label" style={{ color: 'var(--a-cyan)' }}>Stock Nuevo</span>
              <span className="purchase-col-label"></span>
              <span></span>
            </div>

            {rows.map(row => (
              <ProductRow
                key={row.rowId}
                row={row}
                categories={categories}
                onChange={updateRow}
                onRemove={removeRow}
              />
            ))}
          </div>
        </div>

        {/* Add row */}
        <div style={{ padding: '10px 16px 14px' }}>
          <button className="add-row-btn" onClick={addRow}>
            <Plus size={13} /> Agregar producto
          </button>
        </div>

        {/* Totals bar */}
        <div className="purchase-totals-bar">
          <div>
            <div className="purchase-total-label">Total calculado (ítems)</div>
            <div style={{ fontSize: 12, color: 'var(--a-text-3)', fontFamily: 'var(--a-font-mono)', marginTop: 2 }}>
              Suma de precio compra × cantidad
            </div>
          </div>
          <div className="purchase-total-value">{fmt(itemsTotal)}</div>
        </div>
      </div>

      {/* ── HISTORIAL ── */}
      <div className="admin-panel">
        <div className="admin-panel-header">
          <span className="admin-panel-title">Historial Reciente</span>
          <button className="admin-btn-icon" onClick={fetchHistory} title="Actualizar">
            <RefreshCw size={13} />
          </button>
        </div>

        {loadingHistory ? (
          <div style={{ padding: 32, display: 'flex', justifyContent: 'center' }}>
            <span className="admin-spinner" />
          </div>
        ) : history.length === 0 ? (
          <div className="admin-empty">
            <Package size={32} className="admin-empty-icon" />
            <p className="admin-empty-text">Sin compras registradas aún</p>
          </div>
        ) : (
          <>
            {history.map(p => (
              <div key={p.id}>
                <div
                  className="purchase-history-row"
                  onClick={() => loadDetail(p.id)}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="admin-mono">{p.invoice_number ?? 'Sin folio'}</span>
                      {p.supplier_name && (
                        <span className="admin-badge admin-badge-info">{p.supplier_name}</span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--a-text-3)', marginTop: 3, fontFamily: 'var(--a-font-mono)' }}>
                      {new Date(p.purchased_at).toLocaleString('es-CL')}
                      {p.created_by_name && ` · ${p.created_by_name}`}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--a-font-display)', fontWeight: 800, color: 'var(--a-accent)' }}>
                      {fmt(parseFloat(p.total_amount))}
                    </div>
                  </div>
                  <button className="admin-btn-icon">
                    {expandedPurchase === p.id ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>

                {/* Detail expand */}
                {expandedPurchase === p.id && (
                  <div style={{ padding: '12px 20px 16px', background: 'var(--a-bg-2)', borderBottom: '1px solid var(--a-border)' }}>
                    {loadingDetail ? (
                      <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}>
                        <span className="admin-spinner" />
                      </div>
                    ) : purchaseDetail ? (
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Producto</th>
                            <th>Cantidad</th>
                            <th>P. Compra</th>
                            <th>Stock Ant.</th>
                            <th>Stock Nuevo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(purchaseDetail.items ?? []).map((item: any) => (
                            <tr key={item.id}>
                              <td>{item.product_name}</td>
                              <td className="admin-mono">{item.quantity}</td>
                              <td className="admin-mono">{fmt(parseFloat(item.purchase_price))}</td>
                              <td className="admin-mono">{item.previous_stock}</td>
                              <td style={{ fontFamily: 'var(--a-font-mono)', color: 'var(--a-cyan)' }}>
                                {item.new_stock}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : null}
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>

      <Toasts toasts={toasts} onRemove={id => setToasts(t => t.filter(x => x.id !== id))} />
    </>
  )
}
