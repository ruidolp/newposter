import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import bcrypt from 'bcryptjs'
import { db } from '@/database/db'
import { requireTenant } from '@/lib/tenant'
import { logOperation } from '@/lib/operation-log'

const ALLOWED_ROLES = ['OWNER', 'ADMIN', 'STAFF', 'CASHIER', 'EMPLOYEE']

async function getAdminToken(request: NextRequest) {
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })
  if (!token || !['ADMIN', 'OWNER'].includes(token.role as string)) return null
  return token
}

function canManageRole(actorRole: string, targetRole: string): boolean {
  if (actorRole === 'OWNER') return targetRole !== 'OWNER'
  if (actorRole === 'ADMIN') return ['STAFF', 'CASHIER'].includes(targetRole)
  return false
}

// GET /api/users/[id]
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = await getAdminToken(request)
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const tenant = await requireTenant()
    const { id } = await params

    const user = await db
      .selectFrom('users')
      .select(['id', 'name', 'email', 'role', 'active', 'created_at'])
      .where('id', '=', id)
      .where('tenant_id', '=', tenant.id as any)
      .executeTakeFirst()

    if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    return NextResponse.json(user)
  } catch (error) {
    console.error('[users/id:GET]', error)
    return NextResponse.json({ error: 'Error al obtener usuario' }, { status: 500 })
  }
}

// PATCH /api/users/[id]
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = await getAdminToken(request)
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const tenant = await requireTenant()
    const { id } = await params
    const body = await request.json()

    // No puede editarse a sí mismo el rol
    if (id === token.id && body.role !== undefined && body.role !== token.role) {
      return NextResponse.json({ error: 'No puedes cambiar tu propio rol' }, { status: 403 })
    }

    const existing = await db
      .selectFrom('users')
      .select(['id', 'name', 'email', 'role', 'active'])
      .where('id', '=', id)
      .where('tenant_id', '=', tenant.id as any)
      .executeTakeFirst()

    if (!existing) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

    // Validar nuevo rol si se cambia
    if (body.role && body.role !== existing.role) {
      if (!ALLOWED_ROLES.includes(body.role)) {
        return NextResponse.json({ error: 'Rol inválido' }, { status: 400 })
      }
      if (!canManageRole(token.role as string, body.role)) {
        return NextResponse.json({ error: 'No tienes permiso para asignar ese rol' }, { status: 403 })
      }
    }

    // Verificar email único si se cambia
    if (body.email?.trim() && body.email.trim().toLowerCase() !== existing.email) {
      const emailTaken = await db
        .selectFrom('users')
        .select('id')
        .where('tenant_id', '=', tenant.id as any)
        .where('email', '=', body.email.trim().toLowerCase())
        .where('id', '!=', id)
        .executeTakeFirst()
      if (emailTaken) {
        return NextResponse.json({ error: 'Ya existe un usuario con ese email' }, { status: 409 })
      }
    }

    const updates: Record<string, unknown> = {}
    if (body.name?.trim()) updates.name = body.name.trim()
    if (body.email?.trim()) updates.email = body.email.trim().toLowerCase()
    if (body.role) updates.role = body.role
    if (typeof body.active === 'boolean') updates.active = body.active

    if (body.password) {
      if (body.password.length < 6) {
        return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 })
      }
      updates.password_hash = await bcrypt.hash(body.password, 10)
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })
    }

    const updated = await db
      .updateTable('users')
      .set(updates)
      .where('id', '=', id)
      .where('tenant_id', '=', tenant.id as any)
      .returning(['id', 'name', 'email', 'role', 'active', 'created_at'])
      .executeTakeFirstOrThrow()

    await logOperation({
      tenantId: tenant.id,
      userId: token.id as string,
      userName: token.name as string,
      action: 'UPDATE_USER',
      entityType: 'user',
      entityId: id,
      detail: { changes: Object.keys(updates).filter(k => k !== 'password_hash') },
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[users/id:PATCH]', error)
    return NextResponse.json({ error: 'Error al actualizar usuario' }, { status: 500 })
  }
}

// DELETE /api/users/[id] — desactivar (soft delete)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = await getAdminToken(request)
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const tenant = await requireTenant()
    const { id } = await params

    if (id === token.id) {
      return NextResponse.json({ error: 'No puedes desactivar tu propia cuenta' }, { status: 403 })
    }

    const existing = await db
      .selectFrom('users')
      .select(['id', 'name', 'role'])
      .where('id', '=', id)
      .where('tenant_id', '=', tenant.id as any)
      .executeTakeFirst()

    if (!existing) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

    if (!canManageRole(token.role as string, existing.role ?? '')) {
      return NextResponse.json({ error: 'No tienes permiso para desactivar este usuario' }, { status: 403 })
    }

    await db
      .updateTable('users')
      .set({ active: false })
      .where('id', '=', id)
      .where('tenant_id', '=', tenant.id as any)
      .execute()

    await logOperation({
      tenantId: tenant.id,
      userId: token.id as string,
      userName: token.name as string,
      action: 'DEACTIVATE_USER',
      entityType: 'user',
      entityId: id,
      detail: { name: existing.name },
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[users/id:DELETE]', error)
    return NextResponse.json({ error: 'Error al desactivar usuario' }, { status: 500 })
  }
}
