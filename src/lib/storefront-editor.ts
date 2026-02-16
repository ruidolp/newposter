export type StorefrontBlockType =
  | 'hero'
  | 'featured'
  | 'collections'
  | 'testimonials'
  | 'newsletter'
  | 'lookbook'

export interface StorefrontColors {
  background: string
  surface: string
  primary: string
  accent: string
  text: string
  mutedText: string
}

export interface StorefrontBlock {
  id: string
  type: StorefrontBlockType
  title: string
  enabled: boolean
}

export interface StorefrontEditorConfig {
  presetId: string
  colors: StorefrontColors
  blocks: StorefrontBlock[]
  heroImageUrl: string
  lookbookImageUrl: string
  typography: {
    headingFont: string
    bodyFont: string
  }
  promoBar: {
    enabled: boolean
    text: string
    ctaLabel: string
    ctaHref: string
    background: string
    textColor: string
  }
}

export const DEFAULT_STOREFRONT_EDITOR: StorefrontEditorConfig = {
  presetId: 'dawn-classic',
  colors: {
    background: '#F3F3F3',
    surface: '#FFFFFF',
    primary: '#111111',
    accent: '#E5E5E5',
    text: '#1C1B1B',
    mutedText: '#4A4A4A',
  },
  blocks: [
    { id: 'hero-default', type: 'hero', title: 'Hero principal', enabled: true },
    { id: 'featured-default', type: 'featured', title: 'Productos destacados', enabled: true },
    { id: 'collections-default', type: 'collections', title: 'Colecciones', enabled: true },
    { id: 'lookbook-default', type: 'lookbook', title: 'Shop the look', enabled: true },
    { id: 'newsletter-default', type: 'newsletter', title: 'Captura de leads', enabled: true },
  ],
  heroImageUrl: '',
  lookbookImageUrl: '',
  typography: {
    headingFont: `'Playfair Display', Georgia, serif`,
    bodyFont: `'Manrope', 'Segoe UI', sans-serif`,
  },
  promoBar: {
    enabled: true,
    text: 'Envio gratis + cambios sin costo en 30 dias',
    ctaLabel: 'Ver ofertas',
    ctaHref: '#productos',
    background: '#111111',
    textColor: '#FFFFFF',
  },
}

function parseJsonRecord(input: unknown): Record<string, unknown> {
  if (!input) return {}

  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input)
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {}
    } catch {
      return {}
    }
  }

  if (typeof input === 'object') {
    return input as Record<string, unknown>
  }

  return {}
}

function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9A-Fa-f]{6}$/.test(value)
}

function normalizeImageUrl(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim()
}

function normalizeTypography(input: unknown) {
  const data = input && typeof input === 'object' ? (input as Record<string, unknown>) : {}
  return {
    headingFont:
      typeof data.headingFont === 'string' && data.headingFont.trim()
        ? data.headingFont
        : DEFAULT_STOREFRONT_EDITOR.typography.headingFont,
    bodyFont:
      typeof data.bodyFont === 'string' && data.bodyFont.trim()
        ? data.bodyFont
        : DEFAULT_STOREFRONT_EDITOR.typography.bodyFont,
  }
}

function normalizePromoBar(input: unknown) {
  const data = input && typeof input === 'object' ? (input as Record<string, unknown>) : {}
  return {
    enabled: typeof data.enabled === 'boolean' ? data.enabled : DEFAULT_STOREFRONT_EDITOR.promoBar.enabled,
    text:
      typeof data.text === 'string' && data.text.trim()
        ? data.text
        : DEFAULT_STOREFRONT_EDITOR.promoBar.text,
    ctaLabel:
      typeof data.ctaLabel === 'string' && data.ctaLabel.trim()
        ? data.ctaLabel
        : DEFAULT_STOREFRONT_EDITOR.promoBar.ctaLabel,
    ctaHref:
      typeof data.ctaHref === 'string' && data.ctaHref.trim()
        ? data.ctaHref
        : DEFAULT_STOREFRONT_EDITOR.promoBar.ctaHref,
    background: isHexColor(data.background) ? data.background : DEFAULT_STOREFRONT_EDITOR.promoBar.background,
    textColor: isHexColor(data.textColor) ? data.textColor : DEFAULT_STOREFRONT_EDITOR.promoBar.textColor,
  }
}

function normalizeColors(input: unknown): StorefrontColors {
  const data = input && typeof input === 'object' ? (input as Record<string, unknown>) : {}
  const defaults = DEFAULT_STOREFRONT_EDITOR.colors

  return {
    background: isHexColor(data.background) ? data.background : defaults.background,
    surface: isHexColor(data.surface) ? data.surface : defaults.surface,
    primary: isHexColor(data.primary) ? data.primary : defaults.primary,
    accent: isHexColor(data.accent) ? data.accent : defaults.accent,
    text: isHexColor(data.text) ? data.text : defaults.text,
    mutedText: isHexColor(data.mutedText) ? data.mutedText : defaults.mutedText,
  }
}

function isBlockType(value: unknown): value is StorefrontBlockType {
  return (
    value === 'hero' ||
    value === 'featured' ||
    value === 'collections' ||
    value === 'testimonials' ||
    value === 'newsletter' ||
    value === 'lookbook'
  )
}

function normalizeBlocks(input: unknown): StorefrontBlock[] {
  if (!Array.isArray(input) || input.length === 0) {
    return DEFAULT_STOREFRONT_EDITOR.blocks
  }

  const normalized = input
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map((item, index) => {
      const type = isBlockType(item.type) ? item.type : null
      if (!type) return null

      const id = typeof item.id === 'string' && item.id ? item.id : `${type}-${index}`
      const title = typeof item.title === 'string' && item.title ? item.title : `Bloque ${type}`
      return {
        id,
        type,
        title,
        enabled: Boolean(item.enabled),
      }
    })
    .filter((item): item is StorefrontBlock => item !== null)

  return normalized.length > 0 ? normalized : DEFAULT_STOREFRONT_EDITOR.blocks
}

export function extractStorefrontEditorConfig(metadata: unknown): StorefrontEditorConfig {
  const parsedMetadata = parseJsonRecord(metadata)
  const rawEditor = parseJsonRecord(parsedMetadata.storefront_editor)

  return {
    presetId:
      typeof rawEditor.presetId === 'string' && rawEditor.presetId
        ? rawEditor.presetId
        : DEFAULT_STOREFRONT_EDITOR.presetId,
    colors: normalizeColors(rawEditor.colors),
    blocks: normalizeBlocks(rawEditor.blocks),
    heroImageUrl: normalizeImageUrl(rawEditor.heroImageUrl),
    lookbookImageUrl: normalizeImageUrl(rawEditor.lookbookImageUrl),
    typography: normalizeTypography(rawEditor.typography),
    promoBar: normalizePromoBar(rawEditor.promoBar),
  }
}
