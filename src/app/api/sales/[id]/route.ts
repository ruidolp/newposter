import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { db } from '@/database/db'
import { requireTenant } from '@/lib/tenant'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const tenant = await requireTenant()
    const { id } = await params

    const order = await db
      .selectFrom('orders as o')
      .leftJoin('customers as c', 'c.id', 'o.customer_id')
      .select([
        'o.id', 'o.order_number', 'o.total', 'o.subtotal',
        'o.payment_method', 'o.payment_status', 'o.status',
        'o.channel', 'o.created_at', 'o.completed_at',
        'c.name as customer_name',
      ])
      .where('o.id', '=', id)
      .where('o.tenant_id', '=', tenant.id)
      .executeTakeFirst()

    if (!order) return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 })

    const items = await db
      .selectFrom('order_items as oi')
      .leftJoin('products as p', 'p.id', 'oi.product_id')
      .select([
        'oi.id', 'oi.quantity', 'oi.unit_price', 'oi.subtotal',
        'p.name as product_name', 'p.sku',
      ])
      .where('oi.order_id', '=', id)
      .execute()

    return NextResponse.json({
      ...order,
      total: Number(order.total),
      subtotal: Number(order.subtotal),
      items: items.map((i) => ({
        ...i,
        unit_price: Number(i.unit_price),
        subtotal: Number(i.subtotal),
      })),
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// PATCH /api/sales/[id] — void a sale (ADMIN/OWNER only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    // All authenticated roles can process returns/voids

    const tenant = await requireTenant()
    const { id } = await params
    const { action } = await request.json()
    if (action !== 'void') return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })

    const order = await db
      .selectFrom('orders')
      .select(['id', 'status'])
      .where('id', '=', id)
      .where('tenant_id', '=', tenant.id)
      .executeTakeFirst()

    if (!order) return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 })
    if (order.status === 'CANCELLED') {
      return NextResponse.json({ error: 'La venta ya fue anulada' }, { status: 400 })
    }

    // Restore stock
    const items = await db
      .selectFrom('order_items')
      .select(['product_id', 'quantity'])
      .where('order_id', '=', id)
      .execute()

    for (const item of items) {
      if (!item.product_id) continue
      const product = await db
        .selectFrom('products')
        .select(['id', 'stock', 'track_stock'])
        .where('id', '=', item.product_id)
        .executeTakeFirst()
      if (!product?.track_stock) continue

      const prevStock = product.stock ?? 0
      const newStock = prevStock + item.quantity

      await db
        .updateTable('products')
        .set({ stock: newStock, updated_at: new Date() })
        .where('id', '=', item.product_id)
        .execute()

      await db.insertInto('stock_movements').values({
        tenant_id: tenant.id,
        product_id: item.product_id,
        type: 'VOID',
        quantity: item.quantity,
        previous_stock: prevStock,
        new_stock: newStock,
        reference_id: id,
        reference_type: 'order_void',
        created_by: token.sub as string,
      }).execute()
    }

    // Cancel order
    await db
      .updateTable('orders')
      .set({ status: 'CANCELLED', payment_status: 'VOIDED' })
      .where('id', '=', id)
      .execute()

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Error al anular la venta' }, { status: 500 })
  }
}
