import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import bcrypt from 'bcryptjs'
import { db } from '@/database/db'
import { requireTenant } from '@/lib/tenant'
import { logOperation } from '@/lib/operation-log'

const ALLOWED_ROLES = ['OWNER', 'ADMIN', 'STAFF', 'CASHIER'] as const
type Role = typeof ALLOWED_ROLES[number]

async function getAdminToken(request: NextRequest) {
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })
  if (!token || !['ADMIN', 'OWNER'].includes(token.role as string)) return null
  return token
}

// ADMIN solo puede crear STAFF/CASHIER; OWNER puede crear cualquier rol excepto otro OWNER
function canManageRole(actorRole: string, targetRole: string): boolean {
  if (actorRole === 'OWNER') return targetRole !== 'OWNER'
  if (actorRole === 'ADMIN') return ['STAFF', 'CASHIER'].includes(targetRole)
  return false
}

// GET /api/users — listar usuarios del tenant
export async function GET(request: NextRequest) {
  try {
    const token = await getAdminToken(request)
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const tenant = await requireTenant()
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const includeInactive = searchParams.get('all') === 'true'

    let query = db
      .selectFrom('users')
      .select(['id', 'name', 'email', 'role', 'active', 'created_at'])
      .where('tenant_id', '=', tenant.id as any)
      .orderBy('name', 'asc')

    if (!includeInactive) {
      query = query.where('active', '=', true)
    }

    if (search) {
      query = query.where((eb) =>
        eb.or([
          eb('name', 'ilike', `%${search}%`),
          eb('email', 'ilike', `%${search}%`),
        ])
      )
    }

    const users = await query.execute()
    return NextResponse.json({ users })
  } catch (error) {
    console.error('[users:GET]', error)
    return NextResponse.json({ error: 'Error al obtener usuarios' }, { status: 500 })
  }
}

// POST /api/users — crear usuario/empleado
export async function POST(request: NextRequest) {
  try {
    const token = await getAdminToken(request)
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const tenant = await requireTenant()
    const body = await request.json()

    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })
    }
    if (!body.email?.trim()) {
      return NextResponse.json({ error: 'El email es requerido' }, { status: 400 })
    }
    if (!body.password || body.password.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 })
    }

    const role: Role = body.role || 'STAFF'
    if (!ALLOWED_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Rol inválido' }, { status: 400 })
    }
    if (!canManageRole(token.role as string, role)) {
      return NextResponse.json({ error: 'No tienes permiso para asignar ese rol' }, { status: 403 })
    }

    // Verificar email único por tenant
    const existing = await db
      .selectFrom('users')
      .select('id')
      .where('tenant_id', '=', tenant.id as any)
      .where('email', '=', body.email.trim().toLowerCase())
      .executeTakeFirst()

    if (existing) {
      return NextResponse.json({ error: 'Ya existe un usuario con ese email' }, { status: 409 })
    }

    const password_hash = await bcrypt.hash(body.password, 10)

    const user = await db
      .insertInto('users')
      .values({
        tenant_id: tenant.id as any,
        name: body.name.trim(),
        email: body.email.trim().toLowerCase(),
        password_hash,
        role,
        active: true,
      })
      .returning(['id', 'name', 'email', 'role', 'active', 'created_at'])
      .executeTakeFirstOrThrow()

    await logOperation({
      tenantId: tenant.id,
      userId: token.id as string,
      userName: token.name as string,
      action: 'CREATE_USER',
      entityType: 'user',
      entityId: user.id,
      detail: { name: user.name, email: user.email, role: user.role },
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error('[users:POST]', error)
    return NextResponse.json({ error: 'Error al crear usuario' }, { status: 500 })
  }
}
