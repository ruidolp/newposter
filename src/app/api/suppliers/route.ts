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

// GET /api/suppliers — listar proveedores
export async function GET(request: NextRequest) {
  try {
    const token = await getAdminToken(request)
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const tenant = await requireTenant()
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const includeInactive = searchParams.get('all') === 'true'

    let query = db
      .selectFrom('suppliers')
      .selectAll()
      .where('tenant_id', '=', tenant.id as any)
      .orderBy('name', 'asc')

    if (!includeInactive) {
      query = query.where('active', '=', true)
    }

    if (search) {
      query = query.where((eb) =>
        eb.or([
          eb('name', 'ilike', `%${search}%`),
          eb('rut', 'ilike', `%${search}%`),
          eb('contact_name', 'ilike', `%${search}%`),
        ])
      )
    }

    const suppliers = await query.execute()
    return NextResponse.json({ suppliers })
  } catch (error) {
    console.error('[suppliers:GET]', error)
    return NextResponse.json({ error: 'Error al obtener proveedores' }, { status: 500 })
  }
}

// POST /api/suppliers — crear proveedor
export async function POST(request: NextRequest) {
  try {
    const token = await getAdminToken(request)
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const tenant = await requireTenant()
    const body = await request.json()

    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'El nombre del proveedor es requerido' }, { status: 400 })
    }

    const supplier = await db
      .insertInto('suppliers')
      .values({
        tenant_id: tenant.id as any,
        name: body.name.trim(),
        rut: body.rut?.trim() || null,
        email: body.email?.trim() || null,
        phone: body.phone?.trim() || null,
        address: body.address?.trim() || null,
        contact_name: body.contact_name?.trim() || null,
        notes: body.notes?.trim() || null,
        active: true,
      })
      .returningAll()
      .executeTakeFirstOrThrow()

    await logOperation({
      tenantId: tenant.id,
      userId: token.id as string,
      userName: token.name as string,
      action: 'CREATE_SUPPLIER',
      entityType: 'supplier',
      entityId: supplier.id,
      detail: { name: supplier.name, rut: supplier.rut },
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
    })

    return NextResponse.json(supplier, { status: 201 })
  } catch (error) {
    console.error('[suppliers:POST]', error)
    return NextResponse.json({ error: 'Error al crear proveedor' }, { status: 500 })
  }
}
