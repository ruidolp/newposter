'use client'

import { type MouseEvent as ReactMouseEvent, useState, useEffect, useCallback, useRef } from 'react'
import {
  Plus, Search, X, CheckCircle2, AlertCircle, Info,
  Package, ChevronDown, ChevronUp,
  Tag, RefreshCw, Globe, EyeOff, Columns,
} from 'lucide-react'
import {
  type CurrencyFormatConfig,
  DEFAULT_CURRENCY_FORMAT,
  formatMoneyDisplay,
  formatMoneyInput,
  parseMoneyInput,
  resolveCurrencyFormat,
} from '@/lib/currency-format'

// ─── Types ──────────────────────────────────────────────────────────────────

interface Category { id: string; name: string }

interface Product {
  id: string
  name: string
  description: string | null
  sku: string
  barcode: string | null
  base_price: string
  cost: string | null
  stock: number
  low_stock_alert: number
  track_stock: boolean
  active: boolean
  category_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
  cost_history?: CostHistoryEntry[]
}

interface CostHistoryEntry {
  id: string
  source: 'PURCHASE' | 'MANUAL' | 'SYSTEM'
  previous_cost: string | null
  new_cost: string
  currency: string
  purchase_id: string | null
  supplier_id: string | null
  invoice_number: string | null
  reason: string | null
  created_by: string | null
  created_at: string
}

function isOnlineVisible(p: Product): boolean {
  if (!p.metadata || typeof p.metadata !== 'object') return true
  const v = (p.metadata as any).online_visible
  return v === undefined || v === null ? true : Boolean(v)
}

/** Returns all category IDs for a product (multi-cat aware) */
function productCategoryIds(p: Product): string[] {
  const fromMeta = (p.metadata as any)?.category_ids
  if (Array.isArray(fromMeta) && fromMeta.length > 0) return fromMeta as string[]
  if (p.category_id) return [p.category_id]
  return []
}

interface Toast { id: number; type: 'success' | 'error' | 'info'; msg: string }

type SortKey = 'name' | 'sku' | 'base_price' | 'stock' | 'created_at'

// ─── Column config ───────────────────────────────────────────────────────────

const COL_DEFS = [
  { id: 'sku',        label: 'SKU' },
  { id: 'category',   label: 'Categoría' },
  { id: 'venta_bruto', label: 'Venta Bruto' },
  { id: 'venta_neto',  label: 'Venta Neto' },
  { id: 'costo_bruto', label: 'Costo Bruto' },
  { id: 'costo_neto',  label: 'Costo Neto' },
  { id: 'stock',      label: 'Stock' },
  { id: 'ecommerce',  label: 'Ecommerce' },
  { id: 'estado',     label: 'Estado' },
] as const

type ColId = typeof COL_DEFS[number]['id']

const DEFAULT_COLS: ColId[] = ['sku','category','venta_bruto','venta_neto','costo_bruto','costo_neto','stock','ecommerce','estado']
const LS_KEY = 'vf_prod_cols'

function loadCols(): ColId[] {
  if (typeof window === 'undefined') return DEFAULT_COLS
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return DEFAULT_COLS
    const parsed = JSON.parse(raw) as ColId[]
    const valid = COL_DEFS.map(c => c.id)
    return parsed.filter(c => valid.includes(c))
  } catch { return DEFAULT_COLS }
}

function saveCols(cols: ColId[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(cols)) } catch {}
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)
}

function toInputNumberString(value: string | number | null | undefined, cfg: CurrencyFormatConfig) {
  if (value === null || value === undefined || value === '') return ''
  const parsed = Number(value)
  if (Number.isNaN(parsed)) return formatMoneyInput(String(value), cfg)
  if (cfg.decimal_places <= 0) return formatMoneyInput(String(Math.round(parsed)), cfg)
  return formatMoneyInput(parsed.toFixed(cfg.decimal_places), cfg)
}

function emptyForm() {
  return {
    name: '', description: '', sku: '', barcode: '',
    base_price: '', cost: '', stock: '0', low_stock_alert: '5',
    track_stock: true, active: true, online_visible: true,
    ecommerce_images: [] as string[],
    category_ids: [] as string[],
  }
}

// ─── Toast ──────────────────────────────────────────────────────────────────

function Toasts({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: number) => void }) {
  return (
    <div className="admin-toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`admin-toast ${t.type}`}>
          <span className={`admin-toast-icon ${t.type}`}>
            {t.type === 'success' ? <CheckCircle2 size={15} /> : t.type === 'error' ? <AlertCircle size={15} /> : <Info size={15} />}
          </span>
          <span className="admin-toast-msg">{t.msg}</span>
          <button className="admin-btn-icon" style={{ marginLeft: 'auto' }} onClick={() => onRemove(t.id)}><X size={13} /></button>
        </div>
      ))}
    </div>
  )
}

// ─── Column Selector ─────────────────────────────────────────────────────────

