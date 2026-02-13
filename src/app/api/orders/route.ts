import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/database/db'
import { requireTenant } from '@/lib/tenant'
import { beforeCreateOrder, afterCreateOrder, calculateOrderTotal } from '@/lib/extensions/hooks'
import { generateOrderNumber } from '@/lib/utils'

// GET /api/orders - List all orders
export async function GET(request: NextRequest) {
  try {
    const tenant = await requireTenant()
    const { searchParams } = new URL(request.url)

    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const status = searchParams.get('status')
    const channel = searchParams.get('channel')

    let query = db
      .selectFrom('orders')
      .selectAll()
      .where('tenant_id', '=', tenant.id as any)
      .orderBy('created_at', 'desc')

    // Apply filters
    if (status) {
      query = query.where('status', '=', status)
    }

    if (channel) {
      query = query.where('channel', '=', channel)
    }

    // Pagination
    const offset = (page - 1) * limit
    query = query.limit(limit).offset(offset)

    const orders = await query.execute()

    return NextResponse.json({
      orders,
      page,
      limit,
      total: orders.length,
    })
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}

// POST /api/orders - Create new order
export async function POST(request: NextRequest) {
  try {
    const tenant = await requireTenant()
    const body = await request.json()

    // Validate required fields
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: 'Order must have at least one item' },
        { status: 400 }
      )
    }

    // Start transaction
    const result = await db.transaction().execute(async (trx) => {
      // Calculate totals
      let subtotal = 0
      const validatedItems = []

      for (const item of body.items) {
        // Get product
        const product = await trx
          .selectFrom('products')
          .selectAll()
          .where('id', '=', item.product_id)
          .where('tenant_id', '=', tenant.id as any)
          .executeTakeFirst()

        if (!product) {
          throw new Error(`Product ${item.product_id} not found`)
        }

        if (!product.active) {
          throw new Error(`Product ${product.name} is not active`)
        }

        // Check stock
        if (product.track_stock && product.stock !== null && product.stock < item.quantity) {
          throw new Error(`Insufficient stock for ${product.name}`)
        }

        const itemSubtotal = parseFloat(product.base_price) * item.quantity
        subtotal += itemSubtotal

        validatedItems.push({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: product.base_price,
          subtotal: itemSubtotal,
          metadata: item.metadata || {},
        })
      }

      // Apply extensions hooks for total calculation
      const orderData = await calculateOrderTotal(
        {
          subtotal,
          tax: body.tax || 0,
          discount: body.discount || 0,
          items: validatedItems,
        },
        tenant.id as string
      )

      const total = orderData.subtotal + orderData.tax - orderData.discount

      // Execute beforeCreate hook
      const processedOrderData = await beforeCreateOrder(
        {
          ...body,
          subtotal: orderData.subtotal,
          tax: orderData.tax,
          discount: orderData.discount,
          total,
        },
        tenant.id as string
      )

      // Create order
      const order = await trx
        .insertInto('orders')
        .values({
          tenant_id: tenant.id as any,
          customer_id: processedOrderData.customer_id || null,
          order_number: generateOrderNumber(),
          subtotal: processedOrderData.subtotal.toString(),
          tax: processedOrderData.tax.toString(),
          discount: processedOrderData.discount.toString(),
          total: processedOrderData.total.toString(),
          status: processedOrderData.status || 'PENDING',
          channel: processedOrderData.channel || 'POS',
          payment_method: processedOrderData.payment_method || null,
          payment_status: processedOrderData.payment_status || 'PENDING',
          metadata: JSON.stringify(processedOrderData.metadata || {}) as any,
        })
        .returningAll()
        .executeTakeFirstOrThrow()

      // Create order items
      for (const item of validatedItems) {
        await trx
          .insertInto('order_items')
          .values({
            order_id: order.id as any,
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.unit_price.toString(),
            subtotal: item.subtotal.toString(),
            metadata: JSON.stringify(item.metadata) as any,
          })
          .execute()

        // Update stock
        await trx
          .updateTable('products')
          .set((eb) => ({
            stock: eb('stock', '-', item.quantity),
          }))
          .where('id', '=', item.product_id)
          .where('track_stock', '=', true)
          .execute()

        // Create stock movement
        const product = await trx
          .selectFrom('products')
          .select(['stock'])
          .where('id', '=', item.product_id)
          .executeTakeFirst()

        if (product && product.stock !== null) {
          await trx
            .insertInto('stock_movements')
            .values({
              tenant_id: tenant.id as any,
              product_id: item.product_id,
              type: 'SALE',
              quantity: -item.quantity,
              previous_stock: product.stock + item.quantity,
              new_stock: product.stock,
              reference_type: 'order',
              reference_id: order.id as any,
            })
            .execute()
        }
      }

      return order
    })

    // Execute afterCreate hook
    await afterCreateOrder(result, tenant.id as any)

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Error creating order:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create order' },
      { status: 500 }
    )
  }
}
