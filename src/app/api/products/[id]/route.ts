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

    return NextResponse.json(product)
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
    if (processedData.cost !== undefined) updateData.cost = processedData.cost ? processedData.cost.toString() : null
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
