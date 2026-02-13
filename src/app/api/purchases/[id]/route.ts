import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { db } from '@/database/db'
import { requireTenant } from '@/lib/tenant'

async function getAdminToken(request: NextRequest) {
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })
  if (!token || !['ADMIN', 'OWNER'].includes(token.role as string)) return null
  return token
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
        's.name as supplier_name',
        's.rut as supplier_rut',
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
