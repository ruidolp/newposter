import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { db } from '@/database/db'
import { requireTenant } from '@/lib/tenant'

async function getAdminToken(request: NextRequest) {
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })
  if (!token || !['ADMIN', 'OWNER'].includes(token.role as string)) return null
  return token
}

// GET /api/rrhh/employees/[id] — ficha completa
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = await getAdminToken(request)
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const tenant = await requireTenant()
    const { id } = await params

    const employee = await (db as any)
      .selectFrom('rrhh_employees as e')
      .leftJoin('rrhh_employees as m', 'm.id', 'e.manager_id')
      .selectAll('e')
      .select('m.full_name as manager_name')
      .where('e.id', '=', id)
      .where('e.tenant_id', '=', tenant.id)
      .executeTakeFirst()

    if (!employee) return NextResponse.json({ error: 'Empleado no encontrado' }, { status: 404 })

    const contracts = await (db as any)
      .selectFrom('rrhh_contracts')
      .selectAll()
      .where('employee_id', '=', id)
      .orderBy('created_at', 'desc')
      .execute()

    const currentYear = new Date().getFullYear()
    const vacationBalance = await (db as any)
      .selectFrom('rrhh_vacation_balances')
      .selectAll()
      .where('employee_id', '=', id)
      .where('year', '=', currentYear)
      .executeTakeFirst()

    return NextResponse.json({ employee, contracts, vacationBalance })
  } catch (error) {
    console.error('[rrhh/employees/[id]:GET]', error)
    return NextResponse.json({ error: 'Error al obtener empleado' }, { status: 500 })
  }
}

// PATCH /api/rrhh/employees/[id]
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = await getAdminToken(request)
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const tenant = await requireTenant()
    const { id } = await params
    const body = await request.json()

    const allowed = [
      'full_name', 'email', 'phone', 'address', 'birth_date', 'nationality',
      'employee_code', 'position', 'department', 'contract_type', 'status',
      'manager_id', 'user_id', 'bank_name', 'bank_account_type', 'bank_account_number', 'notes',
    ]
    const dateFields = new Set(['birth_date'])
    const updates: Record<string, unknown> = { updated_at: new Date() }
    for (const key of allowed) {
      if (key in body) {
        const val = body[key]
        // Campos de fecha: string vacío → null para evitar error de Postgres
        updates[key] = (dateFields.has(key) && val === '') ? null : (val ?? null)
      }
    }

    const updated = await (db as any)
      .updateTable('rrhh_employees')
      .set(updates)
      .where('id', '=', id)
      .where('tenant_id', '=', tenant.id)
      .returningAll()
      .executeTakeFirst()

    if (!updated) return NextResponse.json({ error: 'Empleado no encontrado' }, { status: 404 })
    return NextResponse.json(updated)
  } catch (error) {
    console.error('[rrhh/employees/[id]:PATCH]', error)
    return NextResponse.json({ error: 'Error al actualizar empleado' }, { status: 500 })
  }
}
