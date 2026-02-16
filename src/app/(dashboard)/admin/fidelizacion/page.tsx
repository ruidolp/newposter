'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, AlertCircle, X } from 'lucide-react'
import { DEFAULT_TIERS, getTierStyle, type LoyaltyTier } from '@/lib/loyalty'

interface Toast {
  id: number
  type: 'success' | 'error'
  msg: string
}

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
          <button
            type="button"
            onClick={() => onRemove(t.id)}
            aria-label="Cerrar mensaje"
            className="rounded p-1 transition hover:bg-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}

export default function FidelizacionPage() {
  const [tiers, setTiers] = useState<LoyaltyTier[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    fetch('/api/loyalty/config')
      .then((r) => r.json())
      .then((d) => setTiers(d.tiers ?? DEFAULT_TIERS))
      .finally(() => setLoading(false))
  }, [])

  function toast(type: Toast['type'], msg: string) {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, type, msg }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500)
  }

  function update(idx: number, field: keyof LoyaltyTier, value: unknown) {
    setTiers((prev) => prev.map((t, i) => (i === idx ? { ...t, [field]: value } : t)))
  }

  async function save() {
    setSaving(true)
    try {
      const res = await fetch('/api/loyalty/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tiers }),
      })
      if (!res.ok) throw new Error('Error al guardar')
      toast('success', 'Configuración de fidelización guardada')
    } catch {
      toast('error', 'Error al guardar configuración')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 [text-wrap:balance]">
          <span className="text-fuchsia-600">Fidelización</span>
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Configura los niveles de lealtad. Un cliente sube de nivel cuando cumple{' '}
          <strong>compras ≥ mínimo</strong> <em>o</em> <strong>monto ≥ mínimo</strong>.
        </p>
      </header>

      {loading ? (
        <div className="py-16 text-center text-sm text-slate-500">Cargando configuración…</div>
      ) : (
        <>
          {/* Tier preview cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {tiers.map((tier) => {
              const style = getTierStyle(tier.id)
              return (
                <div key={tier.id} className={`rounded-xl border-2 px-3 py-3 ${style.panel} ${style.border}`}>
                  <p className={`text-[10px] font-black uppercase tracking-widest ${tier.id === 'BLACK' ? 'text-yellow-400' : 'text-slate-500'}`}>
                    {tier.id}
                  </p>
                  <p className={`mt-1 text-sm font-bold ${tier.id === 'BLACK' ? 'text-white' : 'text-slate-800'}`}>
                    {tier.name}
                  </p>
                  {!tier.manual_only ? (
                    <p className={`mt-1 text-[11px] tabular-nums ${tier.id === 'BLACK' ? 'text-slate-400' : 'text-slate-500'}`}>
                      {tier.min_purchases > 0 ? `≥${tier.min_purchases} compras` : 'Base'}
                    </p>
                  ) : (
                    <p className={`mt-1 text-[11px] ${tier.id === 'BLACK' ? 'text-yellow-500' : 'text-slate-400'}`}>
                      Solo manual
                    </p>
                  )}
                </div>
              )
            })}
          </div>

          {/* Config table */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-800">Umbrales de nivel</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Edita el nombre y los mínimos de cada nivel. Los cambios se aplican a todos los clientes al instante.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Nivel</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Nombre visible</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Mín. compras</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Mín. monto ($)</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Solo manual</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {tiers.map((tier, i) => {
                    const style = getTierStyle(tier.id)
                    return (
                      <tr key={tier.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wide ${style.badge}`}>
                            {tier.id}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            value={tier.name}
                            onChange={(e) => update(i, 'name', e.target.value)}
                            className="h-8 w-28 rounded-md border border-slate-200 px-2 text-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min={0}
                            value={tier.min_purchases}
                            onChange={(e) => update(i, 'min_purchases', Number(e.target.value))}
                            className="h-8 w-24 rounded-md border border-slate-200 px-2 text-sm tabular-nums outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min={0}
                            value={tier.min_amount}
                            onChange={(e) => update(i, 'min_amount', Number(e.target.value))}
                            className="h-8 w-32 rounded-md border border-slate-200 px-2 text-sm tabular-nums outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={!!tier.manual_only}
                            onChange={(e) => update(i, 'manual_only', e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-fuchsia-600 focus:ring-fuchsia-500"
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end border-t border-slate-200 px-5 py-4">
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-md bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-fuchsia-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400 disabled:opacity-60"
              >
                <CheckCircle2 size={14} className={saving ? 'animate-pulse' : ''} />
                {saving ? 'Guardando…' : 'Guardar configuración'}
              </button>
            </div>
          </div>
        </>
      )}

      <Toasts toasts={toasts} onRemove={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </section>
  )
}
