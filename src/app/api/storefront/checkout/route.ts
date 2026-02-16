import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/database/db'
import { generateOrderNumber } from '@/lib/utils'

interface CheckoutItemInput {
  product_id: string
  variant_id?: string
  quantity: number
}

function toNumber(input: unknown): number {
  const n = Number(input)
  return Number.isFinite(n) ? n : 0
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const tenantSlug = typeof body?.tenant_slug === 'string' ? body.tenant_slug : ''
    const items = Array.isArray(body?.items) ? (body.items as CheckoutItemInput[]) : []

    if (!tenantSlug) {
      return NextResponse.json({ error: 'Tenant inválido' }, { status: 400 })
    }

    if (!items.length) {
      return NextResponse.json({ error: 'El carrito está vacío' }, { status: 400 })
    }

    const tenant = await db
      .selectFrom('tenants')
      .select(['id'])
      .where('slug', '=', tenantSlug)
      .where('active', '=', true)
      .executeTakeFirst()

    if (!tenant) {
      return NextResponse.json({ error: 'Tienda no encontrada' }, { status: 404 })
    }

    const productIds = [...new Set(items.map((item) => item.product_id))]
    const variantIds = [...new Set(items.map((item) => item.variant_id).filter(Boolean) as string[])]

    const products = await db
      .selectFrom('products')
      .select(['id', 'name', 'base_price', 'stock', 'track_stock', 'active'])
      .where('tenant_id', '=', tenant.id)
      .where('id', 'in', productIds)
      .execute()

    const variants = variantIds.length
      ? await db
          .selectFrom('product_variants')
          .select(['id', 'product_id', 'price', 'stock', 'active', 'attributes'])
          .where('tenant_id', '=', tenant.id)
          .where('id', 'in', variantIds)
          .execute()
      : []

    const preparedLines: Array<{
      productId: string
      variantId: string | null
      quantity: number
      unitPrice: number
      subtotal: number
      metadata: Record<string, unknown>
    }> = []

    for (const item of items) {
      const quantity = Math.max(1, toNumber(item.quantity))
      const product = products.find((p) => p.id === item.product_id)
      if (!product) {
        return NextResponse.json({ error: `Producto no encontrado: ${item.product_id}` }, { status: 400 })
      }

      if (!product.active) {
        return NextResponse.json({ error: `Producto inactivo: ${product.name}` }, { status: 400 })
      }

      const variant = item.variant_id ? variants.find((v) => v.id === item.variant_id) : null
      if (item.variant_id && !variant) {
        return NextResponse.json({ error: `Variante no encontrada: ${item.variant_id}` }, { status: 400 })
      }

      if (variant && variant.product_id !== product.id) {
        return NextResponse.json({ error: 'Variante no corresponde al producto' }, { status: 400 })
      }

      if (variant && !variant.active) {
        return NextResponse.json({ error: 'Variante inactiva' }, { status: 400 })
      }

      if (variant?.stock !== null && variant?.stock !== undefined && variant.stock < quantity) {
        return NextResponse.json(
          { error: `Stock insuficiente en variante de ${product.name}. Disponible: ${variant.stock}` },
          { status: 400 }
        )
      }

      if (product.track_stock && product.stock !== null && product.stock < quantity) {
        return NextResponse.json(
          { error: `Stock insuficiente para ${product.name}. Disponible: ${product.stock}` },
          { status: 400 }
        )
      }

      const unitPrice = variant?.price !== null && variant?.price !== undefined
        ? toNumber(variant.price)
        : toNumber(product.base_price)

      preparedLines.push({
        productId: product.id,
        variantId: variant?.id ?? null,
        quantity,
        unitPrice,
        subtotal: unitPrice * quantity,
        metadata: {
          variant_id: variant?.id ?? null,
          variant_attributes: variant?.attributes ?? null,
        },
      })
    }

    const subtotal = preparedLines.reduce((acc, line) => acc + line.subtotal, 0)

    const order = await db.transaction().execute(async (trx) => {
      const createdOrder = await trx
        .insertInto('orders')
        .values({
          tenant_id: tenant.id,
          order_number: generateOrderNumber(),
          subtotal: subtotal.toString(),
          total: subtotal.toString(),
          status: 'PENDING',
          payment_status: 'PENDING',
          channel: 'WEB',
        })
        .returning(['id', 'order_number', 'total'])
        .executeTakeFirstOrThrow()

      for (const line of preparedLines) {
        await trx
          .insertInto('order_items')
          .values({
            order_id: createdOrder.id,
            product_id: line.productId,
            quantity: line.quantity,
            unit_price: line.unitPrice.toString(),
            subtotal: line.subtotal.toString(),
            metadata: line.metadata as any,
          })
          .execute()

        await trx
          .updateTable('products')
          .set((eb) => ({
            stock: eb('stock', '-', line.quantity),
            updated_at: new Date(),
          }))
          .where('id', '=', line.productId)
          .where('track_stock', '=', true)
          .execute()

        if (line.variantId) {
          await trx
            .updateTable('product_variants')
            .set((eb) => ({
              stock: eb('stock', '-', line.quantity),
            }))
            .where('id', '=', line.variantId)
            .where('stock', 'is not', null)
            .execute()
        }
      }

      return createdOrder
    })

    return NextResponse.json(
      {
        order_number: order.order_number,
        total: Number(order.total),
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[storefront checkout]', error)
    return NextResponse.json({ error: 'No se pudo procesar el checkout' }, { status: 500 })
  }
}
