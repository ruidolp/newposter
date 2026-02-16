export interface LoyaltyTier {
  id: string
  name: string
  min_purchases: number
  min_amount: number
  manual_only?: boolean
}

export const DEFAULT_TIERS: LoyaltyTier[] = [
  { id: 'MEMBER',   name: 'Member',   min_purchases: 0,  min_amount: 0 },
  { id: 'SILVER',   name: 'Silver',   min_purchases: 3,  min_amount: 50000 },
  { id: 'GOLD',     name: 'Gold',     min_purchases: 8,  min_amount: 200000 },
  { id: 'PLATINUM', name: 'Platinum', min_purchases: 20, min_amount: 500000 },
  { id: 'BLACK',    name: 'Black',    min_purchases: 999, min_amount: 9999999, manual_only: true },
]

// Priority order: highest first
const TIER_ORDER = ['BLACK', 'PLATINUM', 'GOLD', 'SILVER', 'MEMBER']

export function calculateTier(
  stats: { totalOrders: number; totalAmount: number },
  tiers: LoyaltyTier[],
  override?: string | null
): LoyaltyTier {
  // Manual override (e.g. BLACK assigned by owner)
  if (override) {
    const found = tiers.find((t) => t.id === override)
    if (found) return found
  }

  // Evaluate from highest to lowest, skip manual_only
  for (const id of TIER_ORDER) {
    const tier = tiers.find((t) => t.id === id)
    if (!tier || tier.manual_only) continue
    if (
      stats.totalOrders >= tier.min_purchases ||
      stats.totalAmount >= tier.min_amount
    ) {
      return tier
    }
  }

  return tiers.find((t) => t.id === 'MEMBER') ?? tiers[0]
}

// ── Visual config per tier (fixed, not configurable) ─────────────────────────

export interface TierStyle {
  badge: string        // badge classes
  panel: string        // panel wrapper classes in POS
  border: string       // border color class
  dot: string          // dot color
  label: string        // human label
}

export const TIER_STYLES: Record<string, TierStyle> = {
  MEMBER: {
    badge:  'bg-slate-100 text-slate-600 border border-slate-300',
    panel:  'bg-white border-slate-200',
    border: 'border-slate-200',
    dot:    'bg-slate-400',
    label:  'Member',
  },
  SILVER: {
    badge:  'bg-slate-200 text-slate-700 border border-slate-400',
    panel:  'bg-slate-50 border-slate-400',
    border: 'border-slate-400',
    dot:    'bg-slate-500',
    label:  'Silver',
  },
  GOLD: {
    badge:  'bg-amber-100 text-amber-800 border border-amber-400',
    panel:  'bg-amber-50 border-amber-400',
    border: 'border-amber-400',
    dot:    'bg-amber-500',
    label:  'Gold',
  },
  PLATINUM: {
    badge:  'bg-violet-100 text-violet-800 border border-violet-500',
    panel:  'bg-violet-50 border-violet-400',
    border: 'border-violet-400',
    dot:    'bg-violet-600',
    label:  'Platinum',
  },
  BLACK: {
    badge:  'bg-slate-900 text-yellow-400 border border-yellow-500',
    panel:  'bg-slate-900 border-yellow-500',
    border: 'border-yellow-500',
    dot:    'bg-yellow-400',
    label:  'Black',
  },
}

export function getTierStyle(tierId: string): TierStyle {
  return TIER_STYLES[tierId] ?? TIER_STYLES.MEMBER
}
