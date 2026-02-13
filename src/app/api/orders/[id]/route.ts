import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/database/db'
import { requireTenant } from '@/lib/tenant'

// GET /api/orders/[id] - Get single order with items
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenant = await requireTenant()
    const { id } = await params

    const order = await db
      .selectFrom('orders')
      .selectAll()
      .where('id', '=', id)
      .where('tenant_id', '=', tenant.id as any)
      .executeTakeFirst()

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Get order items with product details
    const items = await db
      .selectFrom('order_items as oi')
      .innerJoin('products as p', 'p.id', 'oi.product_id')
      .select([
        'oi.id',
        'oi.product_id',
        'oi.quantity',
        'oi.unit_price',
        'oi.subtotal',
        'oi.metadata',
        'p.name as product_name',
        'p.sku as product_sku',
      ])
      .where('oi.order_id', '=', id)
      .execute()

    return NextResponse.json({
      ...order,
      items,
    })
  } catch (error) {
    console.error('Error fetching order:', error)
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    )
  }
}

// PATCH /api/orders/[id] - Update order status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenant = await requireTenant()
    const { id } = await params
    const body = await request.json()

    const updateData: any = {}

    if (body.status !== undefined) {
      updateData.status = body.status

      // If status is COMPLETED, set completed_at
      if (body.status === 'COMPLETED') {
        updateData.completed_at = new Date()
      }
    }

    if (body.payment_status !== undefined) {
      updateData.payment_status = body.payment_status
    }

    if (body.payment_method !== undefined) {
      updateData.payment_method = body.payment_method
    }

    const order = await db
      .updateTable('orders')
      .set(updateData)
      .where('id', '=', id)
      .where('tenant_id', '=', tenant.id as any)
      .returningAll()
      .executeTakeFirst()

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error('Error updating order:', error)
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    )
  }
}
