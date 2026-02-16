import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { db } from '@/database/db'
import { requireTenant } from '@/lib/tenant'

async function getAnyToken(request: NextRequest) {
  return getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })
}

// GET /api/pos/sessions — my active session or history
export async function GET(request: NextRequest) {
  try {
    const token = await getAnyToken(request)
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const tenant = await requireTenant()
    const { searchParams } = new URL(request.url)
    const all = searchParams.get('all') === 'true'  // admin: all sessions

    if (all && !['ADMIN', 'OWNER'].includes(token.role as string)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    let query = db
      .selectFrom('pos_sessions as s')
      .leftJoin('locations as l', 'l.id', 's.location_id')
      .leftJoin('users as u', 'u.id', 's.user_id')
      .select([
        's.id', 's.status', 's.opening_amount', 's.closing_amount', 's.closing_notes',
        's.total_sales', 's.total_cash', 's.total_card', 's.total_transfer', 's.total_cancelled',
        's.opened_at', 's.closed_at', 's.force_closed_by', 's.force_closed_note',
        's.location_id', 's.user_id',
        'l.name as location_name', 'l.type as location_type',
        'u.name as user_name',
      ])
      .where('s.tenant_id', '=', tenant.id as any)
      .orderBy('s.opened_at', 'desc')

    if (!all) {
      query = query.where('s.user_id', '=', token.id as any)
    }

    const limit = all ? 50 : 20
    const sessions = await query.limit(limit).execute()

    // Also return the active session separately for convenience
    const active = sessions.find((s) => s.status === 'OPEN') ?? null

    return NextResponse.json({ sessions, active })
  } catch (error) {
    console.error('[pos/sessions:GET]', error)
    return NextResponse.json({ error: 'Error al obtener sesiones' }, { status: 500 })
  }
}

// POST /api/pos/sessions — open a new session
export async function POST(request: NextRequest) {
  try {
    const token = await getAnyToken(request)
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const tenant = await requireTenant()
    const body = await request.json()

    if (!body.location_id) {
      return NextResponse.json({ error: 'La ubicación es requerida' }, { status: 400 })
    }

    // Check location belongs to tenant
    const location = await db
      .selectFrom('locations')
      .select(['id', 'name'])
      .where('id', '=', body.location_id)
      .where('tenant_id', '=', tenant.id as any)
      .where('active', '=', true)
      .executeTakeFirst()

    if (!location) return NextResponse.json({ error: 'Ubicación no válida' }, { status: 400 })

    // Check no existing OPEN session for this user
    const existing = await db
      .selectFrom('pos_sessions')
      .select('id')
      .where('user_id', '=', token.id as any)
      .where('status', '=', 'OPEN')
      .executeTakeFirst()

    if (existing) {
      return NextResponse.json({ error: 'Ya tienes una caja abierta', session_id: existing.id }, { status: 409 })
    }

    const session = await db
      .insertInto('pos_sessions')
      .values({
        tenant_id: tenant.id as any,
        location_id: body.location_id,
        user_id: token.id as any,
        status: 'OPEN',
        opening_amount: body.opening_amount ?? 0,
        opened_at: new Date(),
      })
      .returningAll()
      .executeTakeFirstOrThrow()

    return NextResponse.json({ session, location_name: location.name }, { status: 201 })
  } catch (error) {
    console.error('[pos/sessions:POST]', error)
    return NextResponse.json({ error: 'Error al abrir sesión' }, { status: 500 })
  }
}
