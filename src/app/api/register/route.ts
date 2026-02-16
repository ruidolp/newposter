
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/database/db'

// POST /api/register — crear empresa + usuario owner (Público)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validaciones básicas
    if (!body.name?.trim()) return NextResponse.json({ error: 'El nombre de la empresa es requerido' }, { status: 400 })
    if (!body.slug?.trim()) return NextResponse.json({ error: 'El slug es requerido' }, { status: 400 })
    if (!/^[a-z0-9-]+$/.test(body.slug)) return NextResponse.json({ error: 'El slug solo puede tener letras minúsculas, números y guiones' }, { status: 400 })
    if (!body.owner_name?.trim()) return NextResponse.json({ error: 'El nombre del responsable es requerido' }, { status: 400 })
    if (!body.owner_email?.trim()) return NextResponse.json({ error: 'El email es requerido' }, { status: 400 })
    if (!body.owner_password || body.owner_password.length < 6) return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 })

    // Verificar slug único
    const slugExists = await db.selectFrom('tenants').select('id').where('slug', '=', body.slug.trim()).executeTakeFirst()
    if (slugExists) return NextResponse.json({ error: 'Ya existe una empresa con esa URL identificadora' }, { status: 409 })

    // Verificar email único (opcional, pero buena práctica si queremos evitar spam de cuentas con mismo email en diferentes tenants, 
    // aunque un usuario PODRÍA tener cuentas en varios tenants. Por ahora lo dejamos libre o restringimos al tenant? 
    // En este modelo multi-tenant, el email es unico POR TENANT en la tabla users, pero aquí estamos creando un tenant nuevo.
    // Si la tabla users tiene restriccion unique global en email, fallaria. Revisemos schema.
    // Schema: users -> email string. No veo constraint unique global explicito en el schema.ts, pero suele ser unique. 
    // Asumiremos que es unique por tenant o global. Si es global, deberiamos chequearlo. 
    // Dado que el login suele ser por email + tenant (o slug en url), es probable que sea unique solo en contexto, 
    // PERO para el owner, quizas queramos que sea unique. 
    // Ignoraremos check de email global por ahora y dejamos que la DB falle si hay constraint.
    
    const result = await db.transaction().execute(async (trx) => {
      // 1. Crear tenant
      const tenant = await trx
        .insertInto('tenants')
        .values({
          name: body.name.trim(),
          slug: body.slug.trim(),
          plan: 'FREE', // Plan por defecto
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

      // 3. Crear sucursal principal por defecto
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

      // 4. Crear usuario owner
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

      return { tenant, owner }
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('[register:POST]', error)
    return NextResponse.json({ error: 'Error al registrar la empresa' }, { status: 500 })
  }
}
