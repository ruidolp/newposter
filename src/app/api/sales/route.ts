import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { db } from '@/database/db'
import { requireTenant } from '@/lib/tenant'

/** Returns the ms offset (UTC - local) for a given timezone at this moment.
 *  e.g. Chile UTC-3 → +10_800_000  */
function tzOffsetMs(tz: string): number {
  const now = new Date()
  // sv locale always gives "YYYY-MM-DD HH:MM:SS"
  const localStr = now.toLocaleString('sv', { timeZone: tz })
  const localDate = new Date(localStr.replace(' ', 'T') + 'Z')
  return now.getTime() - localDate.getTime()
}

/** Start/end Date objects for a calendar day in a given timezone */
function dayBoundsInTZ(dateStr: string, tz: string) {
  const offset = tzOffsetMs(tz)
  const start = new Date(new Date(`${dateStr}T00:00:00.000Z`).getTime() + offset)
  const end   = new Date(new Date(`${dateStr}T23:59:59.999Z`).getTime() + offset)
  return { start, end }
}

/** Today's date string (YYYY-MM-DD) in a given timezone */
function todayInTZ(tz: string): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: tz })
}

/** Date string N days before today in a given timezone */
function daysAgoInTZ(n: number, tz: string): string {
  const now = new Date()
  const d = new Date(now.getTime() - n * 86_400_000)
  return d.toLocaleDateString('en-CA', { timeZone: tz })
}

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const tenant = await requireTenant()
    const { searchParams } = new URL(request.url)
    const mine  = searchParams.get('mine') === 'true'
    const range = searchParams.get('range') ?? 'today'   // today | week | month

    if (!mine && !['ADMIN', 'OWNER'].includes(token.role as string)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // Load tenant timezone
    const settings = await db
      .selectFrom('tenant_settings')
      .select('timezone')
      .where('tenant_id', '=', tenant.id)
      .executeTakeFirst()
    const tz = settings?.timezone ?? 'UTC'

    // Compute date range
    const todayStr = todayInTZ(tz)
    const { end }  = dayBoundsInTZ(todayStr, tz)

    let start: Date
    if (range === 'week') {
      const fromStr = daysAgoInTZ(6, tz)
      start = dayBoundsInTZ(fromStr, tz).start
    } else if (range === 'month') {
      const fromStr = daysAgoInTZ(29, tz)
      start = dayBoundsInTZ(fromStr, tz).start
    } else {
      start = dayBoundsInTZ(todayStr, tz).start
    }

    let query = db
      .selectFrom('orders as o')
      .leftJoin('customers as c', 'c.id', 'o.customer_id')
      .select([
        'o.id',
        'o.order_number',
        'o.total',
        'o.status',
        'o.payment_method',
        'o.payment_status',
        'o.channel',
        'o.location_id',
        'o.created_at',
        'c.name as customer_name',
      ])
      .where('o.tenant_id', '=', tenant.id)
      .where('o.created_at', '>=', start)
      .where('o.created_at', '<=', end)
      .orderBy('o.created_at', 'desc')

    if (mine) {
      const userMovements = await db
        .selectFrom('stock_movements')
        .select('reference_id')
        .where('tenant_id', '=', tenant.id)
        .where('reference_type', '=', 'order')
        .where('created_by', '=', token.sub as string)
        .where('created_at', '>=', start)
        .where('created_at', '<=', end)
        .execute()

      const ids = [...new Set(userMovements.map((r) => r.reference_id).filter(Boolean))] as string[]
      if (ids.length === 0) return NextResponse.json({ sales: [], total_revenue: 0, count: 0 })
      query = query.where('o.id', 'in', ids)
    }

    const rows = await query.execute()

    const orderIds = rows.map((r) => r.id)
    const itemCounts =
      orderIds.length > 0
        ? await db
            .selectFrom('order_items')
            .select(['order_id'])
            .select((eb) => eb.fn.sum<number>('quantity').as('items_count'))
            .where('order_id', 'in', orderIds)
            .groupBy('order_id')
            .execute()
        : []

    const countMap = Object.fromEntries(itemCounts.map((r) => [r.order_id, Number(r.items_count)]))

    const sales = rows.map((r) => ({
      id: r.id,
      order_number: r.order_number,
      total: Number(r.total),
      status: r.status,
      payment_method: r.payment_method,
      channel: r.channel,
      location_id: r.location_id,
      customer_name: r.customer_name ?? null,
      items_count: countMap[r.id] ?? 0,
      created_at: r.created_at,
    }))

    const active = sales.filter((s) => s.status !== 'CANCELLED')
    const total_revenue = active.reduce((s, r) => s + r.total, 0)

    return NextResponse.json({ sales, total_revenue, count: active.length, timezone: tz })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
