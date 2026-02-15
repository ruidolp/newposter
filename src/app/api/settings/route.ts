import { NextRequest, NextResponse } from 'next/server'
import { requireTenant } from '@/lib/tenant'
import { db } from '@/database/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

export async function GET() {
  try {
    const tenant = await requireTenant()

    const settings = await db
      .selectFrom('tenant_settings')
      .selectAll()
      .where('tenant_id', '=', tenant.id)
      .executeTakeFirst()

    return NextResponse.json({ tenant, settings: settings ?? null })
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
    const {
      store_name,
      language,
      currency,
      timezone,
      country,
      currency_symbol,
      decimal_separator,
      thousand_separator,
      decimal_places,
    } = body

    // Update tenant name
    if (store_name) {
      await db
        .updateTable('tenants')
        .set({ name: store_name, updated_at: new Date() })
        .where('id', '=', tenant.id)
        .execute()
    }

    const metadata = {
      country: country ?? '',
      currency_symbol: currency_symbol ?? '',
      decimal_separator: decimal_separator ?? '.',
      thousand_separator: thousand_separator ?? ',',
      decimal_places: decimal_places ?? 2,
    }

    const existing = await db
      .selectFrom('tenant_settings')
      .select('id')
      .where('tenant_id', '=', tenant.id)
      .executeTakeFirst()

    if (existing) {
      await db
        .updateTable('tenant_settings')
        .set({
          language: language ?? 'es',
          currency: currency ?? 'CLP',
          timezone: timezone ?? 'America/Santiago',
          metadata: JSON.stringify(metadata),
          updated_at: new Date(),
        })
        .where('tenant_id', '=', tenant.id)
        .execute()
    } else {
      await db
        .insertInto('tenant_settings')
        .values({
          tenant_id: tenant.id,
          language: language ?? 'es',
          currency: currency ?? 'CLP',
          timezone: timezone ?? 'America/Santiago',
          metadata: JSON.stringify(metadata),
        })
        .execute()
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[settings PUT]', error)
    return NextResponse.json({ error: 'Error al guardar configuración' }, { status: 500 })
  }
}
