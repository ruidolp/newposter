import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { db } from '@/database/db'
import { requireTenant } from '@/lib/tenant'

async function getAdminToken(request: NextRequest) {
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })
  if (!token || !['ADMIN', 'OWNER'].includes(token.role as string)) return null
  return token
}

// GET — buscar usuarios disponibles para vincular (sin empleado asignado aún)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = await getAdminToken(request)
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const tenant = await requireTenant()
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('q') || ''
    const { id } = await params

    // Obtener user_ids ya vinculados a otros empleados
    const linked = await (db as any)
      .selectFrom('rrhh_employees')
      .select('user_id')
      .where('tenant_id', '=', tenant.id)
      .where('user_id', 'is not', null)
      .where('id', '!=', id)
      .execute()

    const linkedIds = linked.map((r: any) => r.user_id).filter(Boolean)

    let query = db
      .selectFrom('users')
      .select(['id', 'name', 'email', 'role'])
      .where('tenant_id', '=', tenant.id as any)
      .where('active', '=', true)
      .orderBy('name', 'asc')

    if (linkedIds.length > 0) {
      query = query.where('id', 'not in', linkedIds) as any
    }
    if (search) {
      query = query.where((eb: any) =>
        eb.or([
          eb('name', 'ilike', `%${search}%`),
          eb('email', 'ilike', `%${search}%`),
        ])
      ) as any
    }

    const users = await query.limit(20).execute()
    return NextResponse.json({ users })
  } catch (error) {
    console.error('[rrhh/link-user:GET]', error)
    return NextResponse.json({ error: 'Error al buscar usuarios' }, { status: 500 })
  }
}

// PATCH — vincular usuario existente al empleado
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = await getAdminToken(request)
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const tenant = await requireTenant()
    const { user_id } = await request.json()
    const { id } = await params

    if (!user_id) return NextResponse.json({ error: 'user_id requerido' }, { status: 400 })

    // Verificar que el usuario pertenece al tenant
    const user = await db
      .selectFrom('users')
      .select(['id', 'name', 'email', 'role'])
      .where('id', '=', user_id)
      .where('tenant_id', '=', tenant.id as any)
      .executeTakeFirst()

    if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

    await (db as any)
      .updateTable('rrhh_employees')
      .set({ user_id, updated_at: new Date() })
      .where('id', '=', id)
      .where('tenant_id', '=', tenant.id)
      .execute()

    return NextResponse.json({ user })
  } catch (error) {
    console.error('[rrhh/link-user:PATCH]', error)
    return NextResponse.json({ error: 'Error al vincular usuario' }, { status: 500 })
  }
}

// DELETE — desvincular usuario del empleado (no borra el user, solo rompe el vínculo)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = await getAdminToken(request)
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const tenant = await requireTenant()
    const { id } = await params

    await (db as any)
      .updateTable('rrhh_employees')
      .set({ user_id: null, updated_at: new Date() })
      .where('id', '=', id)
      .where('tenant_id', '=', tenant.id)
      .execute()

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[rrhh/link-user:DELETE]', error)
    return NextResponse.json({ error: 'Error al desvincular' }, { status: 500 })
  }
}
