import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { db } from '@/database/db'
import { requireTenant } from '@/lib/tenant'
import { DEFAULT_TIERS, calculateTier, type LoyaltyTier } from '@/lib/loyalty'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const tenant = await requireTenant()
    const { id } = await params

    // Load loyalty config
    const settings = await db
      .selectFrom('tenant_settings').select('metadata')
      .where('tenant_id', '=', tenant.id).executeTakeFirst()
    const meta = (settings?.metadata ?? {}) as Record<string, unknown>
    const tiers = (meta.loyalty_tiers as LoyaltyTier[] | undefined) ?? DEFAULT_TIERS

    // Customer + override
    const customer = await db
      .selectFrom('customers').select(['id', 'name', 'metadata'])
      .where('id', '=', id).where('tenant_id', '=', tenant.id)
      .executeTakeFirst()
    if (!customer) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })

    const custMeta = (customer.metadata ?? {}) as Record<string, unknown>
    const override = custMeta.loyalty_override as string | null | undefined

    // Order stats
    const statsRow = await db
      .selectFrom('orders')
      .select((eb) => [
        eb.fn.countAll<number>().as('total_orders'),
        eb.fn.sum<string>('total').as('total_amount'),
        eb.fn.max<string>('created_at').as('last_order_at'),
      ])
      .where('customer_id', '=', id)
      .where('tenant_id', '=', tenant.id)
      .where('status', '!=', 'CANCELLED')
      .executeTakeFirstOrThrow()

    const totalOrders = Number(statsRow.total_orders)
    const totalAmount = Number(statsRow.total_amount ?? 0)
    const lastOrderAt = statsRow.last_order_at as string | null

    // Tier
    const tier = calculateTier({ totalOrders, totalAmount }, tiers, override)

    // Last order items (top 3 by quantity)
    let lastOrderItems: { name: string; quantity: number }[] = []
    if (lastOrderAt) {
      const lastOrder = await db
        .selectFrom('orders')
        .select(['id', 'created_at', 'total'])
        .where('customer_id', '=', id)
        .where('tenant_id', '=', tenant.id)
        .where('status', '!=', 'CANCELLED')
        .orderBy('created_at', 'desc')
        .limit(1)
        .executeTakeFirst()

      if (lastOrder) {
        const items = await db
          .selectFrom('order_items as oi')
          .leftJoin('products as p', 'p.id', 'oi.product_id')
          .select(['p.name as product_name', 'oi.quantity'])
          .where('oi.order_id', '=', lastOrder.id)
          .orderBy('oi.quantity', 'desc')
          .limit(3)
          .execute()
        lastOrderItems = items.map((i) => ({ name: i.product_name ?? '—', quantity: i.quantity }))
      }
    }

    // Top 3 most purchased products
    const topProducts = await db
      .selectFrom('order_items as oi')
      .leftJoin('orders as o', 'o.id', 'oi.order_id')
      .leftJoin('products as p', 'p.id', 'oi.product_id')
      .select(['p.name as product_name'])
      .select((eb) => eb.fn.sum<number>('oi.quantity').as('total_qty'))
      .where('o.customer_id', '=', id)
      .where('o.tenant_id', '=', tenant.id)
      .where('o.status', '!=', 'CANCELLED')
      .groupBy(['p.id', 'p.name'])
      .orderBy('total_qty', 'desc')
      .limit(3)
      .execute()

    // Days since last order
    const daysSinceLastOrder = lastOrderAt
      ? Math.floor((Date.now() - new Date(lastOrderAt).getTime()) / 86400000)
      : null

    return NextResponse.json({
      tier_id: tier.id,
      tier_name: tier.name,
      total_orders: totalOrders,
      total_amount: totalAmount,
      last_order_at: lastOrderAt,
      days_since_last_order: daysSinceLastOrder,
      last_order_items: lastOrderItems,
      top_products: topProducts.map((p) => ({
        name: p.product_name ?? '—',
        total_qty: Number(p.total_qty),
      })),
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
