import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { db } from '@/database/db'
import { requireTenant } from '@/lib/tenant'

/**
 * GET /api/rrhh/users-without-profile
 *
 * Lista los users del sistema de ventas que NO tienen perfil de empleado RRHH.
 * Permite "importarlos" al módulo RRHH sin duplicar login.
 */
export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })
    if (!token || !['ADMIN', 'OWNER'].includes(token.role as string)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const tenant = await requireTenant()

    // IDs de users que ya tienen perfil RRHH
    const linkedUserIds = await (db as any)
      .selectFrom('rrhh_employees')
      .select('user_id')
      .where('tenant_id', '=', tenant.id)
      .where('user_id', 'is not', null)
      .execute()

    const linkedIds = linkedUserIds.map((r: any) => r.user_id).filter(Boolean)

    let query = db
      .selectFrom('users')
      .select(['id', 'name', 'email', 'role', 'active', 'created_at'])
      .where('tenant_id', '=', tenant.id as any)
      .orderBy('name', 'asc')

    if (linkedIds.length > 0) {
      query = query.where('id', 'not in', linkedIds) as any
    }

    const users = await query.execute()

    return NextResponse.json({ users })
  } catch (error) {
    console.error('[rrhh/users-without-profile:GET]', error)
    return NextResponse.json({ error: 'Error al obtener usuarios' }, { status: 500 })
  }
}
