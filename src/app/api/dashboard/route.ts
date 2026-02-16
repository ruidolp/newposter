import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { db } from '@/database/db'
import { requireTenant } from '@/lib/tenant'
import { sql } from 'kysely'

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const tenant = await requireTenant()

    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Products stats
    const [{ total: totalProducts }, { total: lowStockCount }] = await Promise.all([
      db.selectFrom('products')
        .select((eb) => eb.fn.countAll<number>().as('total'))
        .where('tenant_id', '=', tenant.id)
        .where('active', '=', true)
        .executeTakeFirstOrThrow(),
      db.selectFrom('products')
        .select((eb) => eb.fn.countAll<number>().as('total'))
        .where('tenant_id', '=', tenant.id)
        .where('active', '=', true)
        .where('track_stock', '=', true)
        .whereRef('stock', '<=', 'low_stock_alert')
        .executeTakeFirstOrThrow(),
    ])

    // Orders stats
    const [ordersToday, ordersMonth] = await Promise.all([
      db.selectFrom('orders')
        .select((eb) => [
          eb.fn.countAll<number>().as('count'),
          eb.fn.sum<string>('total').as('revenue'),
        ])
        .where('tenant_id', '=', tenant.id)
        .where('created_at', '>=', startOfDay)
        .executeTakeFirstOrThrow(),
      db.selectFrom('orders')
        .select((eb) => [
          eb.fn.countAll<number>().as('count'),
          eb.fn.sum<string>('total').as('revenue'),
        ])
        .where('tenant_id', '=', tenant.id)
        .where('created_at', '>=', startOfMonth)
        .executeTakeFirstOrThrow(),
    ])

    // Recent purchases (last 5)
    const recentPurchases = await db.selectFrom('purchases as p')
      .leftJoin('suppliers as s', 's.id', 'p.supplier_id')
      .select([
        'p.id', 'p.invoice_number', 'p.total_amount', 'p.status',
        'p.purchased_at', 's.name as supplier_name',
      ])
      .where('p.tenant_id', '=', tenant.id)
      .orderBy('p.purchased_at', 'desc')
      .limit(5)
      .execute()

    // Recent operation logs (last 8)
    const recentLogs = await db.selectFrom('operation_logs')
      .select(['id', 'action', 'entity_type', 'user_name', 'created_at'])
      .where('tenant_id', '=', tenant.id)
      .orderBy('created_at', 'desc')
      .limit(8)
      .execute()

    return NextResponse.json({
      products: {
        total: Number(totalProducts),
        lowStock: Number(lowStockCount),
      },
      orders: {
        today: { count: Number(ordersToday.count), revenue: Number(ordersToday.revenue ?? 0) },
        month: { count: Number(ordersMonth.count), revenue: Number(ordersMonth.revenue ?? 0) },
      },
      recentPurchases: recentPurchases.map((p) => ({
        ...p,
        total_amount: Number(p.total_amount),
      })),
      recentLogs,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
