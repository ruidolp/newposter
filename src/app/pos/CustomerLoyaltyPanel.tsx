'use client'

import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, ShoppingBag, Star, Clock } from 'lucide-react'
import { getTierStyle } from '@/lib/loyalty'
import type { CustomerSnap } from './CustomerSelector'

interface Profile {
  tier_id: string
  tier_name: string
  total_orders: number
  total_amount: number
  last_order_at: string | null
  days_since_last_order: number | null
  last_order_items: { name: string; quantity: number }[]
  top_products: { name: string; total_qty: number }[]
}

interface Props {
  customer: CustomerSnap
}

function daysLabel(days: number | null): string {
  if (days === null) return 'Sin compras'
  if (days === 0) return 'Hoy'
  if (days === 1) return 'Ayer'
  if (days < 7) return `Hace ${days} días`
  if (days < 30) return `Hace ${Math.floor(days / 7)} sem.`
  if (days < 365) return `Hace ${Math.floor(days / 30)} meses`
  return `Hace más de un año`
}

export default function CustomerLoyaltyPanel({ customer }: Props) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    setLoading(true)
    setProfile(null)
    fetch(`/api/customers/${customer.id}/profile`)
      .then((r) => r.json())
      .then((d) => { if (!d.error) setProfile(d) })
      .finally(() => setLoading(false))
  }, [customer.id])

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-200 border-t-fuchsia-500" aria-hidden="true" />
        <span className="text-xs text-slate-400">Cargando perfil…</span>
      </div>
    )
  }

  if (!profile) return null

  const style = getTierStyle(profile.tier_id)
  const isBlack = profile.tier_id === 'BLACK'

  return (
    <div className={`overflow-hidden rounded-xl border-2 transition-all ${style.panel} ${style.border}`}>
      {/* Always visible: tier + last visit */}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        aria-label={`Perfil de ${customer.name}, ${expanded ? 'colapsar' : 'expandir'}`}
        className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500 ${isBlack ? 'text-white' : ''}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {/* Tier badge — visible al cliente si mira */}
          <span className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-black tracking-wide uppercase ${style.badge}`}>
            {profile.tier_name}
          </span>
          {/* Last visit — info sutil */}
          {profile.days_since_last_order !== null && (
            <span className={`truncate text-xs ${isBlack ? 'text-slate-300' : 'text-slate-500'}`}>
              {daysLabel(profile.days_since_last_order)}
            </span>
          )}
        </div>
        <div className={`shrink-0 ${isBlack ? 'text-slate-400' : 'text-slate-400'}`}>
          {expanded
            ? <ChevronUp size={14} aria-hidden="true" />
            : <ChevronDown size={14} aria-hidden="true" />}
        </div>
      </button>

      {/* Expandable detail — cajero decide abrirlo */}
      {expanded && (
        <div className={`border-t px-3 pb-3 pt-2 space-y-3 ${isBlack ? 'border-slate-700' : 'border-slate-100'}`}>

          {/* Last purchase */}
          {profile.last_order_items.length > 0 && (
            <div>
              <p className={`mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide ${isBlack ? 'text-slate-400' : 'text-slate-400'}`}>
                <Clock size={10} aria-hidden="true" />
                Última compra
              </p>
              <ul className="space-y-0.5">
                {profile.last_order_items.map((item, i) => (
                  <li key={i} className={`flex items-baseline justify-between gap-2 text-xs ${isBlack ? 'text-slate-200' : 'text-slate-700'}`}>
                    <span className="truncate">{item.name}</span>
                    <span className={`shrink-0 tabular-nums font-medium ${isBlack ? 'text-slate-400' : 'text-slate-400'}`}>×{item.quantity}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Top products */}
          {profile.top_products.length > 0 && (
            <div>
              <p className={`mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide ${isBlack ? 'text-slate-400' : 'text-slate-400'}`}>
                <Star size={10} aria-hidden="true" />
                Lo que más compra
              </p>
              <ul className="space-y-0.5">
                {profile.top_products.map((p, i) => (
                  <li key={i} className={`flex items-baseline justify-between gap-2 text-xs ${isBlack ? 'text-slate-200' : 'text-slate-700'}`}>
                    <span className="truncate">{p.name}</span>
                    <span className={`shrink-0 tabular-nums font-medium ${isBlack ? 'text-slate-400' : 'text-slate-400'}`}>{p.total_qty} veces</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Visits count */}
          <div className={`flex items-center gap-1.5 text-xs ${isBlack ? 'text-slate-300' : 'text-slate-500'}`}>
            <ShoppingBag size={11} aria-hidden="true" />
            <span className="tabular-nums font-semibold">{profile.total_orders}</span>
            {profile.total_orders === 1 ? 'visita en total' : 'visitas en total'}
          </div>

          {profile.total_orders === 0 && (
            <p className={`text-xs ${isBlack ? 'text-slate-400' : 'text-slate-400'}`}>
              Sin compras registradas aún
            </p>
          )}
        </div>
      )}
    </div>
  )
}
