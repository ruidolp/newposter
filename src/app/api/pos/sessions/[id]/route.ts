import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { db } from '@/database/db'
import { requireTenant } from '@/lib/tenant'

async function getAnyToken(request: NextRequest) {
  return getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })
}

// GET /api/pos/sessions/[id] — session detail with sales breakdown
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = await getAnyToken(request)
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const tenant = await requireTenant()
    const { id } = await params

    const session = await db
      .selectFrom('pos_sessions as s')
      .leftJoin('locations as l', 'l.id', 's.location_id')
      .leftJoin('users as u', 'u.id', 's.user_id')
      .select([
        's.id', 's.status', 's.opening_amount', 's.closing_amount', 's.closing_notes',
        's.total_sales', 's.total_cash', 's.total_card', 's.total_transfer', 's.total_cancelled',
        's.opened_at', 's.closed_at', 's.force_closed_by', 's.force_closed_note',
        's.location_id', 's.user_id',
        'l.name as location_name',
        'u.name as user_name',
      ])
      .where('s.id', '=', id)
      .where('s.tenant_id', '=', tenant.id as any)
      .executeTakeFirst()

    if (!session) return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 })

    // Only owner/admin or the session's user can view
    const isAdmin = ['ADMIN', 'OWNER'].includes(token.role as string)
    if (!isAdmin && session.user_id !== token.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // Sales in this session
    const orders = await db
      .selectFrom('orders')
      .select(['id', 'order_number', 'total', 'payment_method', 'status', 'created_at', 'customer_id'])
      .where('pos_session_id', '=', id)
      .where('tenant_id', '=', tenant.id as any)
      .orderBy('created_at', 'desc')
      .execute()

    return NextResponse.json({ session, orders })
  } catch (error) {
    console.error('[pos/sessions/id:GET]', error)
    return NextResponse.json({ error: 'Error al obtener sesión' }, { status: 500 })
  }
}

// PATCH /api/pos/sessions/[id] — close session or force-close (admin)
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = await getAnyToken(request)
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const tenant = await requireTenant()
    const { id } = await params
    const body = await request.json()

    const session = await db
      .selectFrom('pos_sessions')
      .selectAll()
      .where('id', '=', id)
      .where('tenant_id', '=', tenant.id as any)
      .executeTakeFirst()

    if (!session) return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 })
    if (session.status !== 'OPEN') return NextResponse.json({ error: 'La sesión ya está cerrada' }, { status: 400 })

    const isAdmin = ['ADMIN', 'OWNER'].includes(token.role as string)
    const isOwner = session.user_id === token.id
    const isForceClose = body.force === true

    if (isForceClose && !isAdmin) {
      return NextResponse.json({ error: 'Solo administradores pueden forzar el cierre' }, { status: 403 })
    }
    if (!isForceClose && !isOwner && !isAdmin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // Calculate totals from orders in this session
    const orders = await db
      .selectFrom('orders')
      .select(['total', 'payment_method', 'status'])
      .where('pos_session_id', '=', id)
      .execute()

    const activeOrders = orders.filter((o) => o.status !== 'CANCELLED')
    const totalSales = activeOrders.reduce((sum, o) => sum + Number(o.total), 0)
    const totalCash = activeOrders.filter((o) => o.payment_method === 'CASH').reduce((sum, o) => sum + Number(o.total), 0)
    const totalCard = activeOrders.filter((o) => o.payment_method === 'CARD').reduce((sum, o) => sum + Number(o.total), 0)
    const totalTransfer = activeOrders.filter((o) => o.payment_method === 'TRANSFER').reduce((sum, o) => sum + Number(o.total), 0)
    const totalCancelled = orders.filter((o) => o.status === 'CANCELLED').reduce((sum, o) => sum + Number(o.total), 0)

    const updates: Record<string, unknown> = {
      status: isForceClose ? 'FORCE_CLOSED' : 'CLOSED',
      closing_amount: body.closing_amount ?? null,
      closing_notes: body.closing_notes ?? null,
      total_sales: totalSales,
      total_cash: totalCash,
      total_card: totalCard,
      total_transfer: totalTransfer,
      total_cancelled: totalCancelled,
      closed_at: new Date(),
    }

    if (isForceClose) {
      if (!body.force_closed_note?.trim()) {
        return NextResponse.json({ error: 'La nota de cierre forzado es obligatoria' }, { status: 400 })
      }
      updates.force_closed_by = token.id
      updates.force_closed_note = body.force_closed_note.trim()
    }

    const updated = await db
      .updateTable('pos_sessions')
      .set(updates)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow()

    return NextResponse.json({
      session: updated,
      summary: { totalSales, totalCash, totalCard, totalTransfer, totalCancelled },
    })
  } catch (error) {
    console.error('[pos/sessions/id:PATCH]', error)
    return NextResponse.json({ error: 'Error al cerrar sesión' }, { status: 500 })
  }
}
