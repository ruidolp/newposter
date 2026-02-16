import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { db } from '@/database/db'
import { requireTenant } from '@/lib/tenant'
import { hashPassword } from '@/lib/auth'

async function getAdminToken(request: NextRequest) {
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })
  if (!token || !['ADMIN', 'OWNER'].includes(token.role as string)) return null
  return token
}

/**
 * POST /api/rrhh/employees/[id]/create-user
 *
 * Crea un usuario del sistema vinculado al empleado.
 * Contraseña inicial = RUT sin puntos ni guión (solo dígitos + verificador).
 * Ej: 12.345.678-9 → "123456789"
 *
 * Devuelve las credenciales en texto plano UNA SOLA VEZ para compartir por WhatsApp.
 * El hash se guarda en DB — nunca se vuelve a exponer.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = await getAdminToken(request)
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const tenant = await requireTenant()
    const { id: employeeId } = await params

    // Obtener empleado
    const employee = await (db as any)
      .selectFrom('rrhh_employees')
      .selectAll()
      .where('id', '=', employeeId)
      .where('tenant_id', '=', tenant.id)
      .executeTakeFirst()

    if (!employee) {
      return NextResponse.json({ error: 'Empleado no encontrado' }, { status: 404 })
    }

    // Si ya tiene usuario vinculado
    if (employee.user_id) {
      const existingUser = await db
        .selectFrom('users')
        .select(['id', 'email', 'name', 'role'])
        .where('id', '=', employee.user_id)
        .executeTakeFirst()
      return NextResponse.json({
        error: 'El empleado ya tiene una cuenta vinculada',
        existing_user: existingUser,
      }, { status: 409 })
    }

    // Validar que tenga email
    if (!employee.email?.trim()) {
      return NextResponse.json({
        error: 'El empleado necesita un email para crear su cuenta',
      }, { status: 400 })
    }

    // Verificar que el email no esté en uso en este tenant
    const emailInUse = await db
      .selectFrom('users')
      .select('id')
      .where('email', '=', employee.email.toLowerCase())
      .where('tenant_id', '=', tenant.id as any)
      .executeTakeFirst()

    if (emailInUse) {
      return NextResponse.json({
        error: 'Ya existe un usuario con ese email en el sistema',
        tip: 'Puedes vincular la cuenta existente desde la opción "Vincular usuario".',
      }, { status: 409 })
    }

    // Contraseña inicial = RUT limpio (sin puntos, sin guión)
    // Ej: "12.345.678-9" → "123456789"
    const rawPassword = employee.rut.replace(/[.\-]/g, '')
    const passwordHash = await hashPassword(rawPassword)

    // Determinar rol: EMPLOYEE (solo RRHH), puede ser promovido después
    const role = 'EMPLOYEE'

    // Crear usuario
    const newUser = await db
      .insertInto('users')
      .values({
        tenant_id: tenant.id as any,
        name: employee.full_name,
        email: employee.email.toLowerCase(),
        password_hash: passwordHash,
        role,
        active: true,
      } as any)
      .returningAll()
      .executeTakeFirstOrThrow()

    // Vincular al empleado
    await (db as any)
      .updateTable('rrhh_employees')
      .set({ user_id: newUser.id, updated_at: new Date() })
      .where('id', '=', employeeId)
      .where('tenant_id', '=', tenant.id)
      .execute()

    // Retornar credenciales (solo esta vez)
    return NextResponse.json({
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
      },
      credentials: {
        email: newUser.email,
        password: rawPassword, // solo se expone aquí, nunca más
      },
    }, { status: 201 })
  } catch (error) {
    console.error('[rrhh/employees/create-user:POST]', error)
    return NextResponse.json({ error: 'Error al crear cuenta' }, { status: 500 })
  }
}