function ColSelector({ visible, onChange }: { visible: ColId[]; onChange: (c: ColId[]) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  function toggle(id: ColId) {
    const next = visible.includes(id) ? visible.filter(c => c !== id) : [...visible, id]
    // keep order stable
    const ordered = COL_DEFS.map(c => c.id).filter(c => next.includes(c)) as ColId[]
    onChange(ordered)
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className={`admin-btn admin-btn-sm admin-btn-secondary`}
        style={{ gap: 6, display: 'flex', alignItems: 'center' }}
        onClick={() => setOpen(o => !o)}
        title="Elegir qué datos mostrar en la tabla"
      >
        <Columns size={13} />
        Vista de tabla
        <ChevronDown size={11} style={{ opacity: 0.6 }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 200,
          background: 'var(--a-bg-1)', border: '1px solid var(--a-border)',
          borderRadius: 'var(--a-radius)', boxShadow: 'var(--a-shadow-lg)',
          padding: '8px 0', minWidth: 170,
        }}>
          <div style={{ padding: '4px 14px 8px', fontSize: 10, fontWeight: 700, letterSpacing: 1, color: 'var(--a-text-3)', textTransform: 'uppercase' }}>
            Datos visibles en tabla
          </div>
          {COL_DEFS.map(col => (
            <label key={col.id} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '5px 14px', cursor: 'pointer', fontSize: 12,
              color: 'var(--a-text-1)',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--a-bg-2)')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}
            >
              <input
                type="checkbox"
                checked={visible.includes(col.id)}
                onChange={() => toggle(col.id)}
                style={{ accentColor: 'var(--a-accent)', width: 13, height: 13 }}
              />
              {col.label}
            </label>
          ))}
          <div style={{ borderTop: '1px solid var(--a-border)', margin: '6px 0 2px', padding: '4px 14px 0' }}>
            <button
              className="admin-btn admin-btn-ghost admin-btn-sm"
              style={{ width: '100%', justifyContent: 'center', fontSize: 11 }}
              onClick={() => onChange(DEFAULT_COLS)}
            >
              Restablecer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── ProductModal ────────────────────────────────────────────────────────────

function ProductModal({
  product, categories, currencyFormat, onClose, onSaved,
}: {
  product: Product | null
  categories: Category[]
  currencyFormat: CurrencyFormatConfig
  onClose: () => void
  onSaved: (p: Product) => void
}) {
  const isEdit = !!product
  const [form, setForm] = useState(() =>
    product
      ? {
          name: product.name,
          description: product.description ?? '',
          sku: product.sku,
          barcode: product.barcode ?? '',
          base_price: toInputNumberString(product.base_price, currencyFormat),
          cost: toInputNumberString(product.cost, currencyFormat),
          stock: String(product.stock),
          low_stock_alert: String(product.low_stock_alert),
          track_stock: product.track_stock,
          active: product.active,
          online_visible: isOnlineVisible(product),
          ecommerce_images: Array.isArray((product.metadata as any)?.ecommerce_images)
            ? ((product.metadata as any).ecommerce_images as string[]).filter((x) => typeof x === 'string')
            : [],
          category_ids: productCategoryIds(product),
        }
      : emptyForm()
  )
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [costHistory, setCostHistory] = useState<CostHistoryEntry[]>(product?.cost_history ?? [])
  const [loadingCostHistory, setLoadingCostHistory] = useState<boolean>(Boolean(product && !product.cost_history))
  const [costDrawerOpen, setCostDrawerOpen] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [creatingCat, setCreatingCat] = useState(false)
  const [catSearch, setCatSearch] = useState('')
  const [localCategories, setLocalCategories] = useState(categories)
  const selectedCategories = localCategories.filter(c => form.category_ids.includes(c.id))
  const availableCategories = localCategories.filter(c =>
    !form.category_ids.includes(c.id) && c.name.toLowerCase().includes(catSearch.toLowerCase().trim())
  )

  function set(field: string, value: unknown) {
    setForm(f => ({ ...f, [field]: value }))
    setErrors(e => { const n = { ...e }; delete n[field]; return n })
  }

  function setMoney(field: 'base_price' | 'cost', value: string) {
    set(field, formatMoneyInput(value, currencyFormat))
  }

  async function handleAttachEcommerceImages(files: FileList | null) {
    if (!files || files.length === 0) return

    const list = Array.from(files).slice(0, 8)
    const encoded = await Promise.all(
      list.map((file) => new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result || ''))
        reader.onerror = () => reject(new Error('Error leyendo imagen'))
        reader.readAsDataURL(file)
      }))
    )

    setForm((f) => ({
      ...f,
      ecommerce_images: [...f.ecommerce_images, ...encoded].slice(0, 12),
    }))
  }

  function removeEcommerceImage(index: number) {
    setForm((f) => ({
      ...f,
      ecommerce_images: f.ecommerce_images.filter((_, i) => i !== index),
    }))
  }

  useEffect(() => {
    if (!isEdit || !product) return
    if (product.cost_history) {
      setCostHistory(product.cost_history)
      setLoadingCostHistory(false)
      return
    }
    let cancelled = false
    setLoadingCostHistory(true)
    fetch(`/api/products/${product.id}`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error('error')))
      .then(data => {
        if (!cancelled) {
          setCostHistory(data.cost_history ?? [])
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCostHistory([])
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingCostHistory(false)
        }
      })
    return () => { cancelled = true }
  }, [isEdit, product])

  function sourceLabel(source: CostHistoryEntry['source']) {
    if (source === 'PURCHASE') return 'Compra'
    if (source === 'MANUAL') return 'Ajuste manual'
    return 'Sistema'
  }

  const currentCostValue = product?.cost === null || product?.cost === undefined || Number.isNaN(Number(product?.cost))
    ? null
    : Number(product.cost)
  const actualEntryId = currentCostValue === null
    ? null
    : (costHistory.find((entry) => Number(entry.new_cost) === currentCostValue)?.id ?? null)

  function toggleCat(id: string) {
    setForm(f => {
      const ids = f.category_ids.includes(id)
        ? f.category_ids.filter(c => c !== id)
        : [...f.category_ids, id]
      return { ...f, category_ids: ids }
    })
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Nombre requerido'
    if (!form.sku.trim()) e.sku = 'SKU requerido'
    if (!form.base_price || parseMoneyInput(form.base_price, currencyFormat) <= 0) e.base_price = 'Precio inválido'
    return e
  }

  async function handleSave() {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setSaving(true)
    try {
      const existingMeta = (product?.metadata as any) ?? {}
      const body = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        sku: form.sku.trim(),
        barcode: form.barcode.trim() || null,
        base_price: parseMoneyInput(form.base_price, currencyFormat),
        cost: form.cost ? parseMoneyInput(form.cost, currencyFormat) : null,
        stock: parseInt(form.stock) || 0,
        low_stock_alert: parseInt(form.low_stock_alert) || 5,
        track_stock: form.track_stock,
        active: form.active,
        category_id: form.category_ids[0] ?? null,
        metadata: {
          ...existingMeta,
          online_visible: form.online_visible,
          ecommerce_images: form.ecommerce_images,
          category_ids: form.category_ids,
        },
      }
      const res = await fetch(
        isEdit ? `/api/products/${product!.id}` : '/api/products',
        { method: isEdit ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
      )
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al guardar')
      }
      const saved = await res.json()
      onSaved(saved)
    } catch (e: any) {
      setErrors({ _global: e.message })
    } finally {
      setSaving(false)
    }
  }

  async function handleCreateCat() {
    if (!newCatName.trim()) return
    setCreatingCat(true)
    try {
      const res = await fetch('/api/categories', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCatName.trim() }),
      })
      if (!res.ok) throw new Error()
      const cat = await res.json()
      setLocalCategories(c => [...c, cat])
      setForm(f => ({ ...f, category_ids: [...f.category_ids, cat.id] }))
      setNewCatName('')
    } catch {} finally {
      setCreatingCat(false)
    }
  }

  return (
    <div className="admin-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="admin-modal" style={{ maxWidth: 980, width: 'min(980px, 96vw)', position: 'relative', overflow: 'hidden' }}>
        <div className="admin-modal-header">
          <span className="admin-modal-title">{isEdit ? 'Editar Producto' : 'Nuevo Producto'}</span>
          <button className="admin-btn-icon" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="admin-modal-body" style={{ maxHeight: '78vh', overflowY: 'auto' }}>
          {errors._global && (
            <div className="prod-error-banner"><AlertCircle size={14} /> {errors._global}</div>
          )}

          <div style={{ borderBottom: '1px solid var(--a-border)', marginBottom: 14, paddingBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--a-text-1)' }}>
                GENERAL
              </div>
              <label className="prod-toggle-label" style={{ marginLeft: 'auto' }}>
                <button
                  type="button"
                  className={`prod-toggle${form.active ? ' on' : ''}`}
                  onClick={() => set('active', !form.active)}
                  aria-label="Disponibilidad del producto"
                />
                <span>{form.active ? 'DISPONIBLE' : 'NO DISPONIBLE'}</span>
              </label>
            </div>
            <div className="admin-form-grid cols-2 a-mt-4" style={{ alignItems: 'end' }}>
              <div className="admin-form-field">
                <label className="admin-label">Nombre del producto *</label>
                <input className={`admin-input${errors.name ? ' input-error' : ''}`} value={form.name}
                  onChange={e => set('name', e.target.value)} placeholder="Ej: Bebida Cola 500ml" />
                {errors.name && <span className="field-error">{errors.name}</span>}
              </div>
              <div className="admin-form-field">
                <label className="admin-label">SKU *</label>
                <input className={`admin-input mono${errors.sku ? ' input-error' : ''}`} value={form.sku}
                  onChange={e => set('sku', e.target.value)} placeholder="Ej: BEB-001" />
                {errors.sku && <span className="field-error">{errors.sku}</span>}
              </div>
            </div>
            <div className="admin-form-grid cols-2 a-mt-4">
              <div className="admin-form-field">
                <label className="admin-label">Código de Barras</label>
                <input className="admin-input mono" value={form.barcode}
                  onChange={e => set('barcode', e.target.value)} placeholder="Ej: 7801234567890" />
              </div>
            </div>

            <div className="admin-form-field a-mt-4">
              <label className="admin-label">Categorías</label>
              <div className="prod-cat-selector">
                <div className="prod-cat-selected-row">
                  {selectedCategories.length === 0 ? (
                    <span className="prod-cat-empty">Sin categorías seleccionadas</span>
                  ) : (
                    selectedCategories.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        className="prod-cat-chip selected"
                        onClick={() => toggleCat(c.id)}
                        title={`Quitar ${c.name}`}
                      >
                        {c.name}
                        <X size={12} />
                      </button>
                    ))
                  )}
                  {selectedCategories.length > 0 && (
                    <button
                      type="button"
                      className="prod-cat-clear"
                      onClick={() => set('category_ids', [])}
                    >
                      Limpiar
                    </button>
                  )}
                </div>

                <div className="prod-cat-search-wrap">
                  <Search size={13} className="prod-cat-search-icon" />
                  <input
                    className="admin-input admin-input-sm prod-cat-search"
                    placeholder="Buscar categoría..."
                    value={catSearch}
                    onChange={e => setCatSearch(e.target.value)}
                  />
                </div>

                <div className="prod-cat-options">
                  {localCategories.length === 0 ? (
                    <div className="prod-cat-empty">Sin categorías aún</div>
                  ) : availableCategories.length === 0 ? (
                    <div className="prod-cat-empty">No hay coincidencias</div>
                  ) : (
                    availableCategories.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        className="prod-cat-chip"
                        onClick={() => toggleCat(c.id)}
                      >
                        <Plus size={11} />
                        {c.name}
                      </button>
                    ))
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <input className="admin-input admin-input-sm" placeholder="Nueva categoría…" value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreateCat()}
                  style={{ flex: 1 }} />
                <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={handleCreateCat}
                  disabled={creatingCat || !newCatName.trim()}>
                  {creatingCat ? <span className="admin-spinner" /> : <Plus size={13} />}
                </button>
              </div>
            </div>
          </div>

          <div style={{ borderBottom: '1px solid var(--a-border)', marginBottom: 14, paddingBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--a-text-1)' }}>
                PRECIOS
              </div>
            </div>
            <div className="admin-form-grid cols-2 a-mt-3">
              <div className="admin-form-field">
                <label className="admin-label">Precio Venta Bruto *</label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute',
                    left: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--a-text-3)',
                    fontSize: 12,
                    fontFamily: 'var(--a-font-mono)',
                    pointerEvents: 'none',
                  }}>
                    {currencyFormat.currency_symbol || '$'}
                  </span>
                  <input type="text" inputMode="decimal" className={`admin-input mono${errors.base_price ? ' input-error' : ''}`}
                    style={{ paddingLeft: 24 }}
                    value={form.base_price} onChange={e => setMoney('base_price', e.target.value)} placeholder="0" />
                </div>
                {errors.base_price && <span className="field-error">{errors.base_price}</span>}
                {form.base_price && parseMoneyInput(form.base_price, currencyFormat) > 0 && (
                  <span style={{ fontSize: 11, color: 'var(--a-text-3)', marginTop: 2, display: 'block' }}>
                    PRECIO VENTA NETO: {formatMoneyDisplay(Math.round(parseMoneyInput(form.base_price, currencyFormat) / 1.19), currencyFormat)}
                  </span>
                )}
              </div>
              <div className="admin-form-field">
                <label className="admin-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span>Costo Producto Bruto</span>
                  {isEdit && (
                    <button
                      type="button"
                      className="admin-btn admin-btn-ghost admin-btn-sm"
                      style={{ padding: 0, minHeight: 'unset', border: 'none', color: 'var(--a-accent)', fontSize: 11, fontWeight: 700 }}
                      onClick={() => setCostDrawerOpen(true)}
                    >
                      PRECIOS HISTORIAL COSTOS
                    </button>
                  )}
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute',
                    left: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--a-text-3)',
                    fontSize: 12,
                    fontFamily: 'var(--a-font-mono)',
                    pointerEvents: 'none',
                  }}>
                    {currencyFormat.currency_symbol || '$'}
                  </span>
                  <input type="text" inputMode="decimal" className="admin-input mono" style={{ paddingLeft: 24 }} value={form.cost}
                    onChange={e => setMoney('cost', e.target.value)} placeholder="0" />
                </div>
                {form.cost && parseMoneyInput(form.cost, currencyFormat) > 0 && (
                  <span style={{ fontSize: 11, color: 'var(--a-text-3)', marginTop: 2, display: 'block' }}>
                    COSTO NETO: {formatMoneyDisplay(Math.round(parseMoneyInput(form.cost, currencyFormat) / 1.19), currencyFormat)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={{ borderBottom: '1px solid var(--a-border)', marginBottom: 14, paddingBottom: 10 }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--a-text-1)' }}>
              INVENTARIO
            </div>
            <div className="admin-form-grid cols-2 a-mt-3">
              <div className="admin-form-field">
                <label className="admin-label">Stock actual</label>
                <input type="number" min="0" className="admin-input mono" value={form.stock}
                  onChange={e => set('stock', e.target.value)} />
              </div>
              <div className="admin-form-field">
                <label className="admin-label">Alerta Stock Bajo</label>
                <input type="number" min="0" className="admin-input mono" value={form.low_stock_alert}
                  onChange={e => set('low_stock_alert', e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 24, paddingTop: 10, flexWrap: 'wrap' }}>
              <label className="prod-toggle-label">
                <button type="button" className={`prod-toggle${form.track_stock ? ' on' : ''}`}
                  onClick={() => set('track_stock', !form.track_stock)} aria-label="Control de stock" />
                <span>Controlar stock</span>
              </label>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--a-text-1)' }}>
              ECOMMERCE
            </div>
            <div className="admin-form-grid cols-2 a-mt-3">
              <div className="admin-form-field">
                <label className="admin-label">Descripción Web</label>
                <textarea className="admin-textarea" rows={3} value={form.description}
                  onChange={e => set('description', e.target.value)} placeholder="Descripción visible en ecommerce…" />
              </div>
              <div className="admin-form-field">
                <label className="admin-label">Adjuntar imágenes</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="admin-input"
                  onChange={(e) => {
                    handleAttachEcommerceImages(e.target.files)
                    e.currentTarget.value = ''
                  }}
                />
                <span style={{ marginTop: 4, fontSize: 11, color: 'var(--a-text-3)' }}>
                  Hasta 12 imágenes
                </span>
                {form.ecommerce_images.length > 0 && (
                  <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
                    {form.ecommerce_images.map((src, idx) => (
                      <div key={`${idx}-${src.slice(0, 20)}`} style={{ position: 'relative' }}>
                        <img
                          src={src}
                          alt={`Producto ${idx + 1}`}
                          style={{
                            width: '100%',
                            height: 74,
                            objectFit: 'cover',
                            borderRadius: 'var(--a-radius-sm)',
                            border: '1px solid var(--a-border)',
                          }}
                        />
                        <button
                          type="button"
                          className="admin-btn-icon"
                          style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.5)', color: '#fff' }}
                          onClick={() => removeEcommerceImage(idx)}
                          title="Quitar imagen"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 24, paddingTop: 12, flexWrap: 'wrap' }}>
              <label className="prod-toggle-label">
                <button type="button" className={`prod-toggle${form.online_visible ? ' on' : ''}`}
                  onClick={() => set('online_visible', !form.online_visible)} aria-label="Visible ecommerce" />
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {form.online_visible ? <Globe size={12} style={{ color: 'var(--a-accent)' }} /> : <EyeOff size={12} style={{ color: 'var(--a-text-3)' }} />}
                  VISIBLE ECOMMERCE
                </span>
              </label>
            </div>
          </div>
        </div>

        <div className="admin-modal-footer">
          <button className="admin-btn admin-btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="admin-btn admin-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <span className="admin-spinner" /> : <CheckCircle2 size={15} />}
            {saving ? 'Guardando…' : isEdit ? 'Guardar Cambios' : 'Crear Producto'}
          </button>
        </div>

        {isEdit && costDrawerOpen && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(10, 14, 26, 0.34)',
              zIndex: 20,
            }}
            onClick={() => setCostDrawerOpen(false)}
          />
        )}

        {isEdit && (
          <aside
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              height: '100%',
              width: 'min(560px, 100%)',
              borderLeft: '1px solid var(--a-border)',
              background: 'var(--a-bg-1)',
              transform: costDrawerOpen ? 'translateX(0)' : 'translateX(102%)',
              transition: 'transform .22s ease',
              zIndex: 21,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div className="admin-modal-header" style={{ borderBottom: '1px solid var(--a-border)' }}>
              <span className="admin-modal-title">Historial de costos</span>
              <button className="admin-btn-icon" onClick={() => setCostDrawerOpen(false)}><X size={16} /></button>
            </div>
            <div style={{ padding: '10px 12px', fontSize: 11, color: 'var(--a-text-3)', borderBottom: '1px solid var(--a-border)' }}>
              Registros más recientes primero
            </div>
            <div style={{ flex: 1, overflowY: 'auto', background: 'var(--a-bg-2)' }}>
              {loadingCostHistory ? (
                <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--a-text-3)' }}>
                  Cargando historial...
                </div>
              ) : costHistory.length === 0 ? (
                <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--a-text-3)' }}>
                  Sin historial de costos registrado.
                </div>
              ) : (
                <div>
                  {costHistory.map(entry => {
                    const prev = entry.previous_cost === null ? null : Number(entry.previous_cost)
                    const next = Number(entry.new_cost)
                    const purchaseRef = entry.invoice_number || entry.purchase_id
                    return (
                      <div key={entry.id} style={{ padding: '10px 12px', borderBottom: '1px solid var(--a-border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--a-text-1)' }}>{sourceLabel(entry.source)}</span>
                            {actualEntryId === entry.id && (
                              <span className="admin-badge admin-badge-success" style={{ fontSize: 10 }}>
                                ACTUAL
                              </span>
                            )}
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--a-text-3)' }}>{new Date(entry.created_at).toLocaleString('es-CL')}</span>
                        </div>
                        <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                          <span style={{ fontSize: 11, color: 'var(--a-text-3)', fontFamily: 'var(--a-font-mono)' }}>
                            Anterior: {prev === null ? '—' : formatMoneyDisplay(prev, currencyFormat)}
                          </span>
                          <span style={{ fontSize: 12, color: 'var(--a-text-1)', fontFamily: 'var(--a-font-mono)', fontWeight: 700 }}>
                            Nuevo: {formatMoneyDisplay(next, currencyFormat)}
                          </span>
                        </div>
                        {(entry.invoice_number || entry.reason) && (
                          <div style={{ marginTop: 4, fontSize: 11, color: 'var(--a-text-2)' }}>
                            {entry.source === 'PURCHASE' && entry.purchase_id && purchaseRef ? (
                              <>
                                Actualizado por compra{' '}
                                <a
                                  href={`/admin/compras/historial?purchase_id=${entry.purchase_id}`}
                                  style={{ color: 'var(--a-accent)', textDecoration: 'underline' }}
                                >
                                  {purchaseRef}
                                </a>
                              </>
                            ) : null}
                            {entry.reason && !(entry.purchase_id && purchaseRef) ? entry.reason : null}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}

// ─── StockModal ──────────────────────────────────────────────────────────────

function StockModal({ product, onClose, onSaved }: {
  product: Product; onClose: () => void; onSaved: (p: Product) => void
}) {
  const [qty, setQty] = useState('')
  const [type, setType] = useState<'add' | 'set'>('add')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    const n = parseInt(qty)
    if (isNaN(n)) return
    setSaving(true)
    try {
      const newStock = type === 'add' ? product.stock + n : n
      const res = await fetch(`/api/products/${product.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: Math.max(0, newStock) }),
      })
      if (!res.ok) throw new Error()
      const saved = await res.json()
      onSaved(saved)
    } catch {} finally {
      setSaving(false)
    }
  }

  const preview = qty !== ''
    ? type === 'add' ? product.stock + (parseInt(qty) || 0) : (parseInt(qty) || 0)
    : product.stock

  return (
    <div className="admin-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="admin-modal" style={{ maxWidth: 380 }}>
        <div className="admin-modal-header">
          <span className="admin-modal-title">Ajustar Stock</span>
          <button className="admin-btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="admin-modal-body">
          <div style={{ marginBottom: 16, padding: '10px 14px', background: 'var(--a-bg-2)', borderRadius: 'var(--a-radius)', fontFamily: 'var(--a-font-mono)', fontSize: 12 }}>
            <div style={{ color: 'var(--a-text-3)' }}>Producto</div>
            <div style={{ fontWeight: 600, color: 'var(--a-text-1)', marginTop: 2 }}>{product.name}</div>
            <div style={{ color: 'var(--a-text-2)', marginTop: 4 }}>Stock actual: <strong>{product.stock}</strong></div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {(['add', 'set'] as const).map(t => (
              <button key={t} className={`admin-btn admin-btn-sm ${type === t ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
                onClick={() => setType(t)} style={{ flex: 1 }}>
                {t === 'add' ? '+ Agregar / quitar' : 'Establecer valor'}
              </button>
            ))}
          </div>

          <div className="admin-form-field">
            <label className="admin-label">{type === 'add' ? 'Cantidad (usa negativo para restar)' : 'Nuevo stock'}</label>
            <input type="number" className="admin-input mono" value={qty} onChange={e => setQty(e.target.value)}
              placeholder={type === 'add' ? 'Ej: 10 o -5' : 'Ej: 50'} autoFocus />
          </div>

          {qty !== '' && (
            <div style={{ marginTop: 12, textAlign: 'center', fontSize: 13 }}>
              <span style={{ color: 'var(--a-text-2)' }}>Resultado: </span>
              <span style={{ fontFamily: 'var(--a-font-mono)', fontWeight: 700, fontSize: 20,
                color: preview < (product.low_stock_alert || 5) ? 'var(--a-red)' : 'var(--a-green)' }}>
                {Math.max(0, preview)}
              </span>
            </div>
          )}
        </div>
        <div className="admin-modal-footer">
          <button className="admin-btn admin-btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="admin-btn admin-btn-primary" onClick={handleSave} disabled={saving || qty === ''}>
            {saving ? <span className="admin-spinner" /> : 'Actualizar Stock'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function ProductosPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [filterMode, setFilterMode] = useState<'active' | 'inactive' | 'all' | 'ecommerce' | 'low_stock'>('active')
  const [sortKey, setSortKey] = useState<SortKey>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [toasts, setToasts] = useState<Toast[]>([])
  const [stockProduct, setStockProduct] = useState<Product | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 30
  const [modalOpen, setModalOpen] = useState(false)
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; product: Product | null }>({ mode: 'create', product: null })
  const [currencyFormat, setCurrencyFormat] = useState<CurrencyFormatConfig>(DEFAULT_CURRENCY_FORMAT)

  // Column visibility — loaded from localStorage on mount
  const [visibleCols, setVisibleCols] = useState<ColId[]>(DEFAULT_COLS)
  useEffect(() => { setVisibleCols(loadCols()) }, [])
  function updateCols(cols: ColId[]) { setVisibleCols(cols); saveCols(cols) }

  function toast(type: Toast['type'], msg: string) {
    const id = Date.now()
    setToasts(t => [...t, { id, type, msg }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4500)
  }

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '200' })
      if (search) params.set('search', search)
      if (filterCat) params.set('category_id', filterCat)
      if (filterMode === 'active' || filterMode === 'inactive') {
        params.set('active', filterMode === 'active' ? 'true' : 'false')
      }
      const res = await fetch(`/api/products?${params}`)
      const data = await res.json()
      setProducts(data.products ?? [])
    } catch { toast('error', 'Error al cargar productos') } finally { setLoading(false) }
  }, [search, filterCat, filterMode])

  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(d => setCategories(d.categories ?? []))
  }, [])

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.ok ? r.json() : Promise.reject(new Error('error')))
      .then((data) => {
        setCurrencyFormat(resolveCurrencyFormat((data.settings?.metadata ?? {}) as Record<string, unknown>))
      })
      .catch(() => {
        setCurrencyFormat(DEFAULT_CURRENCY_FORMAT)
      })
  }, [])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  useEffect(() => {
    const validIds = new Set(products.map((p) => p.id))
    setSelectedIds((prev) => prev.filter((id) => validIds.has(id)))
    setLastSelectedId((prev) => (prev && validIds.has(prev) ? prev : null))
  }, [products])

  function openCreate() { setModal({ mode: 'create', product: null }); setModalOpen(true) }
  function openEdit(p: Product) { setModal({ mode: 'edit', product: p }); setModalOpen(true) }
  function closeModal() { setModalOpen(false) }

  function handleSaved(saved: Product) {
    setProducts(ps => {
      const idx = ps.findIndex(p => p.id === saved.id)
      if (idx >= 0) { const n = [...ps]; n[idx] = saved; return n }
      return [saved, ...ps]
    })
    toast('success', modal.mode === 'create' ? `Producto "${saved.name}" creado` : 'Producto actualizado')
    closeModal()
  }

  async function toggleActive(p: Product) {
    try {
      const res = await fetch(`/api/products/${p.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !p.active }),
      })
      if (!res.ok) throw new Error()
      const saved = await res.json()
      setProducts(ps => ps.map(x => x.id === saved.id ? saved : x))
      toast('info', saved.active ? 'Producto activado' : 'Producto desactivado')
    } catch { toast('error', 'Error al actualizar') }
  }

  async function toggleOnline(p: Product) {
    const current = isOnlineVisible(p)
    const newMeta = { ...(p.metadata ?? {}), online_visible: !current }
    try {
      const res = await fetch(`/api/products/${p.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadata: newMeta }),
      })
      if (!res.ok) throw new Error()
      const saved = await res.json()
      setProducts(ps => ps.map(x => x.id === saved.id ? saved : x))
      toast('info', !current ? 'Producto visible online' : 'Producto oculto online')
    } catch { toast('error', 'Error al actualizar') }
  }

  function handleStockSaved(saved: Product) {
    setProducts(ps => ps.map(p => p.id === saved.id ? saved : p))
    toast('success', `Stock actualizado: ${saved.stock} unidades`)
    setStockProduct(null)
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const filtered = products.filter(p => {
    if (filterMode === 'ecommerce') return isOnlineVisible(p)
    if (filterMode === 'low_stock') return p.track_stock && p.stock <= (p.low_stock_alert || 5)
    return true
  })

  const sorted = [...filtered].sort((a, b) => {
    let va: any = a[sortKey], vb: any = b[sortKey]
    if (sortKey === 'base_price') { va = parseFloat(va); vb = parseFloat(vb) }
    if (va < vb) return sortDir === 'asc' ? -1 : 1
    if (va > vb) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE)

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return null
    return sortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />
  }

  const catMap = Object.fromEntries(categories.map(c => [c.id, c.name]))
  const show = (id: ColId) => visibleCols.includes(id)
  const selectedCount = selectedIds.length

  function clearSelection() {
    setSelectedIds([])
    setLastSelectedId(null)
  }

  function handleRowClick(
    e: ReactMouseEvent<HTMLTableRowElement>,
    row: Product,
    rowIndex: number
  ) {
    const withModifiers = e.metaKey || e.ctrlKey || e.shiftKey
    if (!withModifiers) {
      openEdit(row)
      return
    }

    e.preventDefault()
    e.stopPropagation()

    if (e.shiftKey && lastSelectedId) {
      const anchorIndex = paginated.findIndex((p) => p.id === lastSelectedId)
      if (anchorIndex >= 0) {
        const [start, end] = [anchorIndex, rowIndex].sort((a, b) => a - b)
        const rangeIds = paginated.slice(start, end + 1).map((p) => p.id)
        setSelectedIds((prev) => Array.from(new Set([...prev, ...rangeIds])))
        setLastSelectedId(row.id)
        return
      }
    }

    setSelectedIds((prev) => {
      if (prev.includes(row.id)) return prev.filter((id) => id !== row.id)
      return [...prev, row.id]
    })
    setLastSelectedId(row.id)
  }

  async function handleBulkDelete() {
    if (selectedCount === 0) return
    const confirmed = window.confirm(
      `¿Eliminar ${selectedCount} producto(s)?\n\nSe desactivarán (eliminación lógica).`
    )
    if (!confirmed) return

    let okCount = 0
    let failCount = 0

    for (const id of selectedIds) {
      try {
        const res = await fetch(`/api/products/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ active: false }),
        })
        if (res.ok) okCount += 1
        else failCount += 1
      } catch {
        failCount += 1
      }
    }

    clearSelection()
    await fetchProducts()

    if (okCount > 0) toast('success', `${okCount} producto(s) desactivado(s)`)
    if (failCount > 0) toast('error', `${failCount} producto(s) no se pudieron desactivar`)
  }

  return (
    <>
      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Gestión de <span>Productos</span></h1>
          <p className="admin-page-subtitle">{products.length} producto{products.length !== 1 ? 's' : ''} · Haz click en una fila para editar</p>
        </div>
        <button className="admin-btn admin-btn-primary admin-btn-lg" onClick={openCreate}>
          <Plus size={16} /> Nuevo Producto
        </button>
      </div>

      {/* Filtros */}
      <div className="admin-panel">
        <div className="admin-panel-body" style={{ padding: '14px 20px' }}>
          <div className="prod-filters-top">
            {/* Buscador */}
            <div style={{ position: 'relative', minWidth: 180 }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--a-text-3)', pointerEvents: 'none' }} />
              <input
                className="admin-input admin-input-sm"
                style={{ paddingLeft: 30 }}
                placeholder="Buscar nombre, SKU o código…"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
              />
            </div>

            <button className="admin-btn-icon" onClick={fetchProducts} title="Actualizar">
              <RefreshCw size={13} />
            </button>
          </div>

          <div className="prod-filters-bottom">
            {/* Categoría */}
            <div className="prod-filter-group">
              <span style={{ fontSize: 10, color: 'var(--a-text-3)', fontWeight: 600, letterSpacing: 0.3 }}>
                Filtrar por categoría
              </span>
              <select
                className="admin-select prod-filter-select"
                value={filterCat}
                onChange={e => { setFilterCat(e.target.value); setPage(1) }}
              >
                <option value="">Todas las categorías</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {/* Modo / Estado */}
            <div className="prod-filter-group">
              <span style={{ fontSize: 10, color: 'var(--a-text-3)', fontWeight: 600, letterSpacing: 0.3 }}>
                Filtrar por estado o condición
              </span>
              <select
                className="admin-select prod-filter-select"
                value={filterMode}
                onChange={e => { setFilterMode(e.target.value as typeof filterMode); setPage(1) }}
              >
                <option value="active">Activos</option>
                <option value="inactive">Inactivos</option>
                <option value="all">Todos</option>
                <option value="ecommerce">Ecommerce</option>
                <option value="low_stock">Stock Bajo</option>
              </select>
            </div>

            {/* Column selector */}
            <div className="prod-filter-group" style={{ marginLeft: 'auto' }}>
              <span style={{ fontSize: 10, color: 'var(--a-text-3)', fontWeight: 600, letterSpacing: 0.3 }}>
                Personalizar tabla
              </span>
              <ColSelector visible={visibleCols} onChange={updateCols} />
            </div>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="admin-panel">
        <div className="admin-panel-header">
          <span className="admin-panel-title">
            Productos
            {sorted.length > 0 && <span style={{ marginLeft: 8, color: 'var(--a-accent)', fontSize: 10 }}>{sorted.length} resultados</span>}
          </span>
          <span style={{ fontSize: 11, color: 'var(--a-text-3)' }}>
            Selección: <strong>Shift + click</strong> o <strong>Ctrl/Cmd + click</strong>
          </span>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
            <span className="admin-spinner" style={{ width: 24, height: 24, borderWidth: 3 }} />
          </div>
        ) : sorted.length === 0 ? (
          <div className="admin-empty">
            <Package size={36} className="admin-empty-icon" />
            <p className="admin-empty-text">No hay productos{search ? ` para "${search}"` : ''}</p>
            <button className="admin-btn admin-btn-primary" style={{ marginTop: 16 }} onClick={openCreate}>
              <Plus size={14} /> Crear primer producto
            </button>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  {/* Nombre always visible */}
                  <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort('name')}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>Nombre <SortIcon k="name" /></span>
                  </th>
                  {show('sku') && (
                    <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort('sku')}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>SKU <SortIcon k="sku" /></span>
                    </th>
                  )}
                  {show('category') && <th>Categoría</th>}
                  {show('venta_bruto') && (
                    <th style={{ cursor: 'pointer', userSelect: 'none', textAlign: 'right' }} onClick={() => toggleSort('base_price')}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>Venta Bruto <SortIcon k="base_price" /></span>
                    </th>
                  )}
                  {show('venta_neto') && <th style={{ textAlign: 'right' }}>Venta Neto</th>}
                  {show('costo_bruto') && <th style={{ textAlign: 'right' }}>Costo Bruto</th>}
                  {show('costo_neto') && <th style={{ textAlign: 'right' }}>Costo Neto</th>}
                  {show('stock') && (
                    <th style={{ cursor: 'pointer', userSelect: 'none', textAlign: 'right' }} onClick={() => toggleSort('stock')}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>Stock <SortIcon k="stock" /></span>
                    </th>
                  )}
                  {show('ecommerce') && <th style={{ textAlign: 'center' }}>Ecommerce</th>}
                  {show('estado') && <th style={{ textAlign: 'center' }}>Estado</th>}
                </tr>
              </thead>
              <tbody>
                {paginated.map((p, rowIndex) => {
                  const bruto = parseFloat(p.base_price)
                  const neto = Math.round(bruto / 1.19)
                  const costoBruto = p.cost ? parseFloat(p.cost) : null
                  const costoNeto = costoBruto ? Math.round(costoBruto / 1.19) : null
                  const lowStock = p.track_stock && p.stock <= (p.low_stock_alert || 5)
                  const outStock = p.track_stock && p.stock === 0
                  const catIds = productCategoryIds(p)
                  return (
                    <tr
                      key={p.id}
                      style={{
                        cursor: 'pointer',
                        background: selectedIds.includes(p.id) ? 'var(--a-accent-dim)' : undefined,
                      }}
                      onClick={(e) => handleRowClick(e, p, rowIndex)}
                    >
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--a-text-1)' }}>{p.name}</div>
                        {p.description && <div style={{ fontSize: 11, color: 'var(--a-text-3)', marginTop: 1, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.description}</div>}
                      </td>
                      {show('sku') && <td><span className="admin-mono">{p.sku}</span></td>}
                      {show('category') && (
                        <td>
                          {catIds.length > 0
                            ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                                {catIds.map(id => catMap[id]
                                  ? <span key={id} className="admin-badge admin-badge-warning"><Tag size={9} /> {catMap[id]}</span>
                                  : null
                                )}
                              </div>
                            : <span style={{ color: 'var(--a-text-3)', fontSize: 11 }}>—</span>
                          }
                        </td>
                      )}
                      {show('venta_bruto') && (
                        <td style={{ textAlign: 'right', fontFamily: 'var(--a-font-mono)', fontWeight: 600, color: 'var(--a-text-1)' }}>
                          {fmt(bruto)}
                        </td>
                      )}
                      {show('venta_neto') && (
                        <td style={{ textAlign: 'right', fontFamily: 'var(--a-font-mono)', fontSize: 12, color: 'var(--a-text-2)' }}>
                          {fmt(neto)}
                        </td>
                      )}
                      {show('costo_bruto') && (
                        <td style={{ textAlign: 'right', fontFamily: 'var(--a-font-mono)', fontSize: 12, color: 'var(--a-text-2)' }}>
                          {costoBruto ? fmt(costoBruto) : <span style={{ color: 'var(--a-text-3)' }}>—</span>}
                        </td>
                      )}
                      {show('costo_neto') && (
                        <td style={{ textAlign: 'right', fontFamily: 'var(--a-font-mono)', fontSize: 12, color: 'var(--a-text-2)' }}>
                          {costoNeto ? fmt(costoNeto) : <span style={{ color: 'var(--a-text-3)' }}>—</span>}
                        </td>
                      )}
                      {show('stock') && (
                        <td style={{ textAlign: 'right' }}>
                          {p.track_stock ? (
                            <span style={{ fontFamily: 'var(--a-font-mono)', fontWeight: 700,
                              color: outStock ? 'var(--a-accent)' : lowStock ? 'var(--a-accent)' : 'var(--a-text-1)' }}>
                              {p.stock}
                              {outStock && <span style={{ fontSize: 9, marginLeft: 4, color: 'var(--a-accent)', letterSpacing: 1 }}>SIN STOCK</span>}
                              {lowStock && !outStock && <span style={{ fontSize: 9, marginLeft: 4, color: 'var(--a-accent)', letterSpacing: 1 }}>BAJO</span>}
                            </span>
                          ) : (
                            <span style={{ fontSize: 11, color: 'var(--a-text-3)' }}>—</span>
                          )}
                        </td>
                      )}
                      {show('ecommerce') && (
                        <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                          <button
                            className="admin-btn-icon"
                            title={isOnlineVisible(p) ? 'Visible — click para ocultar' : 'Oculto — click para publicar'}
                            onClick={e => { e.stopPropagation(); toggleOnline(p) }}
                          >
                            {isOnlineVisible(p)
                              ? <Globe size={14} style={{ color: 'var(--a-accent)' }} />
                              : <EyeOff size={14} style={{ color: 'var(--a-text-3)' }} />
                            }
                          </button>
                        </td>
                      )}
                      {show('estado') && (
                        <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                          <button
                            className={`admin-badge ${p.active ? 'admin-badge-success' : 'admin-badge-danger'}`}
                            style={{ cursor: 'pointer', border: 'none', background: 'none' }}
                            title={p.active ? 'Activo — click para desactivar' : 'Inactivo — click para activar'}
                            onClick={e => { e.stopPropagation(); toggleActive(p) }}
                          >
                            {p.active ? 'Activo' : 'Inactivo'}
                          </button>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '14px 20px', borderTop: '1px solid var(--a-border)' }}>
            <button className="admin-btn admin-btn-secondary admin-btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹ Anterior</button>
            <span style={{ fontFamily: 'var(--a-font-mono)', fontSize: 12, color: 'var(--a-text-2)' }}>
              {page} / {totalPages}
            </span>
            <button className="admin-btn admin-btn-secondary admin-btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Siguiente ›</button>
          </div>
        )}
      </div>

      {selectedCount > 0 && (
        <div
          style={{
            position: 'fixed',
            left: '50%',
            bottom: 22,
            transform: 'translateX(-50%)',
            zIndex: 450,
            background: 'var(--a-bg-1)',
            border: '1px solid var(--a-border-med)',
            borderRadius: '999px',
            padding: '8px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: 'var(--a-shadow-lg)',
          }}
        >
          <span style={{ fontSize: 12, color: 'var(--a-text-1)', fontWeight: 600 }}>
            {selectedCount} seleccionada{selectedCount !== 1 ? 's' : ''}
          </span>
          <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={clearSelection}>
            Limpiar
          </button>
          <button className="admin-btn admin-btn-danger admin-btn-sm" onClick={handleBulkDelete}>
            Eliminar
          </button>
        </div>
      )}

      {/* Modales */}
      {modalOpen && (
        <ProductModal
          product={modal.mode === 'edit' ? modal.product : null}
          categories={categories}
          currencyFormat={currencyFormat}
          onClose={closeModal}
          onSaved={handleSaved}
        />
      )}

      {stockProduct && (
        <StockModal product={stockProduct} onClose={() => setStockProduct(null)} onSaved={handleStockSaved} />
      )}

      <Toasts toasts={toasts} onRemove={id => setToasts(t => t.filter(x => x.id !== id))} />
    </>
  )
}
