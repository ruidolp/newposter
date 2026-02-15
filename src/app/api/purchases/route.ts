import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { db } from '@/database/db'
import { requireTenant } from '@/lib/tenant'
import { logOperation } from '@/lib/operation-log'

async function getAdminToken(request: NextRequest) {
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })
  if (!token || !['ADMIN', 'OWNER'].includes(token.role as string)) return null
  return token
}

function parseNum(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null
  const parsed = Number(value)
  return Number.isNaN(parsed) ? null : parsed
}

// GET /api/purchases — listar compras
export async function GET(request: NextRequest) {
  try {
    const token = await getAdminToken(request)
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const tenant = await requireTenant()
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = (searchParams.get('status') || '').toUpperCase()
    const offset = (page - 1) * limit

    let query = db
      .selectFrom('purchases as p')
      .leftJoin('suppliers as s', 's.id', 'p.supplier_id')
      .leftJoin('users as u', 'u.id', 'p.created_by')
      .select([
        'p.id',
        'p.invoice_number',
        'p.total_amount',
        'p.status',
        'p.purchased_at',
        'p.created_at',
        's.name as supplier_name',
        'u.name as created_by_name',
      ])
      .where('p.tenant_id', '=', tenant.id as any)
      .orderBy('p.created_at', 'desc')

    if (['COMPLETED', 'DRAFT', 'CANCELLED'].includes(status)) {
      query = query.where('p.status', '=', status)
    }

    const purchases = await query
      .limit(limit)
      .offset(offset)
      .execute()

    return NextResponse.json({ purchases, page, limit })
  } catch (error) {
    console.error('[purchases:GET]', error)
    return NextResponse.json({ error: 'Error al obtener compras' }, { status: 500 })
  }
}

