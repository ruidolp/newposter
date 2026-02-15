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

// GET /api/purchases/[id] — detalle de compra con items
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = await getAdminToken(request)
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { id } = await params
    const tenant = await requireTenant()

    const purchase = await db
      .selectFrom('purchases as p')
      .leftJoin('suppliers as s', 's.id', 'p.supplier_id')
      .leftJoin('users as u', 'u.id', 'p.created_by')
      .select([
        'p.id',
        'p.invoice_number',
        'p.total_amount',
        'p.invoice_photo',
        'p.status',
        'p.notes',
        'p.purchased_at',
        'p.created_at',
        's.id as supplier_id',
        's.name as supplier_name',
        's.rut as supplier_rut',
        's.email as supplier_email',
        's.phone as supplier_phone',
        's.address as supplier_address',
        's.contact_name as supplier_contact_name',
        'u.name as created_by_name',
      ])
      .where('p.id', '=', id)
      .where('p.tenant_id', '=', tenant.id as any)
      .executeTakeFirst()

    if (!purchase) return NextResponse.json({ error: 'Compra no encontrada' }, { status: 404 })

    const items = await db
      .selectFrom('purchase_items as pi')
      .leftJoin('products as p2', 'p2.id', 'pi.product_id')
      .select([
        'pi.id',
        'pi.product_id',
        'pi.product_name',
        'pi.quantity',
        'pi.purchase_price',
        'pi.previous_stock',
        'pi.new_stock',
        'p2.base_price as sale_price',
        'p2.sku',
      ])
      .where('pi.purchase_id', '=', id)
      .execute()

    return NextResponse.json({ ...purchase, items })
  } catch (error) {
    console.error('[purchases/[id]:GET]', error)
    return NextResponse.json({ error: 'Error al obtener compra' }, { status: 500 })
  }
}

// PATCH /api/purchases/[id] — anular compra y revertir stock/costo
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = await getAdminToken(request)
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { id } = await params
    const tenant = await requireTenant()
    const body = await request.json().catch(() => ({}))
    const action = String(body?.action || '').toUpperCase()

    if (action !== 'CANCEL') {
      return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
    }

    const purchase = await db
      .selectFrom('purchases')
      .selectAll()
      .where('id', '=', id)
      .where('tenant_id', '=', tenant.id as any)
      .executeTakeFirst()

    if (!purchase) {
      return NextResponse.json({ error: 'Compra no encontrada' }, { status: 404 })
    }

    if (purchase.status === 'CANCELLED') {
      return NextResponse.json({ error: 'La compra ya está anulada' }, { status: 409 })
    }

    const cancelledAt = new Date().toISOString()
    const cancelReason = String(body?.reason || '').trim() || 'Anulación manual de factura'
    const invoiceLabel = purchase.invoice_number || purchase.id

    await db.transaction().execute(async (trx) => {
      const items = await trx
        .selectFrom('purchase_items')
        .selectAll()
        .where('purchase_id', '=', id)
        .where('product_id', 'is not', null)
        .execute()

      const costHistoryRows = await trx
        .selectFrom('product_cost_history')
        .select([
          'id',
          'product_id',
          'purchase_item_id',
          'previous_cost',
          'new_cost',
        ])
        .where('tenant_id', '=', tenant.id as any)
        .where('purchase_id', '=', id)
        .where('source', '=', 'PURCHASE')
        .execute()

      const costHistoryByItem = new Map(costHistoryRows.map((row) => [row.purchase_item_id, row]))

      for (const item of items) {
        if (!item.product_id) continue

        const product = await trx
          .selectFrom('products')
          .select(['stock', 'cost'])
          .where('id', '=', item.product_id)
          .where('tenant_id', '=', tenant.id as any)
          .executeTakeFirst()

        if (!product) continue

        const currentStock = Number(product.stock || 0)
        const newStock = Math.max(0, currentStock - item.quantity)
        const currentCost = parseNum(product.cost)
        let nextCost = currentCost

        const historyRow = costHistoryByItem.get(item.id)
        if (historyRow) {
          const rowNewCost = parseNum(historyRow.new_cost)
          const rowPreviousCost = parseNum(historyRow.previous_cost)
          if (currentCost !== null && rowNewCost !== null && currentCost === rowNewCost) {
            nextCost = rowPreviousCost
          }
        }

        await trx
          .updateTable('products')
          .set({
            stock: newStock,
            cost: nextCost === null ? null : nextCost.toString(),
            updated_at: new Date(),
          })
          .where('id', '=', item.product_id)
          .where('tenant_id', '=', tenant.id as any)
          .execute()

        await trx
          .insertInto('stock_movements')
          .values({
            tenant_id: tenant.id as any,
            product_id: item.product_id,
            type: 'ADJUSTMENT',
            quantity: -item.quantity,
            previous_stock: currentStock,
            new_stock: newStock,
            reference_type: 'PURCHASE_CANCEL',
            reference_id: id as any,
            created_by: token.id as string,
            notes: `Anulación compra ${invoiceLabel}`,
          })
          .execute()

        if (currentCost !== nextCost && nextCost !== null) {
          await trx
            .insertInto('product_cost_history')
            .values({
              tenant_id: tenant.id as any,
              product_id: item.product_id,
              source: 'SYSTEM',
              previous_cost: currentCost === null ? null : currentCost.toString(),
              new_cost: nextCost.toString(),
              currency: 'CLP',
              purchase_id: id,
              purchase_item_id: item.id,
              supplier_id: purchase.supplier_id,
              invoice_number: purchase.invoice_number,
              reason: `Reversa por anulación compra ${invoiceLabel}`,
              created_by: token.id as string,
            })
            .execute()
        }
      }

      await trx
        .updateTable('purchases')
        .set({
          status: 'CANCELLED',
          notes: purchase.notes
            ? `${purchase.notes}\n[ANULADA ${cancelledAt}] ${cancelReason}`
            : `[ANULADA ${cancelledAt}] ${cancelReason}`,
          updated_at: new Date(),
        })
        .where('id', '=', id)
        .where('tenant_id', '=', tenant.id as any)
        .execute()
    })

    await logOperation({
      tenantId: tenant.id,
      userId: token.id as string,
      userName: token.name as string,
      action: 'CANCEL_PURCHASE',
      entityType: 'purchase',
      entityId: id,
      detail: {
        invoice_number: purchase.invoice_number,
        reason: cancelReason,
      },
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[purchases/[id]:PATCH]', error)
    return NextResponse.json({ error: 'Error al anular compra' }, { status: 500 })
  }
}
