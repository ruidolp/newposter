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

// GET /api/customers/[id]
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = await getAdminToken(request)
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const tenant = await requireTenant()
    const { id } = await params

    const customer = await db
      .selectFrom('customers')
      .selectAll()
      .where('id', '=', id)
      .where('tenant_id', '=', tenant.id as any)
      .executeTakeFirst()

    if (!customer) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    return NextResponse.json(customer)
  } catch (error) {
    console.error('[customers/id:GET]', error)
    return NextResponse.json({ error: 'Error al obtener cliente' }, { status: 500 })
  }
}

// PATCH /api/customers/[id]
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = await getAdminToken(request)
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const tenant = await requireTenant()
    const { id } = await params
    const body = await request.json()

    const existing = await db
      .selectFrom('customers')
      .select('id')
      .where('id', '=', id)
      .where('tenant_id', '=', tenant.id as any)
      .executeTakeFirst()

    if (!existing) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })

    // Verificar email único si se cambia
    if (body.email?.trim()) {
      const emailTaken = await db
        .selectFrom('customers')
        .select('id')
        .where('tenant_id', '=', tenant.id as any)
        .where('email', '=', body.email.trim().toLowerCase())
        .where('id', '!=', id)
        .executeTakeFirst()

      if (emailTaken) {
        return NextResponse.json({ error: 'Ya existe un cliente con ese email' }, { status: 409 })
      }
    }

    const updates: Record<string, unknown> = {}
    if (body.name?.trim()) updates.name = body.name.trim()
    if (body.email !== undefined) updates.email = body.email?.trim().toLowerCase() || null
    if (body.phone !== undefined) updates.phone = body.phone?.trim() || null
    if (body.address !== undefined) updates.address = body.address?.trim() || null
    updates.updated_at = new Date()

    const updated = await db
      .updateTable('customers')
      .set(updates)
      .where('id', '=', id)
      .where('tenant_id', '=', tenant.id as any)
      .returningAll()
      .executeTakeFirstOrThrow()

    await logOperation({
      tenantId: tenant.id,
      userId: token.id as string,
      userName: token.name as string,
      action: 'UPDATE_CUSTOMER',
      entityType: 'customer',
      entityId: id,
      detail: { name: updated.name },
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[customers/id:PATCH]', error)
    return NextResponse.json({ error: 'Error al actualizar cliente' }, { status: 500 })
  }
}

// DELETE /api/customers/[id]
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = await getAdminToken(request)
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const tenant = await requireTenant()
    const { id } = await params

    const existing = await db
      .selectFrom('customers')
      .select(['id', 'name'])
      .where('id', '=', id)
      .where('tenant_id', '=', tenant.id as any)
      .executeTakeFirst()

    if (!existing) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })

    await db
      .deleteFrom('customers')
      .where('id', '=', id)
      .where('tenant_id', '=', tenant.id as any)
      .execute()

    await logOperation({
      tenantId: tenant.id,
      userId: token.id as string,
      userName: token.name as string,
      action: 'DELETE_CUSTOMER',
      entityType: 'customer',
      entityId: id,
      detail: { name: existing.name },
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[customers/id:DELETE]', error)
    return NextResponse.json({ error: 'Error al eliminar cliente' }, { status: 500 })
  }
}