// POST /api/purchases — registrar compra
export async function POST(request: NextRequest) {
  try {
    const token = await getAdminToken(request)
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const tenant = await requireTenant()
    const body = await request.json()

    const { supplier_id, invoice_number, total_amount, invoice_photo, notes, items, extra_items } = body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Debe incluir al menos un producto' }, { status: 400 })
    }

    // Procesamos cada item de producto: si es producto nuevo lo creamos primero
    const resolvedItems: Array<{
      product_id: string
      product_name: string
      quantity: number
      purchase_price: number
      sale_price: number
      previous_stock: number
      new_stock: number
    }> = []
    const resolvedExtraItems: Array<{
      description: string
      amount_gross: number
      amount_net: number
    }> = Array.isArray(extra_items)
      ? extra_items
          .map((item: any) => ({
            description: String(item.description || '').trim(),
            amount_gross: Number(item.amount_gross) || 0,
            amount_net: Number(item.amount_net) || 0,
          }))
          .filter((item: any) => item.description && item.amount_gross > 0)
      : []

    for (const item of items) {
      let productId = item.product_id
      let productName = item.product_name
      let previousStock = item.previous_stock ?? 0

      if (!productId && item.new_product) {
        // Crear nuevo producto
        const np = item.new_product
        const newProduct = await db
          .insertInto('products')
          .values({
            tenant_id: tenant.id as any,
            name: np.name,
            sku: np.sku || `AUTO-${Date.now()}`,
            barcode: np.barcode || null,
            base_price: '0',
            cost: null,
            category_id: np.category_id || null,
            stock: 0,
            active: true,
            track_stock: true,
          })
          .returningAll()
          .executeTakeFirstOrThrow()

        productId = newProduct.id
        productName = newProduct.name
        previousStock = 0

        await logOperation({
          tenantId: tenant.id,
          userId: token.id as string,
          userName: token.name as string,
          action: 'CREATE_PRODUCT_FROM_PURCHASE',
          entityType: 'product',
          entityId: productId,
          detail: { name: productName, sku: newProduct.sku },
        })
      }

      const newStock = previousStock + item.quantity
      resolvedItems.push({
        product_id: productId,
        product_name: productName,
        quantity: item.quantity,
        purchase_price: item.purchase_price,
        sale_price: Number(item.sale_price) || 0,
        previous_stock: previousStock,
        new_stock: newStock,
      })
    }

    // Crear la compra
    const purchase = await db
      .insertInto('purchases')
      .values({
        tenant_id: tenant.id as any,
        supplier_id: supplier_id || null,
        invoice_number: invoice_number?.trim() || null,
        total_amount: total_amount?.toString() || '0',
        invoice_photo: invoice_photo || null,
        notes: notes?.trim() || null,
        status: 'COMPLETED',
        created_by: token.id as string,
      })
      .returningAll()
      .executeTakeFirstOrThrow()

    // Insertar items y actualizar stock
    for (const item of resolvedItems) {
      const purchaseItem = await db.insertInto('purchase_items').values({
        purchase_id: purchase.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        purchase_price: item.purchase_price.toString(),
        previous_stock: item.previous_stock,
        new_stock: item.new_stock,
      }).returning(['id']).executeTakeFirstOrThrow()

      const currentProduct = await db
        .selectFrom('products')
        .select(['cost', 'base_price'])
        .where('id', '=', item.product_id)
        .where('tenant_id', '=', tenant.id as any)
        .executeTakeFirst()

      const previousCost = parseNum(currentProduct?.cost)
      const nextCost = parseNum(item.purchase_price)
      const previousPrice = parseNum(currentProduct?.base_price)
      const nextPrice = parseNum(item.sale_price)

      // Actualizar stock del producto
      await db
        .updateTable('products')
        .set({
          stock: item.new_stock,
          cost: nextCost === null ? null : nextCost.toString(),
          base_price: nextPrice === null ? '0' : nextPrice.toString(),
          updated_at: new Date(),
        })
        .where('id', '=', item.product_id)
        .where('tenant_id', '=', tenant.id as any)
        .execute()

      if (nextCost !== null && previousCost !== nextCost) {
        await db
          .insertInto('product_cost_history')
          .values({
            tenant_id: tenant.id as any,
            product_id: item.product_id,
            source: 'PURCHASE',
            previous_cost: previousCost === null ? null : previousCost.toString(),
            new_cost: nextCost.toString(),
            currency: 'CLP',
            purchase_id: purchase.id,
            purchase_item_id: purchaseItem.id,
            supplier_id: supplier_id || null,
            invoice_number: invoice_number?.trim() || null,
            reason: `Actualizado por compra ${invoice_number || purchase.id}`,
            created_by: token.id as string,
          })
          .execute()
      }

      if (nextPrice !== null && previousPrice !== nextPrice) {
        await db
          .insertInto('product_price_history')
          .values({
            tenant_id: tenant.id as any,
            product_id: item.product_id,
            source: 'PURCHASE',
            previous_price: previousPrice === null ? null : previousPrice.toString(),
            new_price: nextPrice.toString(),
            currency: 'CLP',
            purchase_id: purchase.id,
            purchase_item_id: purchaseItem.id,
            supplier_id: supplier_id || null,
            invoice_number: invoice_number?.trim() || null,
            reason: `Actualizado por compra ${invoice_number || purchase.id}`,
            created_by: token.id as string,
          })
          .execute()
      }

      // Registrar movimiento de stock
      await db.insertInto('stock_movements').values({
        tenant_id: tenant.id as any,
        product_id: item.product_id,
        type: 'PURCHASE',
        quantity: item.quantity,
        previous_stock: item.previous_stock,
        new_stock: item.new_stock,
        reference_type: 'PURCHASE',
        reference_id: purchase.id,
        created_by: token.id as string,
        notes: `Compra ${invoice_number || purchase.id}`,
      }).execute()
    }

    // Guardar cargos adicionales (sin impacto de stock)
    for (const extra of resolvedExtraItems) {
      await db.insertInto('purchase_items').values({
        purchase_id: purchase.id,
        product_id: null,
        product_name: `[EXTRA] ${extra.description}`,
        quantity: 1,
        purchase_price: extra.amount_gross.toString(),
        previous_stock: 0,
        new_stock: 0,
      }).execute()
    }

    await logOperation({
      tenantId: tenant.id,
      userId: token.id as string,
      userName: token.name as string,
      action: 'CREATE_PURCHASE',
      entityType: 'purchase',
      entityId: purchase.id,
      detail: {
        invoice_number,
        total_amount,
        items_count: resolvedItems.length,
        extra_items_count: resolvedExtraItems.length,
        supplier_id,
      },
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
    })

    return NextResponse.json({ ...purchase, items: resolvedItems, extra_items: resolvedExtraItems }, { status: 201 })
  } catch (error) {
    console.error('[purchases:POST]', error)
    return NextResponse.json({ error: 'Error al registrar compra' }, { status: 500 })
  }
}
