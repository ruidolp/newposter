import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { db } from '@/database/db'
import { requireTenant } from '@/lib/tenant'
import { DEFAULT_TIERS, type LoyaltyTier } from '@/lib/loyalty'

export async function GET() {
  try {
    const tenant = await requireTenant()
    const settings = await db
      .selectFrom('tenant_settings')
      .select('metadata')
      .where('tenant_id', '=', tenant.id)
      .executeTakeFirst()

    const meta = (settings?.metadata ?? {}) as Record<string, unknown>
    const tiers = (meta.loyalty_tiers as LoyaltyTier[] | undefined) ?? DEFAULT_TIERS

    return NextResponse.json({ tiers })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })
    if (!token || !['ADMIN', 'OWNER'].includes(token.role as string)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const tenant = await requireTenant()
    const { tiers } = await request.json() as { tiers: LoyaltyTier[] }

    if (!Array.isArray(tiers) || tiers.length < 2) {
      return NextResponse.json({ error: 'Configuración inválida' }, { status: 400 })
    }

    const existing = await db
      .selectFrom('tenant_settings')
      .select(['id', 'metadata'])
      .where('tenant_id', '=', tenant.id)
      .executeTakeFirst()

    const prevMeta = (existing?.metadata ?? {}) as Record<string, unknown>
    const newMeta = { ...prevMeta, loyalty_tiers: tiers }

    if (existing) {
      await db.updateTable('tenant_settings')
        .set({ metadata: JSON.stringify(newMeta), updated_at: new Date() })
        .where('tenant_id', '=', tenant.id)
        .execute()
    } else {
      await db.insertInto('tenant_settings')
        .values({ tenant_id: tenant.id, metadata: JSON.stringify(newMeta) })
        .execute()
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Error al guardar' }, { status: 500 })
  }
}
