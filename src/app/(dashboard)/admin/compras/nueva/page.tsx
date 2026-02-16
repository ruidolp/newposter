'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  type CurrencyFormatConfig,
  DEFAULT_CURRENCY_FORMAT,
  formatMoneyDisplay,
  formatMoneyInput,
  parseMoneyInput,
  resolveCurrencyFormat,
} from '@/lib/currency-format'
import { AlertCircle, CheckCircle2, ChevronDown, Info, Plus, Trash2, Upload, X } from 'lucide-react'

interface Supplier {
  id: string
  name: string
  rut: string | null
  contact_name: string | null
}

interface ProductHit {
  id: string
  name: string
  sku: string
  barcode: string | null
  base_price: string
  stock: number
}

interface PurchaseRow {
  rowId: string
  query: string
  results: ProductHit[]
  showDropdown: boolean
  searching: boolean
  productId: string | null
  productName: string
  currentStock: number
  isExisting: boolean
  isNew: boolean
  newSku: string
  newCategoryId: string
  newBasePrice: string
  qty: number
  purchasePriceGross: string
  purchasePriceNet: string
}

interface ExtraChargeRow {
  id: string
  description: string
  amountGross: string
  amountNet: string
}

interface Toast {
  id: number
  type: 'success' | 'error' | 'info'
  msg: string
}

const IVA_RATE = 0.19
const uid = () => Math.random().toString(36).slice(2, 9)

function emptyRow(): PurchaseRow {
  return {
    rowId: uid(),
    query: '',
    results: [],
    showDropdown: false,
    searching: false,
    productId: null,
    productName: '',
    currentStock: 0,
    isExisting: false,
    isNew: false,
    newSku: '',
    newCategoryId: '',
    newBasePrice: '',
    qty: 1,
    purchasePriceGross: '',
    purchasePriceNet: '',
  }
}

function emptyExtraCharge(): ExtraChargeRow {
  return { id: uid(), description: '', amountGross: '', amountNet: '' }
}

function MoneyInput({
  value,
  onChange,
  placeholder = '0',
  className = '',
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <div className={`relative ${className}`}>
      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-xs font-semibold text-slate-500">$</span>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-md border border-slate-300 bg-white pl-6 pr-2 text-right font-mono text-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200"
      />
    </div>
  )
}

