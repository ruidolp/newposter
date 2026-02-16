'use client'

import { useState } from 'react'
import { Store, DollarSign, ChevronRight } from 'lucide-react'

export interface LocationOption {
  id: string
  name: string
  type: string
  is_default: boolean
}

export interface OpenedSession {
  id: string
  location_id: string
  location_name: string
  opening_amount: number
  opened_at: string
}

interface Props {
  locations: LocationOption[]
  userName: string
  onOpened: (session: OpenedSession) => void
}

export default function SessionOpenModal({ locations, userName, onOpened }: Props) {
  const defaultLocation = locations.find((l) => l.is_default) ?? locations[0]
  const [locationId, setLocationId] = useState(defaultLocation?.id ?? '')
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleOpen() {
    if (!locationId) { setError('Selecciona una ubicación'); return }
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/pos/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location_id: locationId,
          opening_amount: parseFloat(amount) || 0,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al abrir caja')
      onOpened({
        id: data.session.id,
        location_id: data.session.location_id,
        location_name: data.location_name,
        opening_amount: Number(data.session.opening_amount),
        opened_at: data.session.opened_at,
      })
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex flex-col items-center gap-1 rounded-t-2xl bg-gradient-to-br from-fuchsia-600 to-rose-500 px-6 py-6 text-white">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-white/20">
            <Store size={24} className="text-white" />
          </div>
          <h1 className="mt-2 text-lg font-bold">Apertura de Caja</h1>
          <p className="text-sm text-white/80">Bienvenido, {userName}</p>
        </div>

        <div className="space-y-4 px-6 py-5">
          {error && (
            <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>
          )}

          {/* Location picker */}
          <div className="space-y-1.5">
            <label htmlFor="session-location" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Ubicación
            </label>
            {locations.length === 1 ? (
              <div className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3">
                <Store size={14} className="text-slate-400" />
                <span className="text-sm font-medium text-slate-700">{locations[0].name}</span>
              </div>
            ) : (
              <select
                id="session-location"
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200"
              >
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}{l.is_default ? ' (Principal)' : ''}</option>
                ))}
              </select>
            )}
          </div>

          {/* Opening amount */}
          <div className="space-y-1.5">
            <label htmlFor="opening-amount" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Monto inicial en caja (efectivo)
            </label>
            <div className="relative">
              <DollarSign size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="opening-amount"
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="h-10 w-full rounded-lg border border-slate-300 pl-8 pr-3 text-sm tabular-nums outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200"
              />
            </div>
            <p className="text-[11px] text-slate-400">Billetes y monedas que hay en la caja antes de comenzar</p>
          </div>
        </div>

        <div className="border-t border-slate-100 px-6 pb-6">
          <button
            type="button"
            onClick={handleOpen}
            disabled={saving || !locationId}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-fuchsia-600 py-3 text-sm font-bold text-white transition hover:bg-fuchsia-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500 disabled:opacity-60"
          >
            {saving
              ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              : <ChevronRight size={16} />}
            {saving ? 'Abriendo caja…' : 'Abrir caja y comenzar'}
          </button>
        </div>
      </div>
    </div>
  )
}
