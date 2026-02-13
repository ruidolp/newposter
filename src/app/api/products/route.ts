import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/database/db'
import { requireTenant } from '@/lib/tenant'
import { beforeCreateProduct, afterCreateProduct } from '@/lib/extensions/hooks'

// GET /api/products - List all products
export async function GET(request: NextRequest) {
  try {
    const tenant = await requireTenant()
    const { searchParams } = new URL(request.url)

    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search') || ''
    const categoryId = searchParams.get('category_id')
    const active = searchParams.get('active')

    let query = db
      .selectFrom('products')
      .selectAll()
      .where('tenant_id', '=', tenant.id as any)
      .orderBy('created_at', 'desc')

    // Apply filters
    if (search) {
      query = query.where((eb) =>
        eb.or([
          eb('name', 'ilike', `%${search}%`),
          eb('sku', 'ilike', `%${search}%`),
          eb('barcode', 'ilike', `%${search}%`),
        ])
      )
    }

    if (categoryId) {
      query = query.where('category_id', '=', categoryId)
    }

    if (active !== null && active !== undefined) {
      query = query.where('active', '=', active === 'true')
    }

    // Pagination
    const offset = (page - 1) * limit
    query = query.limit(limit).offset(offset)

    const products = await query.execute()

    return NextResponse.json({
      products,
      page,
      limit,
      total: products.length,
    })
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}

// POST /api/products - Create new product
export async function POST(request: NextRequest) {
  try {
    const tenant = await requireTenant()
    const body = await request.json()

    // Validate required fields
    if (!body.name || !body.sku || !body.base_price) {
      return NextResponse.json(
        { error: 'Missing required fields: name, sku, base_price' },
        { status: 400 }
      )
    }

    // Check if SKU already exists
    const existingProduct = await db
      .selectFrom('products')
      .select('id')
      .where('tenant_id', '=', tenant.id as any)
      .where('sku', '=', body.sku)
      .executeTakeFirst()

    if (existingProduct) {
      return NextResponse.json(
        { error: 'Product with this SKU already exists' },
        { status: 409 }
      )
    }

    // Execute beforeCreate hook
    const processedData = await beforeCreateProduct(body, tenant.id)

    // Insert product
    const product = await db
      .insertInto('products')
      .values({
        tenant_id: tenant.id as any,
        name: processedData.name,
        description: processedData.description || null,
        sku: processedData.sku,
        barcode: processedData.barcode || null,
        base_price: processedData.base_price.toString(),
        cost: processedData.cost ? processedData.cost.toString() : null,
        category_id: processedData.category_id || null,
        stock: processedData.stock || 0,
        low_stock_alert: processedData.low_stock_alert || 5,
        track_stock: processedData.track_stock !== false,
        active: processedData.active !== false,
        metadata: JSON.stringify(processedData.metadata || {}) as any,
      })
      .returningAll()
      .executeTakeFirstOrThrow()

    // Execute afterCreate hook
    await afterCreateProduct(product, tenant.id as string)

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error('Error creating product:', error)
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    )
  }
}
