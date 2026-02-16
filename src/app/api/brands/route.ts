import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/database/db'
import { requireTenant } from '@/lib/tenant'

function toSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

async function resolveUniqueSlug(tenantId: string, raw: string) {
  const base = toSlug(raw) || 'marca'
  let candidate = base
  let i = 1

  while (true) {
    const exists = await db
      .selectFrom('brands')
      .select('id')
      .where('tenant_id', '=', tenantId as any)
      .where('slug', '=', candidate)
      .executeTakeFirst()
    if (!exists) return candidate
    candidate = `${base}-${i++}`
  }
}

// GET /api/brands — listar marcas del tenant
export async function GET() {
  try {
    const tenant = await requireTenant()
    const brands = await db
      .selectFrom('brands')
      .selectAll()
      .where('tenant_id', '=', tenant.id as any)
      .orderBy('name', 'asc')
      .execute()

    return NextResponse.json({ brands })
  } catch (error) {
    console.error('[brands:GET]', error)
    return NextResponse.json({ error: 'Error al obtener marcas' }, { status: 500 })
  }
}

// POST /api/brands — crear marca
export async function POST(request: NextRequest) {
  try {
    const tenant = await requireTenant()
    const body = await request.json()
    const name = String(body?.name ?? '').trim()

    if (!name) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })
    }

    const existing = await db
      .selectFrom('brands')
      .select('id')
      .where('tenant_id', '=', tenant.id as any)
      .where('name', '=', name)
      .executeTakeFirst()

    if (existing) {
      return NextResponse.json({ error: 'Ya existe una marca con ese nombre' }, { status: 409 })
    }

    const slug = await resolveUniqueSlug(tenant.id, body?.slug || name)

    const brand = await db
      .insertInto('brands')
      .values({
        tenant_id: tenant.id as any,
        name,
        slug,
        active: true,
      })
      .returningAll()
      .executeTakeFirstOrThrow()

    return NextResponse.json(brand, { status: 201 })
  } catch (error) {
    console.error('[brands:POST]', error)
    return NextResponse.json({ error: 'Error al crear marca' }, { status: 500 })
  }
}
