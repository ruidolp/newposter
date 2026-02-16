'use client'

import { useEffect, useState } from 'react'
import {
  Building2,
  CheckCircle2,
  Clock,
  Mail,
  MapPin,
  Phone,
  Plus,
  X,
} from 'lucide-react'

interface Location {
  id: string
  name: string
  type: string
  is_default: boolean
  active: boolean
  address: string | null
  phone: string | null
  email: string | null
  notes: string | null
  hours: string | null
}

const LOCATION_TYPES = [
  { value: 'STORE', label: 'Tienda física' },
  { value: 'WAREHOUSE', label: 'Bodega' },
  { value: 'ONLINE', label: 'Canal online' },
]

const TYPE_COLORS: Record<string, string> = {
  STORE: 'bg-fuchsia-100 text-fuchsia-700',
  WAREHOUSE: 'bg-amber-100 text-amber-700',
  ONLINE: 'bg-sky-100 text-sky-700',
}

interface LocationFormState {
  name: string
  type: string
  address: string
  phone: string
  email: string
  hours: string
  notes: string
}

function emptyForm(loc?: Location): LocationFormState {
  return {
    name: loc?.name ?? '',
    type: loc?.type ?? 'STORE',
    address: loc?.address ?? '',
    phone: loc?.phone ?? '',
    email: loc?.email ?? '',
    hours: loc?.hours ?? '',
    notes: loc?.notes ?? '',
  }
}

