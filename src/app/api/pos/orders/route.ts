import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { db } from '@/database/db'
import { requireTenant } from '@/lib/tenant'

interface OrderItem {
  product_id: string
  name: string
  quantity: number
  unit_price: number
}

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const tenant = await requireTenant()
    const body = await request.json()
    const { items, customer_id, payment_method, amount_paid, pos_session_id, location_id } = body as {
      items: OrderItem[]
      customer_id?: string
      payment_method: string
      amount_paid?: number
      pos_session_id?: string
      location_id?: string
    }

    if (!items?.length) return NextResponse.json({ error: 'El carro está vacío' }, { status: 400 })
    if (!payment_method) return NextResponse.json({ error: 'Método de pago requerido' }, { status: 400 })

    // Verify stock for all items
    const productIds = items.map((i) => i.product_id)
    const products = await db
      .selectFrom('products')
      .select(['id', 'name', 'stock', 'track_stock'])
      .where('id', 'in', productIds)
      .where('tenant_id', '=', tenant.id)
      .execute()

    for (const item of items) {
      const product = products.find((p) => p.id === item.product_id)
      if (!product) return NextResponse.json({ error: `Producto no encontrado: ${item.name}` }, { status: 400 })
      if (product.track_stock && (product.stock ?? 0) < item.quantity) {
        return NextResponse.json(
          { error: `Stock insuficiente para "${product.name}". Disponible: ${product.stock ?? 0}` },
          { status: 400 }
        )
      }
    }

    const subtotal = items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0)
    const total = subtotal

    // Generate order number
    const count = await db
      .selectFrom('orders')
      .select((eb) => eb.fn.countAll<number>().as('c'))
      .where('tenant_id', '=', tenant.id)
      .executeTakeFirstOrThrow()
    const orderNumber = `POS-${String(Number(count.c) + 1).padStart(5, '0')}`

    // Create order
    const order = await db
      .insertInto('orders')
      .values({
        tenant_id: tenant.id,
        order_number: orderNumber,
        customer_id: customer_id ?? null,
        subtotal,
        total,
        status: 'COMPLETED',
        payment_method,
        payment_status: 'PAID',
        channel: 'POS',
        completed_at: new Date(),
        pos_session_id: pos_session_id ?? null,
        location_id: location_id ?? null,
      })
      .returning(['id', 'order_number', 'total', 'created_at'])
      .executeTakeFirstOrThrow()

    // Create order items + update stock
    for (const item of items) {
      const product = products.find((p) => p.id === item.product_id)!

      await db.insertInto('order_items').values({
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.unit_price * item.quantity,
      }).execute()

      if (product.track_stock) {
        const prevStock = product.stock ?? 0
        const newStock = prevStock - item.quantity

        await db
          .updateTable('products')
          .set({ stock: newStock, updated_at: new Date() })
          .where('id', '=', item.product_id)
          .execute()

        await db.insertInto('stock_movements').values({
          tenant_id: tenant.id,
          product_id: item.product_id,
          type: 'SALE',
          quantity: -item.quantity,
          previous_stock: prevStock,
          new_stock: newStock,
          reference_id: order.id,
          reference_type: 'order',
          created_by: token.sub as string,
        }).execute()
      }
    }

    return NextResponse.json({
      order_number: order.order_number,
      total: Number(order.total),
      payment_method,
      amount_paid: amount_paid ?? Number(order.total),
      change: amount_paid ? Math.max(0, amount_paid - Number(order.total)) : 0,
      items_count: items.reduce((s, i) => s + i.quantity, 0),
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Error al registrar la venta' }, { status: 500 })
  }
}
