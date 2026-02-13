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

// GET /api/suppliers/[id]
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = await getAdminToken(request)
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { id } = await params
    const tenant = await requireTenant()

    const supplier = await db
      .selectFrom('suppliers')
      .selectAll()
      .where('id', '=', id)
      .where('tenant_id', '=', tenant.id as any)
      .executeTakeFirst()

    if (!supplier) return NextResponse.json({ error: 'Proveedor no encontrado' }, { status: 404 })
    return NextResponse.json(supplier)
  } catch (error) {
    console.error('[suppliers/[id]:GET]', error)
    return NextResponse.json({ error: 'Error al obtener proveedor' }, { status: 500 })
  }
}

// PUT /api/suppliers/[id]
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = await getAdminToken(request)
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { id } = await params
    const tenant = await requireTenant()
    const body = await request.json()

    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'El nombre del proveedor es requerido' }, { status: 400 })
    }

    const supplier = await db
      .updateTable('suppliers')
      .set({
        name: body.name.trim(),
        rut: body.rut?.trim() || null,
        email: body.email?.trim() || null,
        phone: body.phone?.trim() || null,
        address: body.address?.trim() || null,
        contact_name: body.contact_name?.trim() || null,
        notes: body.notes?.trim() || null,
        active: body.active !== false,
        updated_at: new Date(),
      })
      .where('id', '=', id)
      .where('tenant_id', '=', tenant.id as any)
      .returningAll()
      .executeTakeFirst()

    if (!supplier) return NextResponse.json({ error: 'Proveedor no encontrado' }, { status: 404 })

    await logOperation({
      tenantId: tenant.id,
      userId: token.id as string,
      userName: token.name as string,
      action: 'UPDATE_SUPPLIER',
      entityType: 'supplier',
      entityId: id,
      detail: { name: supplier.name },
    })

    return NextResponse.json(supplier)
  } catch (error) {
    console.error('[suppliers/[id]:PUT]', error)
    return NextResponse.json({ error: 'Error al actualizar proveedor' }, { status: 500 })
  }
}

// DELETE /api/suppliers/[id] — soft delete
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = await getAdminToken(request)
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { id } = await params
    const tenant = await requireTenant()

    const supplier = await db
      .updateTable('suppliers')
      .set({ active: false, updated_at: new Date() })
      .where('id', '=', id)
      .where('tenant_id', '=', tenant.id as any)
      .returningAll()
      .executeTakeFirst()

    if (!supplier) return NextResponse.json({ error: 'Proveedor no encontrado' }, { status: 404 })

    await logOperation({
      tenantId: tenant.id,
      userId: token.id as string,
      userName: token.name as string,
      action: 'DELETE_SUPPLIER',
      entityType: 'supplier',
      entityId: id,
      detail: { name: supplier.name },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[suppliers/[id]:DELETE]', error)
    return NextResponse.json({ error: 'Error al eliminar proveedor' }, { status: 500 })
  }
}