function LocationModal({
  location,
  onClose,
  onSaved,
}: {
  location: Location | null
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<LocationFormState>(emptyForm(location ?? undefined))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set<K extends keyof LocationFormState>(key: K, val: LocationFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: val }))
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('El nombre es requerido'); return }
    setSaving(true); setError('')
    try {
      const body = {
        name: form.name.trim(),
        type: form.type,
        address: form.address.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        hours: form.hours.trim() || null,
        notes: form.notes.trim() || null,
      }
      const isEdit = Boolean(location)
      const res = await fetch(
        isEdit ? `/api/locations/${location!.id}` : '/api/locations',
        {
          method: isEdit ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      )
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? 'Error al guardar')
      }
      onSaved()
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/45 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">
            {location ? 'Editar Sucursal' : 'Nueva Sucursal'}
          </h2>
          <button type="button" onClick={onClose} aria-label="Cerrar"
            className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Nombre */}
            <div className="space-y-1.5 md:col-span-2">
              <label htmlFor="loc_name" className="text-xs font-medium uppercase tracking-wide text-slate-500">Nombre *</label>
              <input
                id="loc_name" autoFocus
                value={form.name} onChange={(e) => set('name', e.target.value)}
                placeholder="Ej: Tienda Centro, Bodega Norte…"
                className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200"
              />
            </div>

            {/* Tipo */}
            <div className="space-y-1.5">
              <label htmlFor="loc_type" className="text-xs font-medium uppercase tracking-wide text-slate-500">Tipo</label>
              <select
                id="loc_type"
                value={form.type} onChange={(e) => set('type', e.target.value)}
                className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200"
              >
                {LOCATION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            {/* Teléfono */}
            <div className="space-y-1.5">
              <label htmlFor="loc_phone" className="text-xs font-medium uppercase tracking-wide text-slate-500">Teléfono</label>
              <input
                id="loc_phone" type="tel" autoComplete="tel"
                value={form.phone} onChange={(e) => set('phone', e.target.value)}
                placeholder="+56 2 1234 5678"
                className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200"
              />
            </div>

            {/* Dirección */}
            <div className="space-y-1.5 md:col-span-2">
              <label htmlFor="loc_address" className="text-xs font-medium uppercase tracking-wide text-slate-500">Dirección</label>
              <input
                id="loc_address" autoComplete="street-address"
                value={form.address} onChange={(e) => set('address', e.target.value)}
                placeholder="Av. Ejemplo 123, Santiago"
                className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="loc_email" className="text-xs font-medium uppercase tracking-wide text-slate-500">Email</label>
              <input
                id="loc_email" type="email" autoComplete="email"
                value={form.email} onChange={(e) => set('email', e.target.value)}
                placeholder="sucursal@empresa.com"
                className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200"
              />
            </div>

            {/* Horario */}
            <div className="space-y-1.5">
              <label htmlFor="loc_hours" className="text-xs font-medium uppercase tracking-wide text-slate-500">Horario</label>
              <input
                id="loc_hours"
                value={form.hours} onChange={(e) => set('hours', e.target.value)}
                placeholder="Lun-Vie 9:00-18:00"
                className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200"
              />
            </div>

            {/* Notas */}
            <div className="space-y-1.5 md:col-span-2">
              <label htmlFor="loc_notes" className="text-xs font-medium uppercase tracking-wide text-slate-500">Notas internas</label>
              <textarea
                id="loc_notes"
                value={form.notes} onChange={(e) => set('notes', e.target.value)}
                rows={2}
                placeholder="Observaciones, acceso, instrucciones…"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 resize-none"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button type="button" onClick={onClose}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500">
            Cancelar
          </button>
          <button type="button" onClick={handleSave} disabled={saving}
            className="inline-flex items-center gap-2 rounded-md bg-fuchsia-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-fuchsia-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400 disabled:opacity-60">
            <CheckCircle2 size={14} className={saving ? 'animate-pulse' : ''} />
            {location ? 'Guardar Cambios' : 'Crear Sucursal'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SucursalesPage() {
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Location | null>(null)

  function load() {
    setLoading(true)
    fetch('/api/locations?all=true')
      .then((r) => r.json())
      .then((d) => setLocations(d.locations ?? []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function handleToggle(loc: Location) {
    if (loc.is_default) return
    await fetch(`/api/locations/${loc.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !loc.active }),
    })
    load()
  }

  function openEdit(loc: Location) { setEditing(loc); setShowModal(true) }
  function openNew() { setEditing(null); setShowModal(true) }

  return (
    <section className="space-y-5">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 [text-wrap:balance]">
            <span className="text-fuchsia-600">Sucursales</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {locations.filter((l) => l.active).length} activa{locations.filter((l) => l.active).length !== 1 ? 's' : ''} · Tiendas, bodegas y canales de venta
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center gap-2 rounded-md bg-fuchsia-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-fuchsia-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400 focus-visible:ring-offset-2"
        >
          <Plus size={15} />
          Nueva Sucursal
        </button>
      </header>

      {loading ? (
        <div className="py-16 text-center text-sm text-slate-400">Cargando…</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {locations.map((loc) => (
            <div
              key={loc.id}
              className={`rounded-xl border-2 bg-white p-5 shadow-sm transition ${
                loc.active ? 'border-slate-200' : 'border-dashed border-slate-200 opacity-60'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className={`grid h-9 w-9 place-items-center rounded-lg ${loc.active ? 'bg-fuchsia-100' : 'bg-slate-100'}`}>
                    <Building2 size={18} className={loc.active ? 'text-fuchsia-600' : 'text-slate-400'} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{loc.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase ${TYPE_COLORS[loc.type] ?? 'bg-slate-100 text-slate-600'}`}>
                        {LOCATION_TYPES.find((t) => t.value === loc.type)?.label ?? loc.type}
                      </span>
                      {loc.is_default && (
                        <span className="rounded-full bg-fuchsia-100 px-1.5 py-0.5 text-[10px] font-semibold text-fuchsia-600">
                          Principal
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {!loc.active && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 uppercase shrink-0">
                    Inactiva
                  </span>
                )}
              </div>

              {/* Details */}
              <div className="mt-4 space-y-2">
                {loc.address && (
                  <div className="flex items-start gap-2 text-xs text-slate-600">
                    <MapPin size={12} className="mt-0.5 shrink-0 text-slate-400" />
                    <span>{loc.address}</span>
                  </div>
                )}
                {loc.phone && (
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Phone size={12} className="shrink-0 text-slate-400" />
                    <span>{loc.phone}</span>
                  </div>
                )}
                {loc.email && (
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Mail size={12} className="shrink-0 text-slate-400" />
                    <a href={`mailto:${loc.email}`} className="hover:underline text-sky-700">{loc.email}</a>
                  </div>
                )}
                {loc.hours && (
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Clock size={12} className="shrink-0 text-slate-400" />
                    <span>{loc.hours}</span>
                  </div>
                )}
                {loc.notes && (
                  <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-500 italic">
                    {loc.notes}
                  </p>
                )}
                {!loc.address && !loc.phone && !loc.email && !loc.hours && (
                  <p className="text-xs text-slate-400 italic">Sin datos de contacto</p>
                )}
              </div>

              {/* Actions */}
              <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => openEdit(loc)}
                  className="flex-1 rounded-lg border border-slate-200 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500"
                >
                  Editar
                </button>
                {!loc.is_default && (
                  <button
                    type="button"
                    onClick={() => handleToggle(loc)}
                    className={`flex-1 rounded-lg border py-1.5 text-xs font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500 ${
                      loc.active
                        ? 'border-rose-200 text-rose-600 hover:bg-rose-50'
                        : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                    }`}
                  >
                    {loc.active ? 'Desactivar' : 'Activar'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <LocationModal
          location={editing}
          onClose={() => { setShowModal(false); setEditing(null) }}
          onSaved={() => { setShowModal(false); setEditing(null); load() }}
        />
      )}
    </section>
  )
}
