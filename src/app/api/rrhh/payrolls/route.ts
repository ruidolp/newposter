import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { db } from '@/database/db'
import { requireTenant } from '@/lib/tenant'
import { calculatePayroll } from '@/modules/rrhh/lib/payroll'
import { CL_CONFIG } from '@/modules/rrhh/lib/countries/cl'

async function getAdminToken(request: NextRequest) {
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })
  if (!token || !['ADMIN', 'OWNER'].includes(token.role as string)) return null
  return token
}

// GET /api/rrhh/payrolls
export async function GET(request: NextRequest) {
  try {
    const token = await getAdminToken(request)
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const tenant = await requireTenant()
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employee_id')
    const year = searchParams.get('year')
    const month = searchParams.get('month')

    let query = (db as any)
      .selectFrom('rrhh_payrolls as p')
      .leftJoin('rrhh_employees as e', 'e.id', 'p.employee_id')
      .select([
        'p.id', 'p.employee_id', 'p.period_year', 'p.period_month',
        'p.gross_salary', 'p.net_salary', 'p.total_deductions',
        'p.status', 'p.issued_at', 'p.paid_at', 'p.created_at',
        'e.full_name as employee_name',
        'e.rut as employee_rut',
      ])
      .where('p.tenant_id', '=', tenant.id)
      .orderBy('p.period_year', 'desc')
      .orderBy('p.period_month', 'desc')

    if (employeeId) query = query.where('p.employee_id', '=', employeeId)
    if (year) query = query.where('p.period_year', '=', parseInt(year))
    if (month) query = query.where('p.period_month', '=', parseInt(month))

    const payrolls = await query.execute()
    return NextResponse.json({ payrolls })
  } catch (error) {
    console.error('[rrhh/payrolls:GET]', error)
    return NextResponse.json({ error: 'Error al obtener liquidaciones' }, { status: 500 })
  }
}

// POST /api/rrhh/payrolls — generar liquidación
export async function POST(request: NextRequest) {
  try {
    const token = await getAdminToken(request)
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const tenant = await requireTenant()
    const body = await request.json()

    const { employee_id, period_year, period_month, absent_days = 0, vacation_days = 0,
      other_deductions = 0, notes, utm_value } = body

    if (!employee_id || !period_year || !period_month) {
      return NextResponse.json({ error: 'Empleado y período son requeridos' }, { status: 400 })
    }

    // Verificar que no exista ya
    const existing = await (db as any)
      .selectFrom('rrhh_payrolls')
      .select('id')
      .where('tenant_id', '=', tenant.id)
      .where('employee_id', '=', employee_id)
      .where('period_year', '=', period_year)
      .where('period_month', '=', period_month)
      .executeTakeFirst()

    if (existing) {
      return NextResponse.json({ error: 'Ya existe una liquidación para ese período' }, { status: 409 })
    }

    // Obtener contrato activo
    const contract = await (db as any)
      .selectFrom('rrhh_contracts')
      .selectAll()
      .where('employee_id', '=', employee_id)
      .where('is_current', '=', true)
      .executeTakeFirst()

    if (!contract) {
      return NextResponse.json({ error: 'El empleado no tiene contrato activo' }, { status: 400 })
    }

    // Sumar HHEE aprobadas del período
    const startOfMonth = `${period_year}-${String(period_month).padStart(2, '0')}-01`
    const endOfMonth = new Date(period_year, period_month, 0).toISOString().split('T')[0]

    const overtimeRows = await (db as any)
      .selectFrom('rrhh_overtime')
      .select('amount')
      .where('employee_id', '=', employee_id)
      .where('tenant_id', '=', tenant.id)
      .where('status', '=', 'approved')
      .where('payroll_id', 'is', null)
      .where('overtime_date', '>=', startOfMonth)
      .where('overtime_date', '<=', endOfMonth)
      .execute()

    const overtimeTotal = overtimeRows.reduce((sum: number, r: any) => sum + Number(r.amount), 0)

    const config = CL_CONFIG // TODO: por país del empleado

    const result = calculatePayroll(
      {
        baseSalary: Number(contract.base_salary),
        overtimeTotal,
        transportAllowance: Number(contract.transport_allowance || 0),
        foodAllowance: Number(contract.food_allowance || 0),
        otherAllowances: Number(contract.other_allowances || 0),
        absentDays: absent_days,
        workingDaysInMonth: 26,
        afpRateOverride: undefined,
        healthRateOverride: undefined,
        healthAdditionalRate: Number(contract.health_additional_rate || 0),
        otherDeductions: other_deductions,
        utmValue: utm_value,
      },
      config,
      utm_value
    )

    const payroll = await (db as any)
      .insertInto('rrhh_payrolls')
      .values({
        tenant_id: tenant.id,
        employee_id,
        contract_id: contract.id,
        period_year,
        period_month,
        base_salary: result.baseSalary,
        overtime_total: result.overtimeTotal,
        transport_allowance: result.transportAllowance,
        food_allowance: result.foodAllowance,
        other_allowances: result.otherAllowances,
        gross_salary: result.grossSalary,
        afp_amount: result.afpAmount,
        health_amount: result.healthAmount,
        unemployment_amount: result.unemploymentAmount,
        tax_amount: result.taxAmount,
        other_deductions: result.otherDeductions,
        total_deductions: result.totalDeductions,
        net_salary: result.netSalary,
        afp_rate_applied: result.afpRate,
        health_rate_applied: result.healthRate,
        status: 'draft',
        working_days: 26 - absent_days,
        absent_days,
        vacation_days_in_period: vacation_days,
        notes: notes?.trim() || null,
        created_by_user_id: token.id,
      })
      .returningAll()
      .executeTakeFirstOrThrow()

    // Marcar HHEE como incluidas en esta liquidación
    if (overtimeRows.length > 0) {
      await (db as any)
        .updateTable('rrhh_overtime')
        .set({ payroll_id: payroll.id, status: 'paid' })
        .where('employee_id', '=', employee_id)
        .where('tenant_id', '=', tenant.id)
        .where('status', '=', 'approved')
        .where('payroll_id', 'is', null)
        .where('overtime_date', '>=', startOfMonth)
        .where('overtime_date', '<=', endOfMonth)
        .execute()
    }

    return NextResponse.json(payroll, { status: 201 })
  } catch (error) {
    console.error('[rrhh/payrolls:POST]', error)
    return NextResponse.json({ error: 'Error al generar liquidación' }, { status: 500 })
  }
}
