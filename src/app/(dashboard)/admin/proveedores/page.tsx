'use client'

import { type MouseEvent as ReactMouseEvent, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Plus,
  Search,
  Truck,
  X,
} from 'lucide-react'

interface Supplier {
  id: string
  name: string
  rut: string | null
  email: string | null
  phone: string | null
  address: string | null
  contact_name: string | null
  notes: string | null
  active: boolean
  created_at: string
}

interface Toast {
  id: number
  type: 'success' | 'error'
  msg: string
}

type SupplierFormState = {
  name: string
  rut: string
  email: string
  phone: string
  address: string
  contact_name: string
  notes: string
  active: boolean
}

function emptyForm(): SupplierFormState {
  return {
    name: '',
    rut: '',
    email: '',
    phone: '',
    address: '',
    contact_name: '',
    notes: '',
    active: true,
  }
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
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {t.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
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

function SupplierModal({
  supplier,
  onClose,
  onSaved,
}: {
  supplier: Supplier | null
  onClose: () => void
  onSaved: (s: Supplier) => void
}) {
  const [form, setForm] = useState<SupplierFormState>(
    supplier
      ? {
          name: supplier.name,
          rut: supplier.rut ?? '',
          email: supplier.email ?? '',
          phone: supplier.phone ?? '',
          address: supplier.address ?? '',
          contact_name: supplier.contact_name ?? '',
          notes: supplier.notes ?? '',
          active: supplier.active,
        }
      : emptyForm()
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function setField<K extends keyof SupplierFormState>(key: K, value: SupplierFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setError('El nombre es requerido')
      return
    }
    setSaving(true)
    setError('')

    try {
      const isEdit = Boolean(supplier)
      const res = await fetch(isEdit ? `/api/suppliers/${supplier!.id}` : '/api/suppliers', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Error al guardar proveedor' }))
        throw new Error(data.error || 'Error al guardar proveedor')
      }

      const saved = await res.json()
      onSaved(saved)
    } catch (e: unknown) {
      setError((e as Error).message || 'Error al guardar proveedor')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/45 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">
            {supplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5 md:col-span-2">
              <label htmlFor="supplier_name" className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Nombre *
              </label>
              <input
                id="supplier_name"
                name="supplier_name"
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                autoFocus
                autoComplete="organization"
                placeholder="Nombre o razón social…"
                className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="supplier_rut" className="text-xs font-medium uppercase tracking-wide text-slate-500">
                RUT
              </label>
              <input
                id="supplier_rut"
                name="supplier_rut"
                value={form.rut}
                onChange={(e) => setField('rut', e.target.value)}
                autoComplete="off"
                placeholder="12.345.678-9"
                className="h-10 w-full rounded-md border border-slate-300 px-3 font-mono text-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="supplier_contact" className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Contacto
              </label>
              <input
                id="supplier_contact"
                name="supplier_contact"
                value={form.contact_name}
                onChange={(e) => setField('contact_name', e.target.value)}
                autoComplete="name"
                placeholder="Nombre del contacto…"
                className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="supplier_email" className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Email
              </label>
              <input
                id="supplier_email"
                name="supplier_email"
                type="email"
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
                autoComplete="email"
                placeholder="contacto@proveedor.cl"
                className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="supplier_phone" className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Teléfono
              </label>
              <input
                id="supplier_phone"
                name="supplier_phone"
                value={form.phone}
                onChange={(e) => setField('phone', e.target.value)}
                autoComplete="tel"
                placeholder="+56 9 1234 5678"
                className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label htmlFor="supplier_address" className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Dirección
              </label>
              <input
                id="supplier_address"
                name="supplier_address"
                value={form.address}
                onChange={(e) => setField('address', e.target.value)}
                autoComplete="street-address"
                placeholder="Dirección…"
                className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label htmlFor="supplier_notes" className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Notas
              </label>
              <textarea
                id="supplier_notes"
                name="supplier_notes"
                value={form.notes}
                onChange={(e) => setField('notes', e.target.value)}
                rows={3}
                placeholder="Observaciones, condiciones, etc.…"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200"
              />
            </div>

            {supplier && (
              <div className="space-y-1.5">
                <label htmlFor="supplier_state" className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Estado
                </label>
                <select
                  id="supplier_state"
                  name="supplier_state"
                  value={form.active ? 'true' : 'false'}
                  onChange={(e) => setField('active', e.target.value === 'true')}
                  className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200"
                >
                  <option value="true">Activo</option>
                  <option value="false">Inactivo</option>
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-md bg-fuchsia-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-fuchsia-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400 focus-visible:ring-offset-2 disabled:opacity-60"
          >
            {saving ? <CheckCircle2 size={14} className="animate-pulse" /> : <CheckCircle2 size={14} />}
            {supplier ? 'Guardar Cambios' : 'Crear Proveedor'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ProveedoresPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    fetchSuppliers()
  }, [showInactive])

  function toast(type: Toast['type'], msg: string) {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, type, msg }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500)
  }

  async function fetchSuppliers() {
    setLoading(true)
    try {
      const res = await fetch(`/api/suppliers?${showInactive ? 'all=true' : ''}`)
      const data = await res.json()
      setSuppliers(data.suppliers ?? [])
    } catch {
      toast('error', 'Error al cargar proveedores')
    } finally {
      setLoading(false)
    }
  }

  function handleSaved(supplier: Supplier) {
    setSuppliers((prev) => {
      const idx = prev.findIndex((x) => x.id === supplier.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = supplier
        return next
      }
      return [supplier, ...prev]
    })
    toast('success', editing ? 'Proveedor actualizado' : 'Proveedor creado')
    setShowModal(false)
    setEditing(null)
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.rut ?? '').toLowerCase().includes(q) ||
        (s.contact_name ?? '').toLowerCase().includes(q) ||
        (s.email ?? '').toLowerCase().includes(q)
    )
  }, [suppliers, search])

  useEffect(() => {
    const validIds = new Set(filtered.map((s) => s.id))
    setSelectedIds((prev) => prev.filter((id) => validIds.has(id)))
    if (lastSelectedId && !validIds.has(lastSelectedId)) {
      setLastSelectedId(null)
    }
  }, [filtered, lastSelectedId])

  const selectedCount = selectedIds.length

  function openEdit(supplier: Supplier) {
    setEditing(supplier)
    setShowModal(true)
  }

  function clearSelection() {
    setSelectedIds([])
    setLastSelectedId(null)
  }

  function handleRowClick(
    e: ReactMouseEvent<HTMLTableRowElement>,
    row: Supplier,
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
      const anchorIndex = filtered.findIndex((s) => s.id === lastSelectedId)
      if (anchorIndex >= 0) {
        const [start, end] = [anchorIndex, rowIndex].sort((a, b) => a - b)
        const rangeIds = filtered.slice(start, end + 1).map((s) => s.id)
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
      `¿Eliminar ${selectedCount} proveedor(es)?\n\nSe desactivarán (eliminación lógica).`
    )
    if (!confirmed) return

    const deletedIds: string[] = []
    let okCount = 0
    let failCount = 0

    for (const id of selectedIds) {
      try {
        const res = await fetch(`/api/suppliers/${id}`, { method: 'DELETE' })
        if (res.ok) {
          okCount += 1
          deletedIds.push(id)
        } else {
          failCount += 1
        }
      } catch {
        failCount += 1
      }
    }

    if (deletedIds.length > 0) {
      setSuppliers((prev) => prev.filter((s) => !deletedIds.includes(s.id)))
    }
    clearSelection()

    if (okCount > 0) toast('success', `${okCount} proveedor(es) eliminado(s)`)
    if (failCount > 0) toast('error', `${failCount} proveedor(es) no se pudieron eliminar`)
  }

  return (
    <section className="space-y-5">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 [text-wrap:balance]">
            Gestión de <span className="text-fuchsia-600">Proveedores</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {suppliers.length} proveedor{suppliers.length !== 1 ? 'es' : ''} registrado{suppliers.length !== 1 ? 's' : ''}
            {' · '}
            Haz click en una fila para editar
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing(null)
            setShowModal(true)
          }}
          className="inline-flex items-center gap-2 rounded-md bg-fuchsia-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-fuchsia-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400 focus-visible:ring-offset-2"
        >
          <Plus size={16} />
          Nuevo Proveedor
        </button>
      </header>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-sm font-semibold text-slate-800">Listado</h2>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="inline-flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-fuchsia-600 focus:ring-fuchsia-500"
              />
              Ver inactivos
            </label>
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar…"
                className="h-9 w-full min-w-[220px] rounded-md border border-slate-300 pl-8 pr-3 text-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center px-4 py-14 text-sm text-slate-500">
            Cargando…
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-14 text-center text-slate-500">
            <Truck size={34} className="mx-auto mb-2 text-slate-300" />
            <p className="text-sm">Sin proveedores{search ? ' que coincidan' : ''}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Nombre</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">RUT</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Contacto</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Email</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Teléfono</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((s, rowIndex) => (
                  <tr
                    key={s.id}
                    className={`cursor-pointer transition hover:bg-slate-50 ${selectedIds.includes(s.id) ? 'bg-fuchsia-50' : ''}`}
                    onClick={(e) => handleRowClick(e, s, rowIndex)}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{s.name}</p>
                      {s.address && <p className="mt-0.5 text-xs text-slate-500">{s.address}</p>}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{s.rut ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-700">{s.contact_name ?? '—'}</td>
                    <td className="px-4 py-3">
                      {s.email ? (
                        <a
                          href={`mailto:${s.email}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-mono text-xs text-sky-700 hover:underline"
                        >
                          {s.email}
                        </a>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{s.phone ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          s.active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {s.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

      {showModal && (
        <SupplierModal
          supplier={editing}
          onClose={() => {
            setShowModal(false)
            setEditing(null)
          }}
          onSaved={handleSaved}
        />
      )}

      <Toasts toasts={toasts} onRemove={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </section>
  )
}
