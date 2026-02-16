import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { db } from '@/database/db'
import { requireTenant } from '@/lib/tenant'

/**
 * GET /api/rrhh/me
 * Retorna el perfil rrhh_employee del usuario autenticado (por user_id).
 * Usado por formularios de auto-servicio (EMPLOYEE solicita para sí mismo).
 */
export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const tenant = await requireTenant()

    const employee = await (db as any)
      .selectFrom('rrhh_employees')
      .select(['id', 'full_name', 'rut', 'position', 'status'])
      .where('tenant_id', '=', tenant.id)
      .where('user_id', '=', token.id as string)
      .executeTakeFirst()

    // Retornar rol siempre; employee puede ser null (ADMIN sin ficha)
    return NextResponse.json({ employee: employee ?? null, role: token.role })
  } catch (error) {
    console.error('[rrhh/me:GET]', error)
    return NextResponse.json({ error: 'Error al obtener perfil' }, { status: 500 })
  }
}
