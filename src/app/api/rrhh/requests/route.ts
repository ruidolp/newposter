import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { db } from '@/database/db'
import { requireTenant } from '@/lib/tenant'
import { countWorkingDays } from '@/modules/rrhh/lib/vacations'

const ALLOWED_ROLES = ['ADMIN', 'OWNER', 'EMPLOYEE']

async function getToken_(request: NextRequest) {
  return getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })
}

// GET /api/rrhh/requests
export async function GET(request: NextRequest) {
  try {
    const token = await getToken_(request)
    if (!token || !ALLOWED_ROLES.includes(token.role as string)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const tenant = await requireTenant()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending'
    const employeeId = searchParams.get('employee_id')

    let query = (db as any)
      .selectFrom('rrhh_requests as r')
      .leftJoin('rrhh_employees as e', 'e.id', 'r.employee_id')
      .leftJoin('users as u', 'u.id', 'r.reviewed_by_user_id')
      .select([
        'r.id', 'r.employee_id', 'r.request_type', 'r.start_date', 'r.end_date',
        'r.working_days', 'r.is_half_day', 'r.half_day_period',
        'r.reason', 'r.status', 'r.review_notes',
        'r.reviewed_at', 'r.created_at',
        'e.full_name as employee_name',
        'e.rut as employee_rut',
        'u.name as reviewer_name',
      ])
      .where('r.tenant_id', '=', tenant.id)
      .orderBy('r.created_at', 'desc')

    if (status !== 'all') {
      query = query.where('r.status', '=', status)
    }

    // EMPLOYEE solo ve sus propias solicitudes
    if (token.role === 'EMPLOYEE') {
      const myEmployee = await (db as any)
        .selectFrom('rrhh_employees')
        .select('id')
        .where('tenant_id', '=', tenant.id)
        .where('user_id', '=', token.id as string)
        .executeTakeFirst()

      if (!myEmployee) return NextResponse.json({ requests: [] })
      query = query.where('r.employee_id', '=', myEmployee.id)
    } else if (employeeId) {
      query = query.where('r.employee_id', '=', employeeId)
    }

    const requests = await query.execute()
    return NextResponse.json({ requests })
  } catch (error) {
    console.error('[rrhh/requests:GET]', error)
    return NextResponse.json({ error: 'Error al obtener solicitudes' }, { status: 500 })
  }
}

// POST /api/rrhh/requests
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

    if (!employeeId || !body.request_type || !body.start_date || !body.end_date) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    const isHalfDay = body.is_half_day === true
    const workingDays = isHalfDay ? 0.5 : countWorkingDays(body.start_date, body.end_date)

    const req = await (db as any)
      .insertInto('rrhh_requests')
      .values({
        tenant_id: tenant.id,
        employee_id: employeeId,
        request_type: body.request_type,
        start_date: body.start_date,
        end_date: body.end_date,
        working_days: workingDays,
        is_half_day: isHalfDay,
        half_day_period: isHalfDay ? (body.half_day_period ?? 'AM') : null,
        reason: body.reason?.trim() || null,
        status: 'pending',
        created_by_user_id: token.id,
      })
      .returningAll()
      .executeTakeFirstOrThrow()

    return NextResponse.json(req, { status: 201 })
  } catch (error) {
    console.error('[rrhh/requests:POST]', error)
    return NextResponse.json({ error: 'Error al crear solicitud' }, { status: 500 })
  }
}
