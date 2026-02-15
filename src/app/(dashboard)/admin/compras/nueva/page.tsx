'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  type CurrencyFormatConfig,
  DEFAULT_CURRENCY_FORMAT,
  formatMoneyDisplay,
  formatMoneyInput,
  parseMoneyInput,
  resolveCurrencyFormat,
} from '@/lib/currency-format'
import {
  Plus, Trash2, ChevronDown, Upload, X, CheckCircle2,
  AlertCircle, Info,
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
  purchasePriceGross: string
  purchasePriceNet: string
}

interface Toast { id: number; type: 'success' | 'error' | 'info'; msg: string }

interface ExtraChargeRow {
  id: string
  description: string
  amountGross: string
  amountNet: string
}

// ─── Helpers ───────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 9)

const IVA_RATE = 0.19

function emptyRow(): PurchaseRow {
  return {
    rowId: uid(), query: '', results: [], showDropdown: false, searching: false,
    productId: null, productName: '', salePrice: 0, currentStock: 0, isExisting: false,
    isNew: false, newSku: '', newCategoryId: '', newBasePrice: '',
    qty: 1, purchasePriceGross: '', purchasePriceNet: '',
  }
}

function emptyExtraCharge(): ExtraChargeRow {
  return { id: uid(), description: '', amountGross: '', amountNet: '' }
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
  row, categories, currencyFormat, onChange, onRemove,
}: {
  row: PurchaseRow
  categories: Category[]
  currencyFormat: CurrencyFormatConfig
  onChange: (id: string, patch: Partial<PurchaseRow>) => void
  onRemove: (id: string) => void
}) {
  const searchTimer = useRef<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropPortalRef = useRef<HTMLDivElement>(null)
  const stockDisplay = row.currentStock + row.qty
  const prevNewStock = useRef(stockDisplay)
  const [dropPos, setDropPos] = useState<{ top: number; left: number; width: number } | null>(null)

  // Flash animation when stock changes
  const stockRef = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (prevNewStock.current !== stockDisplay && stockRef.current) {
      stockRef.current.classList.remove('flash')
      void stockRef.current.offsetWidth
      stockRef.current.classList.add('flash')
      prevNewStock.current = stockDisplay
    }
  }, [stockDisplay])

  // Posicionar el portal dropdown bajo el input
  useEffect(() => {
    if (row.showDropdown && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect()
      setDropPos({ top: rect.bottom + window.scrollY + 3, left: rect.left + window.scrollX, width: rect.width })
    }
  }, [row.showDropdown])

  // Cerrar dropdown al clickear fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        inputRef.current && !inputRef.current.contains(target) &&
        dropPortalRef.current && !dropPortalRef.current.contains(target)
      ) {
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
        const query = q.trim()
        const res = await fetch(`/api/products?search=${encodeURIComponent(query)}&limit=8&active=true`)
        const data = await res.json()
        const results: ProductHit[] = data.products ?? []
        const exactBarcodeMatches = results.filter((p) =>
          String(p.barcode ?? '').trim().toLowerCase() === query.toLowerCase()
        )

        if (exactBarcodeMatches.length === 1) {
          selectProduct(exactBarcodeMatches[0])
          onChange(row.rowId, { searching: false, showDropdown: false, results: [] })
          return
        }

        onChange(row.rowId, { results, searching: false })
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
      newBasePrice: formatMoneyInput(p.base_price, currencyFormat),
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
      productName: row.query.trim(),
      newSku: '',
      newCategoryId: '',
      newBasePrice: '',
      currentStock: 0,
    })
  }

  const hasProduct = row.isExisting || row.isNew
  function handlePurchaseGrossChange(value: string) {
    const grossInput = formatMoneyInput(value, currencyFormat)
    const gross = parseMoneyInput(grossInput, currencyFormat)
    onChange(row.rowId, {
      purchasePriceGross: grossInput,
      purchasePriceNet: grossInput.trim() === '' || Number.isNaN(gross)
        ? ''
        : formatMoneyInput(Math.round(gross / (1 + IVA_RATE)).toString(), currencyFormat),
    })
  }
  function handlePurchaseNetChange(value: string) {
    const netInput = formatMoneyInput(value, currencyFormat)
    const net = parseMoneyInput(netInput, currencyFormat)
    onChange(row.rowId, {
      purchasePriceNet: netInput,
      purchasePriceGross: netInput.trim() === '' || Number.isNaN(net)
        ? ''
        : formatMoneyInput(Math.round(net * (1 + IVA_RATE)).toString(), currencyFormat),
    })
  }

  return (
    <>
      <div className="purchase-items-row">
        {/* Búsqueda / nombre */}
        <div className="product-search-wrap">
          <input
            ref={inputRef}
            className={`admin-input admin-input-sm${row.isNew ? ' mono' : ''}`}
            placeholder="Nombre, SKU o código de barras…"
            value={row.query}
            onChange={e => handleSearch(e.target.value)}
            onFocus={() => { if (row.results.length > 0) onChange(row.rowId, { showDropdown: true }) }}
            readOnly={row.isExisting}
            style={row.isExisting ? { opacity: 0.7, cursor: 'default' } : {}}
          />
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

        {/* Dropdown via portal — se renderiza en body, sobre todo el layout */}
        {row.showDropdown && dropPos && typeof window !== 'undefined' && createPortal(
          <div
            ref={dropPortalRef}
            className="product-dropdown"
            style={{ position: 'absolute', top: dropPos.top, left: dropPos.left, width: dropPos.width, zIndex: 9999 }}
          >
            {row.searching && (
              <div style={{ padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'center', color: 'var(--a-text-3)', fontSize: 12 }}>
                <span className="admin-spinner" /> Buscando…
              </div>
            )}
            {!row.searching && row.results.map(p => (
              <div key={p.id} className="product-dropdown-item" onMouseDown={() => selectProduct(p)}>
                <div className="product-dropdown-item-name">{p.name}</div>
                <div className="product-dropdown-item-meta">
                  SKU: {p.sku} · Stock: {p.stock} · {formatMoneyDisplay(parseFloat(p.base_price), currencyFormat)}
                </div>
              </div>
            ))}
            {!row.searching && (
              <div className="product-dropdown-create" onMouseDown={createNew}>
                <Plus size={13} /> Crear: &ldquo;{row.query}&rdquo;
              </div>
            )}
          </div>,
          document.body
        )}

        {/* Precio de venta */}
        <div className="input-money-wrap">
          {hasProduct
            ? <input
                className="admin-input admin-input-sm mono"
                placeholder="Precio venta"
                value={row.newBasePrice}
                onChange={e => onChange(row.rowId, { newBasePrice: formatMoneyInput(e.target.value, currencyFormat) })}
              />
            : <span style={{ color: 'var(--a-text-3)' }}>—</span>}
        </div>

        {/* Stock actual */}
        <div className="purchase-current-data-cell">
          {hasProduct ? row.currentStock : <span style={{ color: 'var(--a-text-3)' }}>—</span>}
        </div>

        {/* Cantidad comprada */}
        <input
          type="number"
          min="1"
          className="admin-input admin-input-sm mono"
          style={{ textAlign: 'right' }}
          value={row.qty}
          onChange={e => onChange(row.rowId, { qty: Math.max(1, parseInt(e.target.value) || 1) })}
        />

        {/* Nuevo stock */}
        <span ref={stockRef} className="new-stock-display">
          {hasProduct ? stockDisplay : <span style={{ color: 'var(--a-text-3)', fontSize: 13 }}>—</span>}
        </span>

        {/* Precio compra neto */}
        <div className="input-money-wrap">
          <input
            type="text"
            inputMode="decimal"
            className="admin-input admin-input-sm mono"
            placeholder="0"
            style={{ textAlign: 'right' }}
            value={row.purchasePriceNet}
            onChange={e => handlePurchaseNetChange(e.target.value)}
          />
        </div>

        {/* Precio compra bruto */}
        <div className="input-money-wrap">
          <input
            type="text"
            inputMode="decimal"
            className="admin-input admin-input-sm mono"
            placeholder="0"
            style={{ textAlign: 'right' }}
            value={row.purchasePriceGross}
            onChange={e => handlePurchaseGrossChange(e.target.value)}
          />
        </div>

        {/* Eliminar */}
        <button className="admin-btn-icon danger" onClick={() => onRemove(row.rowId)}>
          <Trash2 size={14} />
        </button>
      </div>

    </>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function NuevaCompraPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [rows, setRows] = useState<PurchaseRow[]>([emptyRow()])
  const [extraCharges, setExtraCharges] = useState<ExtraChargeRow[]>([])
  const [photoB64, setPhotoB64] = useState<string | null>(null)
  const [photoName, setPhotoName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [currencyFormat, setCurrencyFormat] = useState<CurrencyFormatConfig>(DEFAULT_CURRENCY_FORMAT)

  // ── Init ──
  useEffect(() => {
    fetchSuppliers()
    fetchCategories()
    fetchSettings()
  }, [])

  async function fetchSettings() {
    try {
      const res = await fetch('/api/settings')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setCurrencyFormat(resolveCurrencyFormat((data.settings?.metadata ?? {}) as Record<string, unknown>))
    } catch {
      setCurrencyFormat(DEFAULT_CURRENCY_FORMAT)
    }
  }

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
  function updateExtraCharge(id: string, patch: Partial<ExtraChargeRow>) {
    setExtraCharges(items => items.map(item => item.id === id ? { ...item, ...patch } : item))
  }
  function addExtraCharge() { setExtraCharges(items => [...items, emptyExtraCharge()]) }
  function removeExtraCharge(id: string) { setExtraCharges(items => items.filter(item => item.id !== id)) }

  function handleExtraGrossChange(id: string, value: string) {
    const grossInput = formatMoneyInput(value, currencyFormat)
    const gross = parseMoneyInput(grossInput, currencyFormat)
    updateExtraCharge(id, {
      amountGross: grossInput,
      amountNet: grossInput.trim() === '' || Number.isNaN(gross)
        ? ''
        : formatMoneyInput(Math.round(gross / (1 + IVA_RATE)).toString(), currencyFormat),
    })
  }
  function handleExtraNetChange(id: string, value: string) {
    const netInput = formatMoneyInput(value, currencyFormat)
    const net = parseMoneyInput(netInput, currencyFormat)
    updateExtraCharge(id, {
      amountNet: netInput,
      amountGross: netInput.trim() === '' || Number.isNaN(net)
        ? ''
        : formatMoneyInput(Math.round(net * (1 + IVA_RATE)).toString(), currencyFormat),
    })
  }

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
    const unresolvedRows = rows.filter(r => !r.isExisting && !r.isNew && r.query.trim())
    if (unresolvedRows.length > 0) {
      toast('error', 'Hay productos sin seleccionar. Si no existe, usa "Crear" explícitamente.')
      return
    }

    const validRows = rows.filter(r => (r.isExisting || r.isNew) && r.qty > 0)
    if (validRows.length === 0) { toast('error', 'Agrega al menos un producto'); return }

    const items = validRows.map(r => ({
      product_id: r.isExisting ? r.productId : null,
      product_name: r.productName,
      quantity: r.qty,
      purchase_price: parseMoneyInput(r.purchasePriceGross, currencyFormat) || 0,
      sale_price: parseMoneyInput(r.newBasePrice, currencyFormat) || 0,
      previous_stock: r.currentStock,
      new_stock: r.currentStock + r.qty,
      ...(r.isNew ? {
        new_product: {
          name: r.productName,
          sku: r.newSku || null,
          category_id: r.newCategoryId || null,
          base_price: parseMoneyInput(r.newBasePrice, currencyFormat) || 0,
        }
      } : {}),
    }))
    const extra_items = extraCharges
      .map(item => ({
        description: item.description.trim(),
        amount_gross: parseMoneyInput(item.amountGross, currencyFormat) || 0,
        amount_net: parseMoneyInput(item.amountNet, currencyFormat) || 0,
      }))
      .filter(item => item.description && item.amount_gross > 0)

    setSubmitting(true)
    try {
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier_id: selectedSupplier?.id ?? null,
          invoice_number: invoiceNumber.trim() || null,
          total_amount: accumulatedGross,
          invoice_photo: photoB64,
          notes: notes.trim() || null,
          items,
          extra_items,
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
      setNotes('')
      setRows([emptyRow()])
      setExtraCharges([])
      setPhotoB64(null)
      setPhotoName('')
    } catch (e: any) {
      toast('error', e.message || 'Error al registrar compra')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Computed totals ──
  const productGrossTotal = rows.reduce((sum, r) => {
    const pp = parseMoneyInput(r.purchasePriceGross, currencyFormat) || 0
    return sum + (pp * r.qty)
  }, 0)
  const productNetTotal = rows.reduce((sum, r) => {
    const pp = parseMoneyInput(r.purchasePriceNet, currencyFormat) || 0
    return sum + (pp * r.qty)
  }, 0)
  const extrasGrossTotal = extraCharges.reduce((sum, item) => sum + (parseMoneyInput(item.amountGross, currencyFormat) || 0), 0)
  const extrasNetTotal = extraCharges.reduce((sum, item) => sum + (parseMoneyInput(item.amountNet, currencyFormat) || 0), 0)

  const accumulatedGross = productGrossTotal + extrasGrossTotal
  const accumulatedNet = productNetTotal + extrasNetTotal

  const validProductCount = rows.filter(r => r.isExisting || r.isNew).length

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Page header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Nueva <span>Compra</span></h1>
          <p className="admin-page-subtitle">Registra una nueva compra a proveedor y actualiza el stock</p>
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
          {/* Línea 1: Proveedor · N° Factura · Subir Factura */}
          <div className="admin-form-grid cols-3" style={{ alignItems: 'end' }}>
            <div className="admin-form-field">
              <label className="admin-label">Proveedor</label>
              <SupplierSelector
                suppliers={suppliers}
                selected={selectedSupplier}
                onSelect={setSelectedSupplier}
                onCreated={s => setSuppliers(prev => [...prev, s])}
              />
            </div>

            <div className="admin-form-field">
              <label className="admin-label">N° Factura / Folio</label>
              <input
                className="admin-input mono"
                placeholder="Ej: FAC-0001234"
                value={invoiceNumber}
                onChange={e => setInvoiceNumber(e.target.value)}
              />
            </div>

            <div className="admin-form-field">
              <label className="admin-label">Foto Factura</label>
              <div className={`photo-upload-zone photo-upload-sm${photoB64 ? ' has-file' : ''}`}>
                <input type="file" accept="image/*,.pdf" onChange={handlePhoto} title="Subir foto de factura" />
                {photoB64
                  ? <>
                      {photoB64.startsWith('data:image') && (
                        <img src={photoB64} alt="Factura" className="photo-upload-preview" />
                      )}
                      <span className="photo-upload-text" style={{ color: 'var(--a-green)' }}>✓ {photoName}</span>
                    </>
                  : <>
                      <Upload size={16} style={{ color: 'var(--a-text-3)' }} />
                      <span className="photo-upload-text">Subir foto o PDF</span>
                    </>
                }
              </div>
            </div>
          </div>

          {/* Línea 2: Notas */}
          <div className="admin-form-grid cols-1 a-mt-4">
            <div className="admin-form-field">
              <label className="admin-label">Notas (opcional)</label>
              <input
                className="admin-input"
                placeholder="Observaciones, condiciones de pago…"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
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
          <div className="purchase-items-scroll">
            <div className="purchase-items-table">
              <div className="purchase-items-head">
                <span className="purchase-col-label">Buscar Producto</span>
                <span className="purchase-col-label">Precio Venta Bruto</span>
                <span className="purchase-col-label">Stock Actual</span>
                <span className="purchase-col-label a-text-right">Cantidad Comprada</span>
                <span className="purchase-col-label" style={{ color: 'var(--a-cyan)' }}>Nuevo Stock</span>
                <span className="purchase-col-label a-text-right">Precio Compra Neto</span>
                <span className="purchase-col-label a-text-right">Precio Compra Bruto</span>
                <span className="purchase-col-label"></span>
              </div>

              {rows.map(row => (
                <ProductRow
                  key={row.rowId}
                  row={row}
                  categories={categories}
                  currencyFormat={currencyFormat}
                  onChange={updateRow}
                  onRemove={removeRow}
                />
              ))}
            </div>
          </div>

        </div>

        {/* Add row */}
        <div style={{ padding: '10px 16px 14px' }}>
          <button className="add-row-btn" onClick={addRow}>
            <Plus size={13} /> Agregar producto
          </button>
        </div>

        {/* Otros cargos no inventariables */}
        <div className="purchase-extra-panel">
          <div className="purchase-extra-header">
            <div className="purchase-total-label">Otros cargos de factura (no producto)</div>
            <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={addExtraCharge}>
              <Plus size={13} /> Agregar cargo
            </button>
          </div>

          {extraCharges.length === 0 ? (
            <div className="purchase-extra-empty">Sin cargos adicionales</div>
          ) : (
            <div className="purchase-extra-list">
              <div className="purchase-extra-columns">
                <span></span>
                <span className="purchase-col-label a-text-right">Precio Compra Neto</span>
                <span className="purchase-col-label a-text-right">Precio Compra Bruto</span>
                <span></span>
              </div>
              {extraCharges.map(item => (
                <div key={item.id} className="purchase-extra-row">
                  <input
                    className="admin-input admin-input-sm"
                    placeholder="Ej: Transporte, embalaje, comisión..."
                    value={item.description}
                    onChange={e => updateExtraCharge(item.id, { description: e.target.value })}
                  />
                  <div className="input-money-wrap">
                    <input
                      type="text"
                      inputMode="decimal"
                      className="admin-input admin-input-sm mono"
                      placeholder="0"
                      style={{ textAlign: 'right' }}
                      value={item.amountNet}
                      onChange={e => handleExtraNetChange(item.id, e.target.value)}
                    />
                  </div>
                  <div className="input-money-wrap">
                    <input
                      type="text"
                      inputMode="decimal"
                      className="admin-input admin-input-sm mono"
                      placeholder="0"
                      style={{ textAlign: 'right' }}
                      value={item.amountGross}
                      onChange={e => handleExtraGrossChange(item.id, e.target.value)}
                    />
                  </div>
                  <button className="admin-btn-icon danger" onClick={() => removeExtraCharge(item.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Totales */}
        <div className="purchase-totals-bar">
          <div className="purchase-reconcile-table">
            <div className="purchase-reconcile-head">
              <span>Resumen</span>
              <span className="a-text-right">Neto</span>
              <span className="a-text-right">Bruto</span>
              <span></span>
            </div>
            <div className="purchase-reconcile-row reconcile-row-total">
              <span>Total compra</span>
              <span className="a-text-right">{formatMoneyDisplay(accumulatedNet, currencyFormat)}</span>
              <span className="a-text-right">{formatMoneyDisplay(accumulatedGross, currencyFormat)}</span>
              <span></span>
            </div>
            <div className="purchase-reconcile-row muted">
              <span>
                Solo productos
                <span className="reconcile-row-note">ref. inventario</span>
              </span>
              <span className="a-text-right">{formatMoneyDisplay(productNetTotal, currencyFormat)}</span>
              <span className="a-text-right">{formatMoneyDisplay(productGrossTotal, currencyFormat)}</span>
              <span></span>
            </div>
            {extraCharges.length > 0 && (
              <div className="purchase-reconcile-row muted">
                <span>
                  Otros cargos
                  <span className="reconcile-row-note">no inventario</span>
                </span>
                <span className="a-text-right">{formatMoneyDisplay(extrasNetTotal, currencyFormat)}</span>
                <span className="a-text-right">{formatMoneyDisplay(extrasGrossTotal, currencyFormat)}</span>
                <span></span>
              </div>
            )}
          </div>
        </div>
      </div>

      <Toasts toasts={toasts} onRemove={id => setToasts(t => t.filter(x => x.id !== id))} />
    </>
  )
}
