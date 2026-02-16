import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/database/db'
import { getSuperadminId } from '@/lib/superadmin-auth'

async function requireSuperadmin(request: NextRequest) {
  const id = await getSuperadminId()
  if (!id) return null
  return id
}

// GET /api/superadmin/tenants — listar todas las empresas con stats
export async function GET(request: NextRequest) {
  try {
    const adminId = await requireSuperadmin(request)
    if (!adminId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const tenants = await db
      .selectFrom('tenants')
      .selectAll()
      .orderBy('created_at', 'desc')
      .execute()

    // Contar usuarios y productos por tenant
    const stats = await Promise.all(
      tenants.map(async (t) => {
        const [userCount, productCount] = await Promise.all([
          db.selectFrom('users').select(db.fn.countAll<number>().as('n'))
            .where('tenant_id', '=', t.id).executeTakeFirst(),
          db.selectFrom('products').select(db.fn.countAll<number>().as('n'))
            .where('tenant_id', '=', t.id).executeTakeFirst(),
        ])
        return {
          ...t,
          user_count: Number(userCount?.n ?? 0),
          product_count: Number(productCount?.n ?? 0),
        }
      })
    )

    return NextResponse.json({ tenants: stats })
  } catch (error) {
    console.error('[superadmin/tenants:GET]', error)
    return NextResponse.json({ error: 'Error al obtener empresas' }, { status: 500 })
  }
}

// POST /api/superadmin/tenants — crear empresa + usuario owner
export async function POST(request: NextRequest) {
  try {
    const adminId = await requireSuperadmin(request)
    if (!adminId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await request.json()

    // Validaciones
    if (!body.name?.trim()) return NextResponse.json({ error: 'El nombre de la empresa es requerido' }, { status: 400 })
    if (!body.slug?.trim()) return NextResponse.json({ error: 'El slug es requerido' }, { status: 400 })
    if (!/^[a-z0-9-]+$/.test(body.slug)) return NextResponse.json({ error: 'El slug solo puede tener letras minúsculas, números y guiones' }, { status: 400 })
    if (!body.owner_name?.trim()) return NextResponse.json({ error: 'El nombre del owner es requerido' }, { status: 400 })
    if (!body.owner_email?.trim()) return NextResponse.json({ error: 'El email del owner es requerido' }, { status: 400 })
    if (!body.owner_password || body.owner_password.length < 6) return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 })

    // Verificar slug único
    const slugExists = await db.selectFrom('tenants').select('id').where('slug', '=', body.slug.trim()).executeTakeFirst()
    if (slugExists) return NextResponse.json({ error: 'Ya existe una empresa con ese slug' }, { status: 409 })

    const result = await db.transaction().execute(async (trx) => {
      // 1. Crear tenant
      const tenant = await trx
        .insertInto('tenants')
        .values({
          name: body.name.trim(),
          slug: body.slug.trim(),
          plan: body.plan || 'FREE',
          active: true,
        })
        .returningAll()
        .executeTakeFirstOrThrow()

      // 2. Crear tenant_settings por defecto
      await trx
        .insertInto('tenant_settings')
        .values({
          tenant_id: tenant.id,
          currency: 'CLP',
          timezone: 'America/Santiago',
          language: 'es',
          primary_color: '#7c3aed',
        })
        .execute()

      // 3. Crear usuario owner
      const password_hash = await bcrypt.hash(body.owner_password, 10)
      const owner = await trx
        .insertInto('users')
        .values({
          tenant_id: tenant.id,
          name: body.owner_name.trim(),
          email: body.owner_email.trim().toLowerCase(),
          password_hash,
          role: 'OWNER',
          active: true,
        })
        .returning(['id', 'name', 'email', 'role'])
        .executeTakeFirstOrThrow()

      // 4. Crear sucursal principal por defecto
      await trx
        .insertInto('locations')
        .values({
          tenant_id: tenant.id,
          name: 'Principal',
          type: 'STORE',
          is_default: true,
          active: true,
        })
        .execute()

      return { tenant, owner }
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('[superadmin/tenants:POST]', error)
    return NextResponse.json({ error: 'Error al crear empresa' }, { status: 500 })
  }
}
