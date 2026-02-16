import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { db } from '@/database/db'
import { requireTenant } from '@/lib/tenant'

async function getAdminToken(request: NextRequest) {
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })
  if (!token || !['ADMIN', 'OWNER'].includes(token.role as string)) return null
  return token
}

// GET /api/rrhh/employees
export async function GET(request: NextRequest) {
  try {
    const token = await getAdminToken(request)
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const tenant = await requireTenant()
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || 'active'

    let query = (db as any)
      .selectFrom('rrhh_employees as e')
      .leftJoin('rrhh_employees as m', 'm.id', 'e.manager_id')
      .leftJoin(
        (db as any)
          .selectFrom('rrhh_contracts')
          .select(['employee_id', 'base_salary'])
          .where('is_current', '=', true)
          .as('c'),
        'c.employee_id', 'e.id'
      )
      .select([
        'e.id', 'e.rut', 'e.full_name', 'e.email', 'e.phone',
        'e.position', 'e.department', 'e.hire_date', 'e.contract_type',
        'e.status', 'e.manager_id', 'e.user_id', 'e.country_code',
        'e.created_at', 'e.updated_at',
        'm.full_name as manager_name',
        'c.base_salary as current_salary',
      ])
      .where('e.tenant_id', '=', tenant.id)
      .orderBy('e.full_name', 'asc')

    if (status !== 'all') {
      query = query.where('e.status', '=', status)
    }
    if (search) {
      query = query.where((eb: any) =>
        eb.or([
          eb('e.full_name', 'ilike', `%${search}%`),
          eb('e.rut', 'ilike', `%${search}%`),
          eb('e.position', 'ilike', `%${search}%`),
        ])
      )
    }

    const employees = await query.execute()
    return NextResponse.json({ employees })
  } catch (error) {
    console.error('[rrhh/employees:GET]', error)
    return NextResponse.json({ error: 'Error al obtener empleados' }, { status: 500 })
  }
}

// POST /api/rrhh/employees
export async function POST(request: NextRequest) {
  try {
    const token = await getAdminToken(request)
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const tenant = await requireTenant()
    const body = await request.json()

    if (!body.rut?.trim() || !body.full_name?.trim() || !body.position?.trim() || !body.hire_date) {
      return NextResponse.json({ error: 'RUT, nombre, cargo y fecha de ingreso son requeridos' }, { status: 400 })
    }

    const existing = await (db as any)
      .selectFrom('rrhh_employees')
      .select('id')
      .where('tenant_id', '=', tenant.id)
      .where('rut', '=', body.rut.trim())
      .executeTakeFirst()

    if (existing) {
      return NextResponse.json({ error: 'Ya existe un empleado con ese RUT' }, { status: 409 })
    }

    const employee = await (db as any)
      .insertInto('rrhh_employees')
      .values({
        tenant_id: tenant.id,
        rut: body.rut.trim(),
        full_name: body.full_name.trim(),
        email: body.email?.trim() || null,
        phone: body.phone?.trim() || null,
        address: body.address?.trim() || null,
        birth_date: body.birth_date || null,
        nationality: body.nationality?.trim() || 'Chilena',
        employee_code: body.employee_code?.trim() || null,
        position: body.position.trim(),
        department: body.department?.trim() || null,
        hire_date: body.hire_date,
        contract_type: body.contract_type || 'indefinido',
        status: 'active',
        manager_id: body.manager_id || null,
        user_id: body.user_id || null,
        country_code: body.country_code || 'CL',
        bank_name: body.bank_name?.trim() || null,
        bank_account_type: body.bank_account_type || null,
        bank_account_number: body.bank_account_number?.trim() || null,
        notes: body.notes?.trim() || null,
      })
      .returningAll()
      .executeTakeFirstOrThrow()

    // Si viene sueldo base, crear contrato inicial
    if (body.base_salary && Number(body.base_salary) > 0) {
      await (db as any)
        .insertInto('rrhh_contracts')
        .values({
          tenant_id: tenant.id,
          employee_id: employee.id,
          contract_type: body.contract_type || 'indefinido',
          base_salary: Number(body.base_salary),
          currency: 'CLP',
          start_date: body.hire_date,
          is_current: true,
          afp_institution: body.afp_institution || null,
          health_institution: body.health_institution || null,
          transport_allowance: Number(body.transport_allowance || 0),
          food_allowance: Number(body.food_allowance || 0),
          other_allowances: Number(body.other_allowances || 0),
        })
        .execute()
    }

    return NextResponse.json(employee, { status: 201 })
  } catch (error) {
    console.error('[rrhh/employees:POST]', error)
    return NextResponse.json({ error: 'Error al crear empleado' }, { status: 500 })
  }
}
