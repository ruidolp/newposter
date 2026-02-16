import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { db } from '@/database/db'
import { requireTenant } from '@/lib/tenant'

async function getAdminToken(request: NextRequest) {
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })
  if (!token || !['ADMIN', 'OWNER'].includes(token.role as string)) return null
  return token
}

async function getAnyToken(request: NextRequest) {
  return getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })
}

// GET /api/locations — all locations for tenant (any authenticated user)
export async function GET(request: NextRequest) {
  try {
    const token = await getAnyToken(request)
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const tenant = await requireTenant()
    const showAll = request.nextUrl.searchParams.get('all') === 'true'

    let query = db
      .selectFrom('locations')
      .selectAll()
      .where('tenant_id', '=', tenant.id as any)

    if (!showAll) {
      query = query.where('active', '=', true)
    }

    const locations = await query
      .orderBy('is_default', 'desc')
      .orderBy('name', 'asc')
      .execute()

    return NextResponse.json({ locations })
  } catch (error) {
    console.error('[locations:GET]', error)
    return NextResponse.json({ error: 'Error al obtener ubicaciones' }, { status: 500 })
  }
}

// POST /api/locations — create location (admin only)
export async function POST(request: NextRequest) {
  try {
    const token = await getAdminToken(request)
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const tenant = await requireTenant()
    const body = await request.json()

    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })
    }

    const location = await db
      .insertInto('locations')
      .values({
        tenant_id: tenant.id as any,
        name: body.name.trim(),
        type: body.type ?? 'STORE',
        is_default: false,
        active: true,
      })
      .returningAll()
      .executeTakeFirstOrThrow()

    return NextResponse.json(location, { status: 201 })
  } catch (error) {
    console.error('[locations:POST]', error)
    return NextResponse.json({ error: 'Error al crear ubicación' }, { status: 500 })
  }
}
