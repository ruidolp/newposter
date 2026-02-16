'use client'

import { type MouseEvent as ReactMouseEvent, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Plus,
  Search,
  UserCircle2,
  X,
} from 'lucide-react'
import { DEFAULT_TIERS, getTierStyle } from '@/lib/loyalty'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Customer {
  id: string
  name: string
  email: string | null
  rut: string | null
  phone: string | null
  address: string | null
  created_at: string
  updated_at: string
  metadata?: Record<string, unknown>
  total_orders?: number
  total_amount?: number
  tier_id?: string
  tier_name?: string
}

interface Toast {
  id: number
  type: 'success' | 'error'
  msg: string
}

type CustomerFormState = {
  name: string
  email: string
  rut: string
  phone: string
  address: string
}

function emptyForm(): CustomerFormState {
  return { name: '', email: '', rut: '', phone: '', address: '' }
}

// ── Toasts ────────────────────────────────────────────────────────────────────

function Toasts({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: number) => void }) {
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
          <button type="button" onClick={() => onRemove(t.id)} aria-label="Cerrar mensaje"
            className="rounded p-1 transition hover:bg-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}

// ── Customer Modal ─────────────────────────────────────────────────────────────

function CustomerModal({
  customer, onClose, onSaved,
}: {
  customer: Customer | null
  onClose: () => void
  onSaved: (c: Customer) => void
}) {
  const [form, setForm] = useState<CustomerFormState>(
    customer
      ? { name: customer.name, email: customer.email ?? '', rut: customer.rut ?? '', phone: customer.phone ?? '', address: customer.address ?? '' }
      : emptyForm()
  )
  const [tierOverride, setTierOverride] = useState<string>(
    (customer?.metadata?.loyalty_override as string | undefined) ?? ''
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const initialRef = useRef(
    JSON.stringify({
      name: (customer?.name ?? '').trim(),
      email: (customer?.email ?? '').trim(),
      rut: (customer?.rut ?? '').trim(),
      phone: (customer?.phone ?? '').trim(),
      address: (customer?.address ?? '').trim(),
      tierOverride: ((customer?.metadata?.loyalty_override as string | undefined) ?? '').trim(),
    })
  )

  function setField<K extends keyof CustomerFormState>(key: K, value: CustomerFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function hasUnsavedChanges() {
    const current = JSON.stringify({
      name: form.name.trim(),
      email: form.email.trim(),
      rut: form.rut.trim().toUpperCase(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      tierOverride: tierOverride.trim(),
    })
    return current !== initialRef.current
  }

  function requestClose() {
    if (saving) return
    if (hasUnsavedChanges()) {
      const ok = window.confirm('Tienes cambios sin guardar. ¿Salir y descartarlos?')
      if (!ok) return
    }
    onClose()
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        requestClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [requestClose])

  async function handleSave() {
    if (!form.name.trim()) { setError('El nombre es requerido'); return }
    setSaving(true); setError('')
    try {
      const isEdit = Boolean(customer)
      const body: Record<string, unknown> = {
        ...form,
        rut: form.rut.trim().toUpperCase() || null,
      }
      if (isEdit) body.loyalty_override = tierOverride || null
      const res = await fetch(isEdit ? `/api/customers/${customer!.id}` : '/api/customers', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Error al guardar cliente' }))
        throw new Error(data.error || 'Error al guardar cliente')
      }
      onSaved(await res.json())
    } catch (e: unknown) {
      setError((e as Error).message || 'Error al guardar cliente')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/45 p-4"
      onClick={(e) => e.target === e.currentTarget && requestClose()}>
      <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">{customer ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
          <button type="button" onClick={requestClose} aria-label="Cerrar"
            className="rounded p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5 md:col-span-2">
              <label htmlFor="customer_name" className="text-xs font-medium uppercase tracking-wide text-slate-500">Nombre *</label>
              <input id="customer_name" name="customer_name" value={form.name} onChange={(e) => setField('name', e.target.value)}
                autoFocus autoComplete="name" placeholder="Nombre del cliente…"
                className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="customer_email" className="text-xs font-medium uppercase tracking-wide text-slate-500">Email</label>
              <input id="customer_email" name="customer_email" type="email" value={form.email} onChange={(e) => setField('email', e.target.value)}
                autoComplete="email" placeholder="cliente@email.com"
                className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="customer_rut" className="text-xs font-medium uppercase tracking-wide text-slate-500">RUT</label>
              <input id="customer_rut" name="customer_rut" value={form.rut} onChange={(e) => setField('rut', e.target.value)}
                autoComplete="off" placeholder="12.345.678-9"
                className="h-10 w-full rounded-md border border-slate-300 px-3 font-mono text-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="customer_phone" className="text-xs font-medium uppercase tracking-wide text-slate-500">Teléfono</label>
              <input id="customer_phone" name="customer_phone" value={form.phone} onChange={(e) => setField('phone', e.target.value)}
                autoComplete="tel" placeholder="+56 9 1234 5678"
                className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200" />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label htmlFor="customer_address" className="text-xs font-medium uppercase tracking-wide text-slate-500">Dirección</label>
              <input id="customer_address" name="customer_address" value={form.address} onChange={(e) => setField('address', e.target.value)}
                autoComplete="street-address" placeholder="Dirección del cliente…"
                className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200" />
            </div>
            {customer && (
              <div className="space-y-1.5 md:col-span-2">
                <label htmlFor="loyalty_override" className="text-xs font-medium uppercase tracking-wide text-slate-500">Tier manual (override)</label>
                <select id="loyalty_override" value={tierOverride} onChange={(e) => setTierOverride(e.target.value)}
                  className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200">
                  <option value="">— Automático —</option>
                  {DEFAULT_TIERS.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <p className="text-[11px] text-slate-400">Forzar tier manualmente. Útil para asignar Black a clientes VIP.</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button type="button" onClick={requestClose}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500">
            Cancelar
          </button>
          <button type="button" onClick={handleSave} disabled={saving}
            className="inline-flex items-center gap-2 rounded-md bg-fuchsia-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-fuchsia-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400 focus-visible:ring-offset-2 disabled:opacity-60">
            <CheckCircle2 size={14} className={saving ? 'animate-pulse' : ''} />
            {customer ? 'Guardar Cambios' : 'Crear Cliente'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Tier badge ─────────────────────────────────────────────────────────────────

function TierBadge({ tierId, tierName }: { tierId: string; tierName: string }) {
  const style = getTierStyle(tierId)
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black tracking-wide uppercase ${style.badge}`}>
      {tierName}
    </span>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function ClientesPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { fetchCustomers() }, [])

  function toast(type: Toast['type'], msg: string) {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, type, msg }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500)
  }

  async function fetchCustomers(query?: string) {
    setLoading(true)
    try {
      const params = new URLSearchParams({ with_stats: 'true' })
      if (query?.trim()) params.set('search', query.trim())
      const res = await fetch(`/api/customers?${params.toString()}`)
      const data = await res.json()
      setCustomers(data.customers ?? [])
      setTotal(data.total ?? 0)
    } catch {
      toast('error', 'Error al cargar clientes')
    } finally {
      setLoading(false)
    }
  }

  function handleSearch(value: string) {
    setSearch(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchCustomers(value), 350)
  }

  function handleSaved(customer: Customer) {
    setShowModal(false)
    setEditing(null)
    toast('success', editing ? 'Cliente actualizado' : 'Cliente creado')
    fetchCustomers(search || undefined)
  }

  const emptyStateText = useMemo(() => `Sin clientes${search ? ' que coincidan' : ''}`, [search])

  useEffect(() => {
    const validIds = new Set(customers.map((c) => c.id))
    setSelectedIds((prev) => prev.filter((id) => validIds.has(id)))
    if (lastSelectedId && !validIds.has(lastSelectedId)) setLastSelectedId(null)
  }, [customers, lastSelectedId])

  const selectedCount = selectedIds.length

  function openEdit(customer: Customer) { setEditing(customer); setShowModal(true) }
  function clearSelection() { setSelectedIds([]); setLastSelectedId(null) }

  function handleRowClick(e: ReactMouseEvent<HTMLTableRowElement>, row: Customer, rowIndex: number) {
    const withModifiers = e.metaKey || e.ctrlKey || e.shiftKey
    if (!withModifiers) { openEdit(row); return }
    e.preventDefault(); e.stopPropagation()
    if (e.shiftKey && lastSelectedId) {
      const anchorIndex = customers.findIndex((c) => c.id === lastSelectedId)
      if (anchorIndex >= 0) {
        const [start, end] = [anchorIndex, rowIndex].sort((a, b) => a - b)
        setSelectedIds((prev) => Array.from(new Set([...prev, ...customers.slice(start, end + 1).map((c) => c.id)])))
        setLastSelectedId(row.id); return
      }
    }
    setSelectedIds((prev) => prev.includes(row.id) ? prev.filter((id) => id !== row.id) : [...prev, row.id])
    setLastSelectedId(row.id)
  }

  async function handleBulkDelete() {
    if (selectedCount === 0) return
    if (!window.confirm(`¿Eliminar ${selectedCount} cliente(s)?\n\nEsta acción no se puede deshacer.`)) return
    const deletedIds: string[] = []
    let failCount = 0
    for (const id of selectedIds) {
      try {
        const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' })
        if (res.ok) deletedIds.push(id)
        else failCount++
      } catch { failCount++ }
    }
    if (deletedIds.length > 0) {
      setCustomers((prev) => prev.filter((c) => !deletedIds.includes(c.id)))
      setTotal((prev) => Math.max(prev - deletedIds.length, 0))
    }
    clearSelection()
    if (deletedIds.length > 0) toast('success', `${deletedIds.length} cliente(s) eliminado(s)`)
    if (failCount > 0) toast('error', `${failCount} cliente(s) no se pudieron eliminar`)
  }

  // Tier distribution stats
  const tierCounts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const c of customers) {
      const id = c.tier_id ?? 'MEMBER'
      map[id] = (map[id] ?? 0) + 1
    }
    return map
  }, [customers])

  return (
    <section className="space-y-5">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 [text-wrap:balance]">
            <span className="text-fuchsia-600">Clientes</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {total} cliente{total !== 1 ? 's' : ''} registrado{total !== 1 ? 's' : ''} · Haz click en una fila para editar
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setEditing(null); setShowModal(true) }}
          className="inline-flex items-center gap-2 rounded-md bg-fuchsia-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-fuchsia-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400 focus-visible:ring-offset-2"
        >
          <Plus size={16} />
          Nuevo Cliente
        </button>
      </header>

      {/* Tier distribution */}
      {!loading && total > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {DEFAULT_TIERS.map((tier) => {
            const count = tierCounts[tier.id] ?? 0
            const style = getTierStyle(tier.id)
            return (
              <div key={tier.id} className={`rounded-xl border-2 px-3 py-2.5 ${style.panel} ${style.border}`}>
                <p className={`text-[10px] font-black uppercase tracking-widest ${tier.id === 'BLACK' ? 'text-yellow-400' : 'text-slate-500'}`}>
                  {tier.id}
                </p>
                <p className={`mt-0.5 text-2xl font-black tabular-nums ${tier.id === 'BLACK' ? 'text-white' : 'text-slate-900'}`}>
                  {count}
                </p>
              </div>
            )
          })}
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-sm font-semibold text-slate-800">Listado</h2>
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Buscar por nombre, email, RUT o teléfono…"
              className="h-9 w-full min-w-[240px] rounded-md border border-slate-300 pl-8 pr-3 text-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center px-4 py-14 text-sm text-slate-500">Cargando…</div>
        ) : customers.length === 0 ? (
          <div className="px-4 py-14 text-center text-slate-500">
            <UserCircle2 size={34} className="mx-auto mb-2 text-slate-300" />
            <p className="text-sm">{emptyStateText}</p>
            {!search && (
              <button type="button" onClick={() => { setEditing(null); setShowModal(true) }}
                className="mt-3 inline-flex items-center gap-2 rounded-md bg-fuchsia-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-fuchsia-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400 focus-visible:ring-offset-2">
                <Plus size={14} />
                Agregar Primer Cliente
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Nombre</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Nivel</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Compras</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Email</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">RUT</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Teléfono</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Registrado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((c, rowIndex) => (
                  <tr
                    key={c.id}
                    className={`cursor-pointer transition hover:bg-slate-50 ${selectedIds.includes(c.id) ? 'bg-fuchsia-50' : ''}`}
                    onClick={(e) => handleRowClick(e, c, rowIndex)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-slate-200 bg-slate-100 text-[11px] font-semibold text-slate-600">
                          {c.name.split(' ').filter(Boolean).map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <span className="font-medium text-slate-900">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {c.tier_id
                        ? <TierBadge tierId={c.tier_id} tierName={c.tier_name ?? c.tier_id} />
                        : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-slate-600">{c.total_orders ?? 0}</td>
                    <td className="px-4 py-3">
                      {c.email
                        ? <a href={`mailto:${c.email}`} onClick={(e) => e.stopPropagation()} className="font-mono text-xs text-sky-700 hover:underline">{c.email}</a>
                        : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{c.rut ?? '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{c.phone ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(c.created_at).toLocaleDateString('es-CL')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bulk action bar */}
      {selectedCount > 0 && (
        <div className="fixed bottom-5 left-1/2 z-[450] flex -translate-x-1/2 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 shadow-xl">
          <span className="text-xs font-semibold text-slate-700">{selectedCount} seleccionada{selectedCount !== 1 ? 's' : ''}</span>
          <button onClick={clearSelection}
            className="inline-flex h-7 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50">
            Limpiar
          </button>
          <button onClick={handleBulkDelete}
            className="inline-flex h-7 items-center rounded-lg bg-rose-600 px-3 text-xs font-semibold text-white transition hover:bg-rose-700">
            Eliminar
          </button>
        </div>
      )}

      {showModal && (
        <CustomerModal
          customer={editing}
          onClose={() => { setShowModal(false); setEditing(null) }}
          onSaved={handleSaved}
        />
      )}

      <Toasts toasts={toasts} onRemove={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </section>
  )
}
