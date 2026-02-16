import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { db } from '@/database/db'
import { requireTenant } from '@/lib/tenant'

type JsonRecord = Record<string, unknown>

interface StorefrontBlock {
  id: string
  type: string
  title: string
  enabled: boolean
}

interface StorefrontColors {
  background: string
  surface: string
  primary: string
  accent: string
  text: string
  mutedText: string
}

interface StorefrontEditorConfig {
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

function isValidLogo(value: unknown): value is string {
  if (typeof value !== 'string') return false
  if (!value) return true
  return (
    /^https?:\/\/.+/i.test(value) ||
    /^data:image\/(png|jpeg|jpg|webp|svg\+xml);base64,/i.test(value)
  )
}

function isValidImage(value: unknown): value is string {
  if (typeof value !== 'string') return false
  if (!value) return true
  return (
    /^https?:\/\/.+/i.test(value) ||
    /^data:image\/(png|jpeg|jpg|webp|svg\+xml);base64,/i.test(value)
  )
}

function parseMetadata(input: unknown): JsonRecord {
  if (!input) return {}

  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input)
      return parsed && typeof parsed === 'object' ? (parsed as JsonRecord) : {}
    } catch {
      return {}
    }
  }

  if (typeof input === 'object') {
    return input as JsonRecord
  }

  return {}
}

function isValidHex(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9A-Fa-f]{6}$/.test(value)
}

function validateConfig(input: unknown): StorefrontEditorConfig | null {
  if (!input || typeof input !== 'object') return null

  const data = input as Record<string, unknown>
  const colors = data.colors as Record<string, unknown> | undefined
  const typography = data.typography as Record<string, unknown> | undefined
  const promoBar = data.promoBar as Record<string, unknown> | undefined
  const blocks = Array.isArray(data.blocks) ? data.blocks : []

  if (
    typeof data.presetId !== 'string' ||
    !isValidImage(data.heroImageUrl) ||
    !isValidImage(data.lookbookImageUrl) ||
    !colors ||
    !typography ||
    !promoBar ||
    typeof typography.headingFont !== 'string' ||
    typeof typography.bodyFont !== 'string' ||
    typeof promoBar.enabled !== 'boolean' ||
    typeof promoBar.text !== 'string' ||
    typeof promoBar.ctaLabel !== 'string' ||
    typeof promoBar.ctaHref !== 'string' ||
    !isValidHex(promoBar.background) ||
    !isValidHex(promoBar.textColor) ||
    !isValidHex(colors.background) ||
    !isValidHex(colors.surface) ||
    !isValidHex(colors.primary) ||
    !isValidHex(colors.accent) ||
    !isValidHex(colors.text) ||
    !isValidHex(colors.mutedText)
  ) {
    return null
  }

  const normalizedBlocks = blocks
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map((item) => ({
      id: typeof item.id === 'string' ? item.id : '',
      type: typeof item.type === 'string' ? item.type : '',
      title: typeof item.title === 'string' ? item.title : '',
      enabled: Boolean(item.enabled),
    }))
    .filter((item) => item.id && item.type && item.title)

  return {
    presetId: data.presetId,
    heroImageUrl: (data.heroImageUrl as string) ?? '',
    lookbookImageUrl: (data.lookbookImageUrl as string) ?? '',
    colors: {
      background: colors.background as string,
      surface: colors.surface as string,
      primary: colors.primary as string,
      accent: colors.accent as string,
      text: colors.text as string,
      mutedText: colors.mutedText as string,
    },
    typography: {
      headingFont: typography.headingFont,
      bodyFont: typography.bodyFont,
    },
    promoBar: {
      enabled: promoBar.enabled,
      text: promoBar.text,
      ctaLabel: promoBar.ctaLabel,
      ctaHref: promoBar.ctaHref,
      background: promoBar.background as string,
      textColor: promoBar.textColor as string,
    },
    blocks: normalizedBlocks,
  }
}

export async function GET() {
  try {
    const tenant = await requireTenant()

    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const settings = await db
      .selectFrom('tenant_settings')
      .select(['id', 'metadata', 'logo'])
      .where('tenant_id', '=', tenant.id)
      .executeTakeFirst()

    const metadata = parseMetadata(settings?.metadata)
    const editor = metadata.storefront_editor ?? null

    return NextResponse.json({ editor, logo: settings?.logo ?? '' })
  } catch {
    return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 404 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const tenant = await requireTenant()

    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const editor = validateConfig(body)
    const logo = typeof body?.logo === 'string' ? body.logo.trim() : ''

    if (!editor || !isValidLogo(logo)) {
      return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
    }

    const existing = await db
      .selectFrom('tenant_settings')
      .selectAll()
      .where('tenant_id', '=', tenant.id)
      .executeTakeFirst()

    const editorPayload = JSON.parse(JSON.stringify(editor)) as JsonRecord
    const metadata = {
      ...parseMetadata(existing?.metadata),
      storefront_editor: editorPayload,
    }

    if (existing) {
      await db
        .updateTable('tenant_settings')
        .set({
          metadata: metadata as any,
          logo: logo || null,
          updated_at: new Date(),
        })
        .where('tenant_id', '=', tenant.id)
        .execute()
    } else {
      await db
        .insertInto('tenant_settings')
        .values({
          tenant_id: tenant.id,
          language: 'es',
          currency: 'CLP',
          timezone: 'America/Santiago',
          logo: logo || null,
          metadata: metadata as any,
        })
        .execute()
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[storefront-theme PUT]', error)
    return NextResponse.json({ error: 'Error al guardar theme' }, { status: 500 })
  }
}
