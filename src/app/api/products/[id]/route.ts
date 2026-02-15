import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/database/db'
import { requireTenant } from '@/lib/tenant'
import { beforeUpdateProduct, afterUpdateProduct } from '@/lib/extensions/hooks'

// GET /api/products/[id] - Get single product
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenant = await requireTenant()
    const { id } = await params

    const product = await db
      .selectFrom('products')
      .selectAll()
      .where('id', '=', id)
      .where('tenant_id', '=', tenant.id as any)
      .executeTakeFirst()

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    const costHistory = await db
      .selectFrom('product_cost_history')
      .select([
        'id',
        'source',
        'previous_cost',
        'new_cost',
        'currency',
        'purchase_id',
        'supplier_id',
        'invoice_number',
        'reason',
        'created_by',
        'created_at',
      ])
      .where('product_id', '=', id)
      .where('tenant_id', '=', tenant.id as any)
      .orderBy('created_at', 'desc')
      .limit(30)
      .execute()

    const priceHistory = await db
      .selectFrom('product_price_history')
      .select([
        'id',
        'source',
        'previous_price',
        'new_price',
        'currency',
        'purchase_id',
        'supplier_id',
        'invoice_number',
        'reason',
        'created_by',
        'created_at',
      ])
      .where('product_id', '=', id)
      .where('tenant_id', '=', tenant.id as any)
      .orderBy('created_at', 'desc')
      .limit(30)
      .execute()

    return NextResponse.json({
      ...product,
      cost_history: costHistory,
      price_history: priceHistory,
    })
  } catch (error) {
    console.error('Error fetching product:', error)
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    )
  }
}

// PATCH /api/products/[id] - Update product
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenant = await requireTenant()
    const { id } = await params
    const body = await request.json()
    const hasCostInBody = Object.prototype.hasOwnProperty.call(body, 'cost')
    const parsedBodyCost = hasCostInBody
      ? (body.cost === null || body.cost === '' ? null : Number(body.cost))
      : null
    const hasBasePriceInBody = Object.prototype.hasOwnProperty.call(body, 'base_price')
    const parsedBodyBasePrice = hasBasePriceInBody
      ? (body.base_price === null || body.base_price === '' ? null : Number(body.base_price))
      : null
    if (hasCostInBody && body.cost !== null && body.cost !== '' && Number.isNaN(parsedBodyCost)) {
      return NextResponse.json(
        { error: 'Costo inválido' },
        { status: 400 }
      )
    }
    if (hasBasePriceInBody && body.base_price !== null && body.base_price !== '' && Number.isNaN(parsedBodyBasePrice)) {
      return NextResponse.json(
        { error: 'Precio de venta inválido' },
        { status: 400 }
      )
    }

    // Check if product exists
    const existingProduct = await db
      .selectFrom('products')
      .selectAll()
      .where('id', '=', id)
      .where('tenant_id', '=', tenant.id as any)
      .executeTakeFirst()

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Execute beforeUpdate hook
    const processedData = await beforeUpdateProduct(
      { ...existingProduct, ...body },
      tenant.id as string
    )

    // Update product
    const updateData: any = {}
    if (processedData.name !== undefined) updateData.name = processedData.name
    if (processedData.description !== undefined) updateData.description = processedData.description
    if (processedData.base_price !== undefined) updateData.base_price = processedData.base_price.toString()
    if (processedData.cost !== undefined) {
      updateData.cost = processedData.cost !== null && processedData.cost !== undefined
        ? processedData.cost.toString()
        : null
    }
    if (processedData.stock !== undefined) updateData.stock = processedData.stock
    if (processedData.category_id !== undefined) updateData.category_id = processedData.category_id
    if (processedData.barcode !== undefined) updateData.barcode = processedData.barcode
    if (processedData.active !== undefined) updateData.active = processedData.active
    if (processedData.metadata !== undefined) updateData.metadata = JSON.stringify(processedData.metadata)

    const product = await db
      .updateTable('products')
      .set(updateData)
      .where('id', '=', id)
      .where('tenant_id', '=', tenant.id as any)
      .returningAll()
      .executeTakeFirstOrThrow()

    if (hasCostInBody && (parsedBodyCost === null || !Number.isNaN(parsedBodyCost))) {
      const previousCost = existingProduct.cost === null ? null : Number(existingProduct.cost)
      const nextCost = parsedBodyCost
      if (previousCost !== nextCost && nextCost !== null) {
        await db
          .insertInto('product_cost_history')
          .values({
            tenant_id: tenant.id as any,
            product_id: id,
            source: 'MANUAL',
            previous_cost: previousCost === null ? null : previousCost.toString(),
            new_cost: nextCost.toString(),
            currency: 'CLP',
            reason: body.cost_reason ? String(body.cost_reason).trim() : 'Ajuste manual de costo',
            created_by: null,
          })
          .execute()
      }
    }

    if (hasBasePriceInBody && parsedBodyBasePrice !== null && !Number.isNaN(parsedBodyBasePrice)) {
      const previousPrice = Number(existingProduct.base_price)
      const nextPrice = parsedBodyBasePrice
      if (previousPrice !== nextPrice) {
        await db
          .insertInto('product_price_history')
          .values({
            tenant_id: tenant.id as any,
            product_id: id,
            source: 'MANUAL',
            previous_price: previousPrice.toString(),
            new_price: nextPrice.toString(),
            currency: 'CLP',
            reason: body.price_reason ? String(body.price_reason).trim() : 'Ajuste manual de precio',
            created_by: null,
          })
          .execute()
      }
    }

    // Execute afterUpdate hook
    await afterUpdateProduct(product, tenant.id as string)

    return NextResponse.json(product)
  } catch (error) {
    console.error('Error updating product:', error)
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    )
  }
}

// DELETE /api/products/[id] - Delete product (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenant = await requireTenant()
    const { id } = await params

    const product = await db
      .updateTable('products')
      .set({ active: false })
      .where('id', '=', id)
      .where('tenant_id', '=', tenant.id as any)
      .returningAll()
      .executeTakeFirst()

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting product:', error)
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    )
  }
}
