import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { db } from '@/database/db'
import { requireTenant } from '@/lib/tenant'
import { calcOvertimeAmount, calcHourlyRate } from '@/modules/rrhh/lib/payroll'
import { CL_CONFIG } from '@/modules/rrhh/lib/countries/cl'

const ALLOWED_ROLES = ['ADMIN', 'OWNER', 'EMPLOYEE']

async function getToken_(request: NextRequest) {
  return getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })
}

// GET /api/rrhh/overtime
export async function GET(request: NextRequest) {
  try {
    const token = await getToken_(request)
    if (!token || !ALLOWED_ROLES.includes(token.role as string)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const tenant = await requireTenant()
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employee_id')
    const status = searchParams.get('status') || 'all'

    let query = (db as any)
      .selectFrom('rrhh_overtime as o')
      .leftJoin('rrhh_employees as e', 'e.id', 'o.employee_id')
      .select([
        'o.id', 'o.employee_id', 'o.overtime_date', 'o.hours', 'o.overtime_type',
        'o.multiplier', 'o.hourly_rate', 'o.amount', 'o.status',
        'o.description', 'o.approved_at', 'o.created_at',
        'e.full_name as employee_name',
      ])
      .where('o.tenant_id', '=', tenant.id)
      .orderBy('o.overtime_date', 'desc')

    // EMPLOYEE solo ve sus propias HHEE
    if (token.role === 'EMPLOYEE') {
      const myEmployee = await (db as any)
        .selectFrom('rrhh_employees')
        .select('id')
        .where('tenant_id', '=', tenant.id)
        .where('user_id', '=', token.id as string)
        .executeTakeFirst()

      if (!myEmployee) return NextResponse.json({ overtime: [] })
      query = query.where('o.employee_id', '=', myEmployee.id)
    } else {
      if (employeeId) query = query.where('o.employee_id', '=', employeeId)
    }

    if (status !== 'all') query = query.where('o.status', '=', status)

    const overtime = await query.execute()
    return NextResponse.json({ overtime })
  } catch (error) {
    console.error('[rrhh/overtime:GET]', error)
    return NextResponse.json({ error: 'Error al obtener HHEE' }, { status: 500 })
  }
}

// POST /api/rrhh/overtime
export async function POST(request: NextRequest) {
  try {
    const token = await getToken_(request)
    if (!token || !ALLOWED_ROLES.includes(token.role as string)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const tenant = await requireTenant()
    const body = await request.json()

    let employeeId = body.employee_id

    // EMPLOYEE → siempre usa su propio perfil
    if (token.role === 'EMPLOYEE') {
      const myEmployee = await (db as any)
        .selectFrom('rrhh_employees')
        .select('id')
        .where('tenant_id', '=', tenant.id)
        .where('user_id', '=', token.id as string)
        .executeTakeFirst()

      if (!myEmployee) {
        return NextResponse.json({ error: 'No tienes perfil de empleado. Contacta a RRHH.' }, { status: 404 })
      }
      employeeId = myEmployee.id
    }

    if (!employeeId || !body.overtime_date || !body.hours || !body.overtime_type) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    if (body.hours <= 0 || body.hours > 12) {
      return NextResponse.json({ error: 'Horas deben ser entre 0 y 12' }, { status: 400 })
    }

    // Obtener sueldo actual para calcular valor hora
    const contract = await (db as any)
      .selectFrom('rrhh_contracts')
      .select(['base_salary', 'hourly_rate'])
      .where('employee_id', '=', employeeId)
      .where('is_current', '=', true)
      .executeTakeFirst()

    let hourlyRate = contract?.hourly_rate
    if (!hourlyRate && contract?.base_salary) {
      hourlyRate = calcHourlyRate(Number(contract.base_salary))
    }
    if (!hourlyRate) {
      return NextResponse.json({ error: 'El empleado no tiene contrato activo con sueldo definido' }, { status: 400 })
    }

    const config = CL_CONFIG
    const amount = calcOvertimeAmount(Number(body.hours), Number(hourlyRate), body.overtime_type, config)
    const multiplier = body.overtime_type === 'regular'
      ? config.overtimeRegularMultiplier
      : config.overtimeSpecialMultiplier

    const ot = await (db as any)
      .insertInto('rrhh_overtime')
      .values({
        tenant_id: tenant.id,
        employee_id: employeeId,
        overtime_date: body.overtime_date,
        hours: Number(body.hours),
        overtime_type: body.overtime_type,
        multiplier,
        hourly_rate: hourlyRate,
        amount,
        status: 'pending',
        description: body.description?.trim() || null,
        created_by_user_id: token.id,
      })
      .returningAll()
      .executeTakeFirstOrThrow()

    return NextResponse.json(ot, { status: 201 })
  } catch (error) {
    console.error('[rrhh/overtime:POST]', error)
    return NextResponse.json({ error: 'Error al registrar HHEE' }, { status: 500 })
  }
}
