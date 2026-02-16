import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { db } from '@/database/db'
import { requireTenant } from '@/lib/tenant'

/**
 * GET /api/rrhh/check-email?email=X&exclude_employee_id=Y
 *
 * Busca si existe un user en el sistema con ese email.
 * Usado al crear/editar empleado para detectar duplicados y ofrecer vincular.
 */
export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })
    if (!token || !['ADMIN', 'OWNER'].includes(token.role as string)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const tenant = await requireTenant()
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')?.trim().toLowerCase()
    const excludeEmployeeId = searchParams.get('exclude_employee_id')

    if (!email) return NextResponse.json({ found: false })

    // Buscar user con ese email en el tenant
    const user = await db
      .selectFrom('users')
      .select(['id', 'name', 'email', 'role'])
      .where('email', '=', email)
      .where('tenant_id', '=', tenant.id as any)
      .executeTakeFirst()

    if (!user) return NextResponse.json({ found: false })

    // Verificar si ese user ya está vinculado a un empleado (distinto al actual)
    let alreadyLinkedQuery = (db as any)
      .selectFrom('rrhh_employees')
      .select(['id', 'full_name'])
      .where('tenant_id', '=', tenant.id)
      .where('user_id', '=', user.id)

    if (excludeEmployeeId) {
      alreadyLinkedQuery = alreadyLinkedQuery.where('id', '!=', excludeEmployeeId)
    }

    const alreadyLinked = await alreadyLinkedQuery.executeTakeFirst()

    return NextResponse.json({
      found: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      already_linked_to: alreadyLinked
        ? { id: alreadyLinked.id, name: alreadyLinked.full_name }
        : null,
    })
  } catch (error) {
    console.error('[rrhh/check-email:GET]', error)
    return NextResponse.json({ error: 'Error al verificar email' }, { status: 500 })
  }
}
