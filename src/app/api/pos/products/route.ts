import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { db } from '@/database/db'
import { requireTenant } from '@/lib/tenant'

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const tenant = await requireTenant()
    const q = new URL(request.url).searchParams.get('q')?.trim() ?? ''

    let query = db
      .selectFrom('products')
      .select(['id', 'name', 'sku', 'barcode', 'base_price', 'stock', 'track_stock', 'low_stock_alert'])
      .where('tenant_id', '=', tenant.id)
      .where('active', '=', true)
      .orderBy('name', 'asc')
      .limit(40)

    if (q) {
      query = query.where((eb) =>
        eb.or([
          eb('name', 'ilike', `%${q}%`),
          eb('sku', 'ilike', `%${q}%`),
          eb('barcode', '=', q),
        ])
      )
    }

    const products = await query.execute()

    return NextResponse.json(
      products.map((p) => ({
        ...p,
        base_price: Number(p.base_price),
        stock: p.stock ?? 0,
      }))
    )
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
