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
  price_history?: PriceHistoryEntry[]
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

interface PriceHistoryEntry {
  id: string
  source: 'PURCHASE' | 'MANUAL' | 'SYSTEM'
  previous_price: string | null
  new_price: string
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
    <div className="fixed right-4 top-4 z-[500] space-y-2">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`flex min-w-[260px] items-center gap-2 rounded-xl border px-3 py-2 text-sm shadow-lg ${
            t.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : t.type === 'error'
                ? 'border-rose-200 bg-rose-50 text-rose-800'
                : 'border-sky-200 bg-sky-50 text-sky-800'
          }`}
        >
          <span className="shrink-0">
            {t.type === 'success' ? <CheckCircle2 size={15} /> : t.type === 'error' ? <AlertCircle size={15} /> : <Info size={15} />}
          </span>
          <span className="text-sm">{t.msg}</span>
          <button
            className="ml-auto rounded-md p-1 text-current/70 transition hover:bg-black/5 hover:text-current"
            onClick={() => onRemove(t.id)}
          >
            <X size={13} />
          </button>
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
    <div ref={ref} className="relative">
      <button
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
        onClick={() => setOpen(o => !o)}
        title="Elegir qué datos mostrar en la tabla"
      >
        <Columns size={13} />
        Vista de tabla
        <ChevronDown size={11} style={{ opacity: 0.6 }} />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-[200] min-w-[190px] rounded-xl border border-slate-200 bg-white py-2 shadow-xl">
          <div className="px-3.5 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Datos visibles en tabla
          </div>
          {COL_DEFS.map(col => (
            <label
              key={col.id}
              className="flex cursor-pointer items-center gap-2 px-3.5 py-1.5 text-xs text-slate-700 transition hover:bg-slate-50"
            >
              <input
                type="checkbox"
                checked={visible.includes(col.id)}
                onChange={() => toggle(col.id)}
                className="h-3.5 w-3.5 accent-fuchsia-600"
              />
              {col.label}
            </label>
          ))}
          <div className="mx-0 mt-1.5 border-t border-slate-200 px-3.5 pt-1">
            <button
              className="w-full rounded-lg px-2 py-1.5 text-center text-xs font-semibold text-fuchsia-700 transition hover:bg-fuchsia-50"
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
  const [priceHistory, setPriceHistory] = useState<PriceHistoryEntry[]>(product?.price_history ?? [])
  const [loadingPriceHistory, setLoadingPriceHistory] = useState<boolean>(Boolean(product && !product.price_history))
  const [priceDrawerOpen, setPriceDrawerOpen] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [creatingCat, setCreatingCat] = useState(false)
  const [catSearch, setCatSearch] = useState('')
  const [localCategories, setLocalCategories] = useState(categories)
  const selectedCategories = localCategories.filter(c => form.category_ids.includes(c.id))
  const availableCategories = localCategories.filter(c =>
    !form.category_ids.includes(c.id) && c.name.toLowerCase().includes(catSearch.toLowerCase().trim())
  )

  function normalizeFormForDirtyCheck(currentForm: typeof form) {
    return {
      ...currentForm,
      name: currentForm.name.trim(),
      description: currentForm.description.trim(),
      sku: currentForm.sku.trim(),
      barcode: currentForm.barcode.trim(),
      base_price: currentForm.base_price.trim(),
      cost: currentForm.cost.trim(),
      stock: currentForm.stock.trim(),
      low_stock_alert: currentForm.low_stock_alert.trim(),
      ecommerce_images: [...currentForm.ecommerce_images],
      category_ids: [...currentForm.category_ids],
    }
  }
  const initialFormRef = useRef(JSON.stringify(normalizeFormForDirtyCheck(form)))

  function hasUnsavedChanges() {
    const initial = JSON.parse(initialFormRef.current)
    const current = normalizeFormForDirtyCheck(form)
    return JSON.stringify(initial) !== JSON.stringify(current)
  }

  function requestClose() {
    if (saving) return
    if (hasUnsavedChanges()) {
      const confirmed = window.confirm('Tienes cambios sin guardar. ¿Salir y descartar cambios?')
      if (!confirmed) return
    }
    onClose()
  }

  useEffect(() => {
    initialFormRef.current = JSON.stringify(normalizeFormForDirtyCheck(form))
    // Solo se recalcula al abrir modal o cambiar producto de origen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id, isEdit])

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
    if (product.cost_history && product.price_history) {
      setCostHistory(product.cost_history)
      setPriceHistory(product.price_history)
      setLoadingCostHistory(false)
      setLoadingPriceHistory(false)
      return
    }
    let cancelled = false
    setLoadingCostHistory(true)
    setLoadingPriceHistory(true)
    fetch(`/api/products/${product.id}`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error('error')))
      .then(data => {
        if (!cancelled) {
          setCostHistory(data.cost_history ?? [])
          setPriceHistory(data.price_history ?? [])
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCostHistory([])
          setPriceHistory([])
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingCostHistory(false)
          setLoadingPriceHistory(false)
        }
      })
    return () => { cancelled = true }
  }, [isEdit, product])

  function sourceLabel(source: 'PURCHASE' | 'MANUAL' | 'SYSTEM') {
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
  const currentPriceValue = product?.base_price === null || product?.base_price === undefined || Number.isNaN(Number(product?.base_price))
    ? null
    : Number(product.base_price)
  const actualPriceEntryId = currentPriceValue === null
    ? null
    : (priceHistory.find((entry) => Number(entry.new_price) === currentPriceValue)?.id ?? null)

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
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/40 p-4">
      <div className="relative w-[min(980px,96vw)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <span className="text-base font-semibold text-slate-900">{isEdit ? 'Editar Producto' : 'Nuevo Producto'}</span>
          <button className="rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800" onClick={requestClose}><X size={16} /></button>
        </div>

        <div className="max-h-[78vh] space-y-4 overflow-y-auto px-5 py-4">
          {errors._global && (
            <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"><AlertCircle size={14} /> {errors._global}</div>
          )}

          <div className="space-y-3 border-b border-slate-200 pb-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xl font-extrabold text-black">
                GENERAL
              </div>
              <label className="ml-auto inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-fuchsia-600"
                  checked={form.active}
                  onChange={() => set('active', !form.active)}
                  aria-label="Estado del producto"
                />
                <span>{form.active ? 'ACTIVO' : 'INACTIVO'}</span>
              </label>
            </div>
            <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nombre del producto *</label>
                <input className={`h-10 w-full rounded-lg border px-3 text-sm outline-none transition focus:ring-2 focus:ring-fuchsia-100 ${errors.name ? 'border-rose-400' : 'border-slate-200 focus:border-fuchsia-500'}`} value={form.name}
                  onChange={e => set('name', e.target.value)} placeholder="Ej: Bebida Cola 500ml" />
                {errors.name && <span className="text-xs text-rose-600">{errors.name}</span>}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">SKU *</label>
                <input className={`h-10 w-full rounded-lg border px-3 font-mono text-sm outline-none transition focus:ring-2 focus:ring-fuchsia-100 ${errors.sku ? 'border-rose-400' : 'border-slate-200 focus:border-fuchsia-500'}`} value={form.sku}
                  onChange={e => set('sku', e.target.value)} placeholder="Ej: BEB-001" />
                {errors.sku && <span className="text-xs text-rose-600">{errors.sku}</span>}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Código de Barras</label>
                <input className="h-10 w-full rounded-lg border border-slate-200 px-3 font-mono text-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-100" value={form.barcode}
                  onChange={e => set('barcode', e.target.value)} placeholder="Ej: 7801234567890" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Categorías</label>
              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  {selectedCategories.length === 0 ? (
                    <span className="text-xs text-slate-500">Sin categorías seleccionadas</span>
                  ) : (
                    selectedCategories.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        className="inline-flex items-center gap-1 rounded-full border border-fuchsia-200 bg-fuchsia-50 px-2 py-1 text-xs font-medium text-fuchsia-700"
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
                      className="ml-auto text-xs font-semibold text-fuchsia-700 transition hover:text-fuchsia-800"
                      onClick={() => set('category_ids', [])}
                    >
                      Limpiar
                    </button>
                  )}
                </div>

                <div className="relative">
                  <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-100"
                    placeholder="Buscar categoría..."
                    value={catSearch}
                    onChange={e => setCatSearch(e.target.value)}
                  />
                </div>

                <div className="flex max-h-36 flex-wrap gap-2 overflow-y-auto">
                  {localCategories.length === 0 ? (
                    <div className="text-xs text-slate-500">Sin categorías aún</div>
                  ) : availableCategories.length === 0 ? (
                    <div className="text-xs text-slate-500">No hay coincidencias</div>
                  ) : (
                    availableCategories.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 transition hover:border-fuchsia-300 hover:text-fuchsia-700"
                        onClick={() => toggleCat(c.id)}
                      >
                        <Plus size={11} />
                        {c.name}
                      </button>
                    ))
                  )}
                </div>
              </div>
              <div className="mt-2 flex gap-2">
                <input className="h-9 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-100" placeholder="Nueva categoría…" value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreateCat()}
                />
                <button className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60" onClick={handleCreateCat}
                  disabled={creatingCat || !newCatName.trim()}>
                  {creatingCat ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" /> : <Plus size={13} />}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-3 border-b border-slate-200 pb-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xl font-extrabold text-black">
                PRECIOS
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <span>Precio Venta Bruto *</span>
                  {isEdit && (
                    <button
                      type="button"
                      className="p-0 text-xs font-bold normal-case text-fuchsia-700 transition hover:text-fuchsia-800"
                      onClick={() => { setPriceDrawerOpen(true); setCostDrawerOpen(false) }}
                    >
                      Precios Historicos
                    </button>
                  )}
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-xs text-slate-500">
                    {currencyFormat.currency_symbol || '$'}
                  </span>
                  <input type="text" inputMode="decimal" className={`h-10 w-full rounded-lg border pl-6 pr-3 font-mono text-sm outline-none transition focus:ring-2 focus:ring-fuchsia-100 ${errors.base_price ? 'border-rose-400' : 'border-slate-200 focus:border-fuchsia-500'}`}
                    value={form.base_price} onChange={e => setMoney('base_price', e.target.value)} placeholder="0" />
                </div>
                {errors.base_price && <span className="text-xs text-rose-600">{errors.base_price}</span>}
                {form.base_price && parseMoneyInput(form.base_price, currencyFormat) > 0 && (
                  <span className="mt-0.5 block text-xs text-slate-500">
                    PRECIO VENTA NETO: {formatMoneyDisplay(Math.round(parseMoneyInput(form.base_price, currencyFormat) / 1.19), currencyFormat)}
                  </span>
                )}
              </div>
              <div className="space-y-1">
                <label className="flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <span>Costo Producto Bruto</span>
                  {isEdit && (
                    <button
                      type="button"
                      className="p-0 text-xs font-bold normal-case text-fuchsia-700 transition hover:text-fuchsia-800"
                      onClick={() => { setCostDrawerOpen(true); setPriceDrawerOpen(false) }}
                    >
                      Costos Historicos
                    </button>
                  )}
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-xs text-slate-500">
                    {currencyFormat.currency_symbol || '$'}
                  </span>
                  <input type="text" inputMode="decimal" className="h-10 w-full rounded-lg border border-slate-200 pl-6 pr-3 font-mono text-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-100" value={form.cost}
                    onChange={e => setMoney('cost', e.target.value)} placeholder="0" />
                </div>
                {form.cost && parseMoneyInput(form.cost, currencyFormat) > 0 && (
                  <span className="mt-0.5 block text-xs text-slate-500">
                    COSTO NETO: {formatMoneyDisplay(Math.round(parseMoneyInput(form.cost, currencyFormat) / 1.19), currencyFormat)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3 border-b border-slate-200 pb-3">
            <div className="text-xl font-extrabold text-black">
              INVENTARIO
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Stock actual</label>
                <input type="number" min="0" className="h-10 w-full rounded-lg border border-slate-200 px-3 font-mono text-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-100" value={form.stock}
                  onChange={e => set('stock', e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Alerta Stock Bajo</label>
                <input type="number" min="0" className="h-10 w-full rounded-lg border border-slate-200 px-3 font-mono text-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-100" value={form.low_stock_alert}
                  onChange={e => set('low_stock_alert', e.target.value)} />
              </div>
            </div>
            <div className="flex flex-wrap gap-6 pt-1">
              <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-fuchsia-600"
                  checked={form.track_stock}
                  onChange={() => set('track_stock', !form.track_stock)}
                  aria-label="Control de stock"
                />
                <span>Controlar stock</span>
              </label>
            </div>
          </div>

          <div>
            <div className="text-xl font-extrabold text-black">
              ECOMMERCE
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Descripción Web</label>
                <textarea className="min-h-24 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-100" rows={3} value={form.description}
                  onChange={e => set('description', e.target.value)} placeholder="Descripción visible en ecommerce…" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Adjuntar imágenes</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none transition file:mr-3 file:rounded-md file:border-0 file:bg-fuchsia-50 file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-fuchsia-700 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-100"
                  onChange={(e) => {
                    handleAttachEcommerceImages(e.target.files)
                    e.currentTarget.value = ''
                  }}
                />
                <span className="mt-1 block text-xs text-slate-500">
                  Hasta 12 imágenes
                </span>
                {form.ecommerce_images.length > 0 && (
                  <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
                    {form.ecommerce_images.map((src, idx) => (
                      <div key={`${idx}-${src.slice(0, 20)}`} className="relative">
                        <img
                          src={src}
                          alt={`Producto ${idx + 1}`}
                          className="h-[74px] w-full rounded-md border border-slate-200 object-cover"
                        />
                        <button
                          type="button"
                          className="absolute right-1 top-1 rounded-md bg-black/60 p-1 text-white transition hover:bg-black/70"
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
            <div className="flex flex-wrap gap-6 pt-3">
              <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-fuchsia-600"
                  checked={form.online_visible}
                  onChange={() => set('online_visible', !form.online_visible)}
                  aria-label="Visible ecommerce"
                />
                <span className="inline-flex items-center gap-1">
                  {form.online_visible ? <Globe size={12} className="text-fuchsia-700" /> : <EyeOff size={12} className="text-slate-500" />}
                  VISIBLE ECOMMERCE
                </span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button className="inline-flex h-10 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50" onClick={requestClose}>Cancelar</button>
          <button className="inline-flex h-10 items-center gap-2 rounded-lg bg-fuchsia-600 px-4 text-sm font-semibold text-white transition hover:bg-fuchsia-700 disabled:cursor-not-allowed disabled:opacity-60" onClick={handleSave} disabled={saving}>
            {saving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <CheckCircle2 size={15} />}
            {saving ? 'Guardando…' : isEdit ? 'Guardar Cambios' : 'Crear Producto'}
          </button>
        </div>

        {isEdit && costDrawerOpen && (
          <div className="fixed inset-0 z-[330]">
            <button
              type="button"
              className="absolute inset-0 bg-slate-950/45"
              onClick={() => setCostDrawerOpen(false)}
              aria-label="Cerrar historial de costos"
            />

            <aside className="absolute right-0 top-0 flex h-full w-[min(560px,100vw)] flex-col border-l border-slate-200 bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <span className="text-base font-semibold text-slate-900">Historial de costos</span>
                <button className="rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800" onClick={() => setCostDrawerOpen(false)}><X size={16} /></button>
              </div>
              <div className="border-b border-slate-200 px-3 py-2 text-[11px] text-slate-500">
                Registros más recientes primero
              </div>
              <div className="flex-1 overflow-y-auto bg-slate-50">
                {loadingCostHistory ? (
                  <div className="px-3 py-3 text-xs text-slate-500">
                    Cargando historial...
                  </div>
                ) : costHistory.length === 0 ? (
                  <div className="px-3 py-3 text-xs text-slate-500">
                    Sin historial de costos registrado.
                  </div>
                ) : (
                  <div>
                    {costHistory.map(entry => {
                      const prev = entry.previous_cost === null ? null : Number(entry.previous_cost)
                      const next = Number(entry.new_cost)
                      const purchaseRef = entry.invoice_number || entry.purchase_id
                      return (
                        <div key={entry.id} className="border-b border-slate-200 bg-white px-3 py-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-800">{sourceLabel(entry.source)}</span>
                              {actualEntryId === entry.id && (
                                <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                  ACTUAL
                                </span>
                              )}
                            </span>
                            <span className="text-[11px] text-slate-500">{new Date(entry.created_at).toLocaleString('es-CL')}</span>
                          </div>
                          <div className="mt-1.5 flex items-center justify-between gap-2">
                            <span className="font-mono text-[11px] text-slate-500">
                              Anterior: {prev === null ? '—' : formatMoneyDisplay(prev, currencyFormat)}
                            </span>
                            <span className="font-mono text-xs font-bold text-slate-900">
                              Nuevo: {formatMoneyDisplay(next, currencyFormat)}
                            </span>
                          </div>
                          {(entry.invoice_number || entry.reason) && (
                            <div className="mt-1 text-[11px] text-slate-600">
                              {entry.source === 'PURCHASE' && entry.purchase_id && purchaseRef ? (
                                <>
                                  Actualizado por compra{' '}
                                  <a
                                    href={`/admin/compras/historial?purchase_id=${entry.purchase_id}`}
                                    className="text-fuchsia-700 underline"
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
          </div>
        )}

        {isEdit && priceDrawerOpen && (
          <div className="fixed inset-0 z-[330]">
            <button
              type="button"
              className="absolute inset-0 bg-slate-950/45"
              onClick={() => setPriceDrawerOpen(false)}
              aria-label="Cerrar historial de precios de venta"
            />

            <aside className="absolute right-0 top-0 flex h-full w-[min(560px,100vw)] flex-col border-l border-slate-200 bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <span className="text-base font-semibold text-slate-900">Historial de precios de venta</span>
                <button className="rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800" onClick={() => setPriceDrawerOpen(false)}><X size={16} /></button>
              </div>
              <div className="border-b border-slate-200 px-3 py-2 text-[11px] text-slate-500">
                Registros más recientes primero
              </div>
              <div className="flex-1 overflow-y-auto bg-slate-50">
                {loadingPriceHistory ? (
                  <div className="px-3 py-3 text-xs text-slate-500">
                    Cargando historial...
                  </div>
                ) : priceHistory.length === 0 ? (
                  <div className="px-3 py-3 text-xs text-slate-500">
                    Sin historial de precios registrado.
                  </div>
                ) : (
                  <div>
                    {priceHistory.map(entry => {
                      const prev = entry.previous_price === null ? null : Number(entry.previous_price)
                      const next = Number(entry.new_price)
                      const purchaseRef = entry.invoice_number || entry.purchase_id
                      return (
                        <div key={entry.id} className="border-b border-slate-200 bg-white px-3 py-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-800">{sourceLabel(entry.source)}</span>
                              {actualPriceEntryId === entry.id && (
                                <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                  ACTUAL
                                </span>
                              )}
                            </span>
                            <span className="text-[11px] text-slate-500">{new Date(entry.created_at).toLocaleString('es-CL')}</span>
                          </div>
                          <div className="mt-1.5 flex items-center justify-between gap-2">
                            <span className="font-mono text-[11px] text-slate-500">
                              Anterior: {prev === null ? '—' : formatMoneyDisplay(prev, currencyFormat)}
                            </span>
                            <span className="font-mono text-xs font-bold text-slate-900">
                              Nuevo: {formatMoneyDisplay(next, currencyFormat)}
                            </span>
                          </div>
                          {(entry.invoice_number || entry.reason) && (
                            <div className="mt-1 text-[11px] text-slate-600">
                              {entry.source === 'PURCHASE' && entry.purchase_id && purchaseRef ? (
                                <>
                                  Actualizado por compra{' '}
                                  <a
                                    href={`/admin/compras/historial?purchase_id=${entry.purchase_id}`}
                                    className="text-fuchsia-700 underline"
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
          </div>
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
    <div className="fixed inset-0 z-[320] flex items-center justify-center bg-slate-950/40 p-4" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-[380px] rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <span className="text-base font-semibold text-slate-900">Ajustar Stock</span>
          <button className="rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="space-y-4 px-4 py-3">
          <div style={{ marginBottom: 16, padding: '10px 14px', background: 'var(--a-bg-2)', borderRadius: 'var(--a-radius)', fontFamily: 'var(--a-font-mono)', fontSize: 12 }}>
            <div style={{ color: 'var(--a-text-3)' }}>Producto</div>
            <div style={{ fontWeight: 600, color: 'var(--a-text-1)', marginTop: 2 }}>{product.name}</div>
            <div style={{ color: 'var(--a-text-2)', marginTop: 4 }}>Stock actual: <strong>{product.stock}</strong></div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {(['add', 'set'] as const).map(t => (
              <button key={t} className={`inline-flex h-9 flex-1 items-center justify-center rounded-lg border px-3 text-sm font-medium transition ${
                type === t
                  ? 'border-fuchsia-600 bg-fuchsia-600 text-white hover:bg-fuchsia-700'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
                onClick={() => setType(t)} style={{ flex: 1 }}>
                {t === 'add' ? '+ Agregar / quitar' : 'Establecer valor'}
              </button>
            ))}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">{type === 'add' ? 'Cantidad (usa negativo para restar)' : 'Nuevo stock'}</label>
            <input type="number" className="h-10 w-full rounded-lg border border-slate-200 px-3 font-mono text-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-100" value={qty} onChange={e => setQty(e.target.value)}
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
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-4 py-3">
          <button className="inline-flex h-10 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50" onClick={onClose}>Cancelar</button>
          <button className="inline-flex h-10 items-center rounded-lg bg-fuchsia-600 px-4 text-sm font-semibold text-white transition hover:bg-fuchsia-700 disabled:cursor-not-allowed disabled:opacity-60" onClick={handleSave} disabled={saving || qty === ''}>
            {saving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : 'Actualizar Stock'}
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
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Gestión de <span className="text-fuchsia-700">Productos</span></h1>
          <p className="mt-1 text-sm text-slate-600">{products.length} producto{products.length !== 1 ? 's' : ''} · Haz click en una fila para editar</p>
        </div>
        <button className="inline-flex h-10 items-center gap-2 rounded-lg bg-fuchsia-600 px-4 text-sm font-semibold text-white transition hover:bg-fuchsia-700" onClick={openCreate}>
          <Plus size={16} /> Nuevo Producto
        </button>
      </div>

      {/* Filtros */}
      <div className="mb-4 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="space-y-3 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Buscador */}
            <div className="relative min-w-[180px] flex-1">
              <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="h-9 w-full rounded-lg border border-slate-200 pl-8 pr-3 text-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-100"
                placeholder="Buscar nombre, SKU o código…"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
              />
            </div>

            <button className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50" onClick={fetchProducts} title="Actualizar">
              <RefreshCw size={13} />
            </button>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            {/* Categoría */}
            <div className="min-w-[200px] space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Filtrar por categoría
              </span>
              <select
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-100"
                value={filterCat}
                onChange={e => { setFilterCat(e.target.value); setPage(1) }}
              >
                <option value="">Todas las categorías</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {/* Modo / Estado */}
            <div className="min-w-[220px] space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Filtrar por estado o condición
              </span>
              <select
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-100"
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
            <div className="ml-auto min-w-[180px] space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Personalizar tabla
              </span>
              <ColSelector visible={visibleCols} onChange={updateCols} />
            </div>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <span className="text-sm font-semibold text-slate-900">
            Productos
            {sorted.length > 0 && <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-fuchsia-700">{sorted.length} resultados</span>}
          </span>
          <span className="text-xs text-slate-500">
            Selección: <strong>Shift + click</strong> o <strong>Ctrl/Cmd + click</strong>
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center p-12">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-fuchsia-600" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 p-12 text-center">
            <Package size={36} className="text-slate-300" />
            <p className="text-sm text-slate-600">No hay productos{search ? ` para "${search}"` : ''}</p>
            <button className="mt-2 inline-flex h-9 items-center gap-2 rounded-lg bg-fuchsia-600 px-3 text-sm font-semibold text-white transition hover:bg-fuchsia-700" onClick={openCreate}>
              <Plus size={14} /> Crear primer producto
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  {/* Nombre always visible */}
                  <th className="cursor-pointer select-none px-4 py-2.5" onClick={() => toggleSort('name')}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>Nombre <SortIcon k="name" /></span>
                  </th>
                  {show('sku') && (
                    <th className="cursor-pointer select-none px-4 py-2.5" onClick={() => toggleSort('sku')}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>SKU <SortIcon k="sku" /></span>
                    </th>
                  )}
                  {show('category') && <th className="px-4 py-2.5">Categoría</th>}
                  {show('venta_bruto') && (
                    <th className="cursor-pointer select-none px-4 py-2.5 text-right" onClick={() => toggleSort('base_price')}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>Venta Bruto <SortIcon k="base_price" /></span>
                    </th>
                  )}
                  {show('venta_neto') && <th className="px-4 py-2.5 text-right">Venta Neto</th>}
                  {show('costo_bruto') && <th className="px-4 py-2.5 text-right">Costo Bruto</th>}
                  {show('costo_neto') && <th className="px-4 py-2.5 text-right">Costo Neto</th>}
                  {show('stock') && (
                    <th className="cursor-pointer select-none px-4 py-2.5 text-right" onClick={() => toggleSort('stock')}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>Stock <SortIcon k="stock" /></span>
                    </th>
                  )}
                  {show('ecommerce') && <th className="px-4 py-2.5 text-center">Ecommerce</th>}
                  {show('estado') && <th className="px-4 py-2.5 text-center">Estado</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
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
                      className={`cursor-pointer transition hover:bg-slate-50 ${selectedIds.includes(p.id) ? 'bg-fuchsia-50' : ''}`}
                      onClick={(e) => handleRowClick(e, p, rowIndex)}
                    >
                      <td className="max-w-[320px] px-4 py-2.5">
                        <div className="truncate whitespace-nowrap font-semibold text-slate-900" title={p.name}>
                          {p.name}
                        </div>
                      </td>
                      {show('sku') && <td className="px-4 py-2.5"><span className="font-mono text-xs text-slate-700">{p.sku}</span></td>}
                      {show('category') && (
                        <td className="px-4 py-2.5">
                          {catIds.length > 0
                            ? <div className="flex flex-wrap gap-1">
                                {catIds.map(id => catMap[id]
                                  ? <span key={id} className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700"><Tag size={9} /> {catMap[id]}</span>
                                  : null
                                )}
                              </div>
                            : <span className="text-xs text-slate-400">—</span>
                          }
                        </td>
                      )}
                      {show('venta_bruto') && (
                        <td className="px-4 py-2.5 text-right font-mono font-semibold text-slate-900">
                          {formatMoneyDisplay(bruto, currencyFormat)}
                        </td>
                      )}
                      {show('venta_neto') && (
                        <td className="px-4 py-2.5 text-right font-mono text-xs text-slate-600">
                          {formatMoneyDisplay(neto, currencyFormat)}
                        </td>
                      )}
                      {show('costo_bruto') && (
                        <td className="px-4 py-2.5 text-right font-mono text-xs text-slate-600">
                          {costoBruto ? formatMoneyDisplay(costoBruto, currencyFormat) : <span className="text-slate-400">—</span>}
                        </td>
                      )}
                      {show('costo_neto') && (
                        <td className="px-4 py-2.5 text-right font-mono text-xs text-slate-600">
                          {costoNeto ? formatMoneyDisplay(costoNeto, currencyFormat) : <span className="text-slate-400">—</span>}
                        </td>
                      )}
                      {show('stock') && (
                        <td className="px-4 py-2.5 text-right">
                          {p.track_stock ? (
                            <span className={`font-mono font-bold ${outStock || lowStock ? 'text-fuchsia-700' : 'text-slate-900'}`}>
                              {p.stock}
                              {outStock && <span className="ml-1 text-[9px] tracking-wider text-fuchsia-700">SIN STOCK</span>}
                              {lowStock && !outStock && <span className="ml-1 text-[9px] tracking-wider text-fuchsia-700">BAJO</span>}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                      )}
                      {show('ecommerce') && (
                        <td className="px-4 py-2.5 text-center" onClick={e => e.stopPropagation()}>
                          <button
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
                            title={isOnlineVisible(p) ? 'Visible — click para ocultar' : 'Oculto — click para publicar'}
                            onClick={e => { e.stopPropagation(); toggleOnline(p) }}
                          >
                            {isOnlineVisible(p)
                              ? <Globe size={14} className="text-fuchsia-700" />
                              : <EyeOff size={14} className="text-slate-500" />
                            }
                          </button>
                        </td>
                      )}
                      {show('estado') && (
                        <td className="px-4 py-2.5 text-center" onClick={e => e.stopPropagation()}>
                          <button
                            className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                              p.active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'
                            }`}
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
          <div className="flex items-center justify-center gap-2 border-t border-slate-200 px-4 py-3">
            <button className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹ Anterior</button>
            <span className="font-mono text-xs text-slate-600">
              {page} / {totalPages}
            </span>
            <button className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Siguiente ›</button>
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
          <button className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50" onClick={clearSelection}>
            Limpiar
          </button>
          <button className="inline-flex h-8 items-center rounded-lg bg-rose-600 px-3 text-xs font-semibold text-white transition hover:bg-rose-700" onClick={handleBulkDelete}>
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
