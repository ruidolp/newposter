import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { db } from '@/database/db'
import { requireTenant } from '@/lib/tenant'

/**
 * POST /api/rrhh/activate
 * Activa el módulo RRHH para el tenant.
 * Solo OWNER o ADMIN pueden hacerlo.
 */
export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })
    if (!token || !['OWNER', 'ADMIN'].includes(token.role as string)) {
      return NextResponse.json({ error: 'Solo el propietario o administrador puede activar este módulo' }, { status: 403 })
    }

    const tenant = await requireTenant()

    const settings = await db
      .selectFrom('tenant_settings')
      .select(['id', 'metadata'])
      .where('tenant_id', '=', tenant.id)
      .executeTakeFirst()

    const currentMeta = (settings?.metadata ?? {}) as Record<string, unknown>

    await db
      .updateTable('tenant_settings')
      .set({
        metadata: {
          ...currentMeta,
          rrhh_enabled: true,
          rrhh_activated_at: new Date().toISOString(),
          rrhh_activated_by: token.id,
        },
      })
      .where('tenant_id', '=', tenant.id)
      .execute()

    // Auto-crear ficha del usuario que activa el módulo (si no existe ya)
    const activatingUser = await db
      .selectFrom('users')
      .select(['id', 'name', 'email'])
      .where('id', '=', token.id as string)
      .where('tenant_id', '=', tenant.id)
      .executeTakeFirst()

    if (activatingUser) {
      const alreadyHasProfile = await (db as any)
        .selectFrom('rrhh_employees')
        .select('id')
        .where('tenant_id', '=', tenant.id)
        .where('user_id', '=', activatingUser.id)
        .executeTakeFirst()

      if (!alreadyHasProfile) {
        await (db as any)
          .insertInto('rrhh_employees')
          .values({
            tenant_id: tenant.id,
            rut: 'pendiente',
            full_name: activatingUser.name ?? activatingUser.email,
            email: activatingUser.email,
            position: 'Por definir',
            hire_date: new Date().toISOString().split('T')[0],
            contract_type: 'indefinido',
            status: 'active',
            user_id: activatingUser.id,
            country_code: 'CL',
          })
          .execute()
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[rrhh/activate:POST]', error)
    return NextResponse.json({ error: 'Error al activar el módulo' }, { status: 500 })
  }
}

/**
 * GET /api/rrhh/activate
 * Verifica si el módulo RRHH está activado para el tenant.
 */
export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const tenant = await requireTenant()

    const settings = await db
      .selectFrom('tenant_settings')
      .select('metadata')
      .where('tenant_id', '=', tenant.id)
      .executeTakeFirst()

    const meta = (settings?.metadata ?? {}) as Record<string, unknown>
    const enabled = meta.rrhh_enabled === true

    return NextResponse.json({ enabled })
  } catch (error) {
    console.error('[rrhh/activate:GET]', error)
    return NextResponse.json({ error: 'Error al verificar módulo' }, { status: 500 })
  }
}
