import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { db } from '@/database/db'
import { requireTenant } from '@/lib/tenant'
import { logOperation } from '@/lib/operation-log'

async function getAnyToken(request: NextRequest) {
  return getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })
}

async function getAdminToken(request: NextRequest) {
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })
  if (!token || !['ADMIN', 'OWNER'].includes(token.role as string)) return null
  return token
}

// GET /api/customers — listar clientes
export async function GET(request: NextRequest) {
  try {
    const token = await getAnyToken(request)
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const tenant = await requireTenant()
    const { searchParams } = new URL(request.url)
    // Support both ?search= (admin table) and ?q= (POS selector)
    const search = searchParams.get('search') || searchParams.get('q') || ''
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = (page - 1) * limit
    const withStats = searchParams.get('with_stats') === 'true'

    let query = db
      .selectFrom('customers')
      .selectAll()
      .where('tenant_id', '=', tenant.id as any)
      .orderBy('name', 'asc')

    if (search) {
      query = query.where((eb) =>
        eb.or([
          eb('name', 'ilike', `%${search}%`),
          eb('email', 'ilike', `%${search}%`),
          eb('rut', 'ilike', `%${search}%`),
          eb('phone', 'ilike', `%${search}%`),
        ])
      )
    }

    const customers = await query.limit(limit).offset(offset).execute()

    const countResult = await db
      .selectFrom('customers')
      .select(db.fn.countAll<number>().as('count'))
      .where('tenant_id', '=', tenant.id as any)
      .executeTakeFirst()

    // Optionally enrich with order stats + tier
    if (withStats && customers.length > 0) {
      const { DEFAULT_TIERS, calculateTier } = await import('@/lib/loyalty')
      const settingsRow = await db
        .selectFrom('tenant_settings').select('metadata')
        .where('tenant_id', '=', tenant.id).executeTakeFirst()
      const meta = (settingsRow?.metadata ?? {}) as Record<string, unknown>
      const { loyalty_tiers: tiers = DEFAULT_TIERS } = meta as any

      const ids = customers.map((c) => c.id)
      const statsRows = await db
        .selectFrom('orders')
        .select((eb) => [
          'customer_id',
          eb.fn.countAll<number>().as('total_orders'),
          eb.fn.sum<string>('total').as('total_amount'),
        ])
        .where('tenant_id', '=', tenant.id)
        .where('status', '!=', 'CANCELLED')
        .where('customer_id', 'in', ids)
        .groupBy('customer_id')
        .execute()

      const statsMap = Object.fromEntries(
        statsRows.map((r) => [r.customer_id, { totalOrders: Number(r.total_orders), totalAmount: Number(r.total_amount ?? 0) }])
      )

      const enriched = customers.map((c) => {
        const stats = statsMap[c.id] ?? { totalOrders: 0, totalAmount: 0 }
        const custMeta = (c.metadata ?? {}) as Record<string, unknown>
        const override = custMeta.loyalty_override as string | undefined
        const tier = calculateTier(stats, tiers, override)
        return { ...c, total_orders: stats.totalOrders, total_amount: stats.totalAmount, tier_id: tier.id, tier_name: tier.name }
      })

      return NextResponse.json({ customers: enriched, total: Number(countResult?.count ?? 0) })
    }

    return NextResponse.json({ customers, total: Number(countResult?.count ?? 0) })
  } catch (error) {
    console.error('[customers:GET]', error)
    return NextResponse.json({ error: 'Error al obtener clientes' }, { status: 500 })
  }
}

// POST /api/customers — crear cliente
export async function POST(request: NextRequest) {
  try {
    const token = await getAnyToken(request)
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const tenant = await requireTenant()
    const body = await request.json()

    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })
    }

    // Verificar email único si se provee
    if (body.email?.trim()) {
      const existing = await db
        .selectFrom('customers')
        .select('id')
        .where('tenant_id', '=', tenant.id as any)
        .where('email', '=', body.email.trim().toLowerCase())
        .executeTakeFirst()

      if (existing) {
        return NextResponse.json({ error: 'Ya existe un cliente con ese email' }, { status: 409 })
      }
    }

    // Verificar RUT único si se provee
    if (body.rut?.trim()) {
      const existingRut = await db
        .selectFrom('customers')
        .select('id')
        .where('tenant_id', '=', tenant.id as any)
        .where('rut', '=', body.rut.trim().toUpperCase())
        .executeTakeFirst()

      if (existingRut) {
        return NextResponse.json({ error: 'Ya existe un cliente con ese RUT' }, { status: 409 })
      }
    }

    const customer = await db
      .insertInto('customers')
      .values({
        tenant_id: tenant.id as any,
        name: body.name.trim(),
        email: body.email?.trim().toLowerCase() || null,
        rut: body.rut?.trim().toUpperCase() || null,
        phone: body.phone?.trim() || null,
        address: body.address?.trim() || null,
      })
      .returningAll()
      .executeTakeFirstOrThrow()

    await logOperation({
      tenantId: tenant.id,
      userId: token.id as string,
      userName: token.name as string,
      action: 'CREATE_CUSTOMER',
      entityType: 'customer',
      entityId: customer.id,
      detail: { name: customer.name, email: customer.email, rut: customer.rut, phone: customer.phone },
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
    })

    return NextResponse.json(customer, { status: 201 })
  } catch (error) {
    console.error('[customers:POST]', error)
    return NextResponse.json({ error: 'Error al crear cliente' }, { status: 500 })
  }
}