function Toasts({
  toasts,
  onRemove,
}: {
  toasts: Toast[]
  onRemove: (id: number) => void
}) {
  return (
    <div className="fixed right-4 top-4 z-[90] space-y-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          aria-live="polite"
          className={`flex min-w-[280px] items-center gap-2 rounded-md border px-3 py-2 text-sm shadow-sm ${
            t.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : t.type === 'error'
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-sky-200 bg-sky-50 text-sky-700'
          }`}
        >
          {t.type === 'success' ? <CheckCircle2 size={15} /> : t.type === 'error' ? <AlertCircle size={15} /> : <Info size={15} />}
          <span className="flex-1">{t.msg}</span>
          <button
            type="button"
            onClick={() => onRemove(t.id)}
            className="rounded p-1 transition hover:bg-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500"
            aria-label="Cerrar mensaje"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}

function SupplierSelector({
  suppliers,
  selected,
  onSelect,
  onCreated,
}: {
  suppliers: Supplier[]
  selected: Supplier | null
  onSelect: (supplier: Supplier | null) => void
  onCreated: (supplier: Supplier) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.rut ?? '').toLowerCase().includes(search.toLowerCase())
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
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-full items-center justify-between rounded-md border border-slate-300 bg-white px-3 text-left text-sm text-slate-900 outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200"
      >
        <span className="truncate">{selected ? selected.name : 'Seleccionar proveedor…'}</span>
        <ChevronDown size={14} className="text-slate-500" />
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-30 w-full overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-200 p-2">
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar proveedor…"
              className="h-9 w-full rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200"
            />
          </div>

          {creating && (
            <div className="flex items-center gap-2 border-b border-slate-200 p-2">
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                placeholder="Nombre del proveedor"
                className="h-9 flex-1 rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200"
              />
              <button
                type="button"
                onClick={handleCreate}
                disabled={saving || !newName.trim()}
                className="rounded-md bg-fuchsia-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-fuchsia-700 disabled:opacity-60"
              >
                {saving ? '…' : 'Crear'}
              </button>
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="rounded p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={14} />
              </button>
            </div>
          )}

          <div className="max-h-60 overflow-y-auto">
            {selected && (
              <button
                type="button"
                onClick={() => {
                  onSelect(null)
                  setOpen(false)
                }}
                className="block w-full px-3 py-2 text-left text-sm text-slate-500 transition hover:bg-slate-50"
              >
                Sin proveedor
              </button>
            )}
            {filtered.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  onSelect(s)
                  setSearch('')
                  setOpen(false)
                }}
                className="block w-full px-3 py-2 text-left text-sm transition hover:bg-slate-50"
              >
                <p className="font-medium text-slate-900">{s.name}</p>
                {(s.rut || s.contact_name) && <p className="text-xs text-slate-500">{[s.rut, s.contact_name].filter(Boolean).join(' · ')}</p>}
              </button>
            ))}
            {filtered.length === 0 && !creating && <div className="px-3 py-2 text-sm text-slate-500">Sin resultados</div>}
          </div>

          {!creating && (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="flex w-full items-center gap-1.5 border-t border-slate-200 px-3 py-2 text-sm font-medium text-fuchsia-700 transition hover:bg-fuchsia-50"
            >
              <Plus size={14} /> Nuevo proveedor
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function ProductRow({
  row,
  currencyFormat,
  onChange,
  onRemove,
}: {
  row: PurchaseRow
  currencyFormat: CurrencyFormatConfig
  onChange: (id: string, patch: Partial<PurchaseRow>) => void
  onRemove: (id: string) => void
}) {
  const searchTimer = useRef<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropPortalRef = useRef<HTMLDivElement>(null)
  const [dropPos, setDropPos] = useState<{ top: number; left: number; width: number } | null>(null)

  useEffect(() => {
    if (row.showDropdown && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect()
      setDropPos({
        top: rect.bottom + window.scrollY + 3,
        left: rect.left + window.scrollX,
        width: rect.width,
      })
    }
  }, [row.showDropdown])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        inputRef.current &&
        !inputRef.current.contains(target) &&
        dropPortalRef.current &&
        !dropPortalRef.current.contains(target)
      ) {
        onChange(row.rowId, { showDropdown: false })
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onChange, row.rowId])

  const hasProduct = row.isExisting || row.isNew
  const stockDisplay = row.currentStock + row.qty

  async function handleSearch(value: string) {
    onChange(row.rowId, {
      query: value,
      isNew: false,
      productId: null,
      productName: '',
      currentStock: 0,
      isExisting: false,
    })
    if (!value.trim()) {
      onChange(row.rowId, { results: [], showDropdown: false })
      return
    }
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(async () => {
      onChange(row.rowId, { searching: true, showDropdown: true })
      try {
        const q = value.trim()
        const res = await fetch(`/api/products?search=${encodeURIComponent(q)}&limit=8&active=true`)
        const data = await res.json()
        const results: ProductHit[] = data.products ?? []
        const exactBarcodeMatches = results.filter(
          (p) => String(p.barcode ?? '').trim().toLowerCase() === q.toLowerCase()
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
    const basePrice = Number(p.base_price)
    onChange(row.rowId, {
      query: p.name,
      productId: p.id,
      productName: p.name,
      newBasePrice: formatMoneyInput(Number.isFinite(basePrice) ? basePrice : '', currencyFormat),
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

  function handlePurchaseGrossChange(value: string) {
    const grossInput = formatMoneyInput(value, currencyFormat)
    const gross = parseMoneyInput(grossInput, currencyFormat)
    onChange(row.rowId, {
      purchasePriceGross: grossInput,
      purchasePriceNet:
        grossInput.trim() === '' || Number.isNaN(gross)
          ? ''
          : formatMoneyInput(Math.round(gross / (1 + IVA_RATE)).toString(), currencyFormat),
    })
  }

  function handlePurchaseNetChange(value: string) {
    const netInput = formatMoneyInput(value, currencyFormat)
    const net = parseMoneyInput(netInput, currencyFormat)
    onChange(row.rowId, {
      purchasePriceNet: netInput,
      purchasePriceGross:
        netInput.trim() === '' || Number.isNaN(net)
          ? ''
          : formatMoneyInput(Math.round(net * (1 + IVA_RATE)).toString(), currencyFormat),
    })
  }

  return (
    <div className="grid grid-cols-[minmax(220px,2.6fr)_minmax(128px,1.3fr)_minmax(94px,1fr)_minmax(108px,1.1fr)_minmax(90px,0.9fr)_130px_130px_36px] items-center gap-1 border-b border-slate-100 px-4 py-2 text-sm last:border-b-0">
      <div className="relative">
        <input
          ref={inputRef}
          value={row.query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => {
            if (row.results.length > 0) onChange(row.rowId, { showDropdown: true })
          }}
          readOnly={row.isExisting}
          placeholder="Nombre, SKU o código de barras…"
          className={`h-9 w-full rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 ${
            row.isExisting ? 'cursor-default bg-slate-50 text-slate-500' : ''
          } ${row.isNew ? 'font-mono' : ''}`}
        />
        {row.isExisting && (
          <button
            type="button"
            title="Cambiar producto"
            onClick={() =>
              onChange(row.rowId, {
                isExisting: false,
                productId: null,
                productName: '',
                query: '',
                currentStock: 0,
              })
            }
            className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={12} />
          </button>
        )}

        {row.showDropdown &&
          dropPos &&
          typeof window !== 'undefined' &&
          createPortal(
            <div
              ref={dropPortalRef}
              style={{ position: 'absolute', top: dropPos.top, left: dropPos.left, width: dropPos.width, zIndex: 9999 }}
              className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg"
            >
              {row.searching && <div className="px-3 py-2 text-xs text-slate-500">Buscando…</div>}
              {!row.searching &&
                row.results.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onMouseDown={() => selectProduct(p)}
                    className="block w-full px-3 py-2 text-left transition hover:bg-slate-50"
                  >
                    <p className="text-sm font-medium text-slate-900">{p.name}</p>
                    <p className="text-xs text-slate-500">
                      SKU: {p.sku} · Stock: {p.stock} · {formatMoneyDisplay(parseFloat(p.base_price), currencyFormat)}
                    </p>
                  </button>
                ))}
              {!row.searching && (
                <button
                  type="button"
                  onMouseDown={createNew}
                  className="flex w-full items-center gap-1.5 border-t border-slate-200 px-3 py-2 text-left text-sm font-medium text-fuchsia-700 transition hover:bg-fuchsia-50"
                >
                  <Plus size={14} /> Crear: “{row.query}”
                </button>
              )}
            </div>,
            document.body
          )}
      </div>

      {hasProduct ? (
        <MoneyInput
          value={row.newBasePrice}
          onChange={(v) => onChange(row.rowId, { newBasePrice: formatMoneyInput(v, currencyFormat) })}
          placeholder="Precio venta"
        />
      ) : (
        <span className="text-slate-400">—</span>
      )}

      <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 font-mono text-xs text-slate-700">
        {hasProduct ? row.currentStock : '—'}
      </span>

      <input
        type="number"
        min="1"
        value={row.qty}
        onChange={(e) => onChange(row.rowId, { qty: Math.max(1, parseInt(e.target.value, 10) || 1) })}
        className="h-9 w-full rounded-md border border-slate-300 px-2 text-right font-mono text-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200"
      />

      <span className="rounded-md border border-cyan-200 bg-cyan-50 px-2 py-1.5 text-center font-mono text-xs font-semibold text-cyan-700">
        {hasProduct ? stockDisplay : '—'}
      </span>

      <MoneyInput value={row.purchasePriceNet} onChange={handlePurchaseNetChange} />
      <MoneyInput value={row.purchasePriceGross} onChange={handlePurchaseGrossChange} />

      <button
        type="button"
        onClick={() => onRemove(row.rowId)}
        className="rounded p-1.5 text-red-600 transition hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        aria-label="Eliminar fila"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}

export default function NuevaCompraPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
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

  useEffect(() => {
    fetchSuppliers()
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
    } catch {
      setSuppliers([])
    }
  }

  function toast(type: Toast['type'], msg: string) {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, type, msg }])
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4500)
  }

  const updateRow = useCallback((rowId: string, patch: Partial<PurchaseRow>) => {
    setRows((prev) => prev.map((r) => (r.rowId === rowId ? { ...r, ...patch } : r)))
  }, [])

  function addRow() {
    setRows((prev) => [...prev, emptyRow()])
  }

  function removeRow(rowId: string) {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.rowId !== rowId) : prev))
  }

  function updateExtraCharge(id: string, patch: Partial<ExtraChargeRow>) {
    setExtraCharges((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  function addExtraCharge() {
    setExtraCharges((prev) => [...prev, emptyExtraCharge()])
  }

  function removeExtraCharge(id: string) {
    setExtraCharges((prev) => prev.filter((item) => item.id !== id))
  }

  function handleExtraGrossChange(id: string, value: string) {
    const grossInput = formatMoneyInput(value, currencyFormat)
    const gross = parseMoneyInput(grossInput, currencyFormat)
    updateExtraCharge(id, {
      amountGross: grossInput,
      amountNet:
        grossInput.trim() === '' || Number.isNaN(gross)
          ? ''
          : formatMoneyInput(Math.round(gross / (1 + IVA_RATE)).toString(), currencyFormat),
    })
  }

  function handleExtraNetChange(id: string, value: string) {
    const netInput = formatMoneyInput(value, currencyFormat)
    const net = parseMoneyInput(netInput, currencyFormat)
    updateExtraCharge(id, {
      amountNet: netInput,
      amountGross:
        netInput.trim() === '' || Number.isNaN(net)
          ? ''
          : formatMoneyInput(Math.round(net * (1 + IVA_RATE)).toString(), currencyFormat),
    })
  }

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoName(file.name)
    const reader = new FileReader()
    reader.onload = () => setPhotoB64(reader.result as string)
    reader.readAsDataURL(file)
  }

  async function handleSubmit() {
    const unresolvedRows = rows.filter((r) => !r.isExisting && !r.isNew && r.query.trim())
    if (unresolvedRows.length > 0) {
      toast('error', 'Hay productos sin seleccionar. Si no existe, usa "Crear" explícitamente.')
      return
    }

    const validRows = rows.filter((r) => (r.isExisting || r.isNew) && r.qty > 0)
    if (validRows.length === 0) {
      toast('error', 'Agrega al menos un producto')
      return
    }

    const items = validRows.map((r) => ({
      product_id: r.isExisting ? r.productId : null,
      product_name: r.productName,
      quantity: r.qty,
      purchase_price: parseMoneyInput(r.purchasePriceGross, currencyFormat) || 0,
      sale_price: parseMoneyInput(r.newBasePrice, currencyFormat) || 0,
      previous_stock: r.currentStock,
      new_stock: r.currentStock + r.qty,
      ...(r.isNew
        ? {
            new_product: {
              name: r.productName,
              sku: r.newSku || null,
              category_id: r.newCategoryId || null,
              base_price: parseMoneyInput(r.newBasePrice, currencyFormat) || 0,
            },
          }
        : {}),
    }))

    const extra_items = extraCharges
      .map((item) => ({
        description: item.description.trim(),
        amount_gross: parseMoneyInput(item.amountGross, currencyFormat) || 0,
        amount_net: parseMoneyInput(item.amountNet, currencyFormat) || 0,
      }))
      .filter((item) => item.description && item.amount_gross > 0)

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

  const productGrossTotal = rows.reduce((sum, r) => {
    const pp = parseMoneyInput(r.purchasePriceGross, currencyFormat) || 0
    return sum + pp * r.qty
  }, 0)
  const productNetTotal = rows.reduce((sum, r) => {
    const pp = parseMoneyInput(r.purchasePriceNet, currencyFormat) || 0
    return sum + pp * r.qty
  }, 0)
  const extrasGrossTotal = extraCharges.reduce((sum, item) => sum + (parseMoneyInput(item.amountGross, currencyFormat) || 0), 0)
  const extrasNetTotal = extraCharges.reduce((sum, item) => sum + (parseMoneyInput(item.amountNet, currencyFormat) || 0), 0)
  const accumulatedGross = productGrossTotal + extrasGrossTotal
  const accumulatedNet = productNetTotal + extrasNetTotal
  const validProductCount = rows.filter((r) => r.isExisting || r.isNew).length

  return (
    <section className="space-y-5">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 [text-wrap:balance]">
            Nueva <span className="text-fuchsia-600">Compra</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">Registra una nueva compra a proveedor y actualiza el stock</p>
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-md bg-fuchsia-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-fuchsia-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400 focus-visible:ring-offset-2 disabled:opacity-60"
        >
          {submitting ? <CheckCircle2 size={16} className="animate-pulse" /> : <CheckCircle2 size={16} />}
          {submitting ? 'Registrando…' : 'Finalizar Compra'}
        </button>
      </header>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">Datos de la Compra</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Proveedor</label>
            <SupplierSelector
              suppliers={suppliers}
              selected={selectedSupplier}
              onSelect={setSelectedSupplier}
              onCreated={(s) => setSuppliers((prev) => [...prev, s])}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="invoice_number" className="text-xs font-medium uppercase tracking-wide text-slate-500">
              N° Factura / Folio
            </label>
            <input
              id="invoice_number"
              name="invoice_number"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="Ej: FAC-0001234"
              className="h-10 w-full rounded-md border border-slate-300 px-3 font-mono text-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="invoice_file" className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Foto Factura
            </label>
            <label
              htmlFor="invoice_file"
              className="flex h-10 cursor-pointer items-center gap-2 rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 text-sm text-slate-600 transition hover:bg-slate-100"
            >
              <Upload size={14} />
              <span className="truncate">{photoName || 'Subir foto o PDF'}</span>
            </label>
            <input id="invoice_file" name="invoice_file" type="file" accept="image/*,.pdf" onChange={handlePhoto} className="hidden" />
          </div>
        </div>
        <div className="mt-4 space-y-1.5">
          <label htmlFor="purchase_notes" className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Notas (opcional)
          </label>
          <input
            id="purchase_notes"
            name="purchase_notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Observaciones, condiciones de pago…"
            className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-800">
            Productos Comprados
            {validProductCount > 0 && <span className="ml-2 text-xs text-fuchsia-600">{validProductCount} ítem(s)</span>}
          </h2>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[980px]">
            <div className="grid grid-cols-[minmax(220px,2.6fr)_minmax(128px,1.3fr)_minmax(94px,1fr)_minmax(108px,1.1fr)_minmax(90px,0.9fr)_130px_130px_36px] gap-1 border-b border-slate-200 bg-slate-50 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-600">
              <span>Buscar Producto</span>
              <span>Precio Venta Bruto</span>
              <span>Stock Actual</span>
              <span className="text-right">Cantidad Comprada</span>
              <span className="text-cyan-700">Nuevo Stock</span>
              <span className="text-right">Precio Compra Neto</span>
              <span className="text-right">Precio Compra Bruto</span>
              <span />
            </div>
            {rows.map((row) => (
              <ProductRow key={row.rowId} row={row} currencyFormat={currencyFormat} onChange={updateRow} onRemove={removeRow} />
            ))}
          </div>
        </div>

        <div className="px-4 py-3">
          <button
            type="button"
            onClick={addRow}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500"
          >
            <Plus size={14} /> Agregar producto
          </button>
        </div>

        <div className="border-t border-slate-200 px-4 py-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">Otros cargos de factura (no producto)</h3>
            <button
              type="button"
              onClick={addExtraCharge}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <Plus size={13} /> Agregar cargo
            </button>
          </div>

          {extraCharges.length === 0 ? (
            <p className="text-sm text-slate-500">Sin cargos adicionales</p>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_130px_130px_36px] gap-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                <span />
                <span className="text-right">Precio Compra Neto</span>
                <span className="text-right">Precio Compra Bruto</span>
                <span />
              </div>
              {extraCharges.map((item) => (
                <div key={item.id} className="grid grid-cols-[1fr_130px_130px_36px] items-center gap-1">
                  <input
                    value={item.description}
                    onChange={(e) => updateExtraCharge(item.id, { description: e.target.value })}
                    placeholder="Ej: Transporte, embalaje, comisión…"
                    className="h-9 w-full rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200"
                  />
                  <MoneyInput value={item.amountNet} onChange={(v) => handleExtraNetChange(item.id, v)} />
                  <MoneyInput value={item.amountGross} onChange={(v) => handleExtraGrossChange(item.id, v)} />
                  <button
                    type="button"
                    onClick={() => removeExtraCharge(item.id)}
                    className="rounded p-1.5 text-red-600 transition hover:bg-red-50"
                    aria-label="Eliminar cargo"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 bg-slate-50 px-4 py-3">
          <div className="ml-auto grid w-full max-w-md grid-cols-3 gap-2 text-sm">
            <span className="font-medium text-slate-700">Resumen</span>
            <span className="text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Neto</span>
            <span className="text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Bruto</span>

            <span className="font-semibold text-slate-900">Total compra</span>
            <span className="text-right font-semibold text-slate-900">{formatMoneyDisplay(accumulatedNet, currencyFormat)}</span>
            <span className="text-right font-semibold text-slate-900">{formatMoneyDisplay(accumulatedGross, currencyFormat)}</span>

            <span className="text-slate-600">Solo productos</span>
            <span className="text-right text-slate-700">{formatMoneyDisplay(productNetTotal, currencyFormat)}</span>
            <span className="text-right text-slate-700">{formatMoneyDisplay(productGrossTotal, currencyFormat)}</span>

            {extraCharges.length > 0 && (
              <>
                <span className="text-slate-600">Otros cargos</span>
                <span className="text-right text-slate-700">{formatMoneyDisplay(extrasNetTotal, currencyFormat)}</span>
                <span className="text-right text-slate-700">{formatMoneyDisplay(extrasGrossTotal, currencyFormat)}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <Toasts toasts={toasts} onRemove={(id) => setToasts((prev) => prev.filter((x) => x.id !== id))} />
    </section>
  )
}
