import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { db } from '@/database/db'
import { requireTenant } from '@/lib/tenant'

async function getToken_(request: NextRequest) {
  return getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })
}

// PATCH /api/rrhh/requests/[id] — aprobar o rechazar
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = await getToken_(request)
    if (!token || !['ADMIN', 'OWNER'].includes(token.role as string)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const tenant = await requireTenant()
    const { id } = await params
    const body = await request.json()

    const { action, review_notes } = body
    if (!['approved', 'rejected', 'cancelled'].includes(action)) {
      return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
    }

    // Verificar que el revisor es admin O es el manager del empleado
    const req = await (db as any)
      .selectFrom('rrhh_requests as r')
      .leftJoin('rrhh_employees as e', 'e.id', 'r.employee_id')
      .select(['r.id', 'r.status', 'r.employee_id', 'r.request_type', 'r.working_days', 'e.manager_id'])
      .where('r.id', '=', id)
      .where('r.tenant_id', '=', tenant.id)
      .executeTakeFirst()

    if (!req) return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
    if (req.status !== 'pending') {
      return NextResponse.json({ error: 'La solicitud ya fue procesada' }, { status: 409 })
    }

    // Solo admin/owner o el manager directo puede aprobar
    const isAdmin = ['ADMIN', 'OWNER'].includes(token.role as string)
    const isManager = req.manager_id && req.manager_id === token.id
    if (!isAdmin && !isManager) {
      return NextResponse.json({ error: 'Sin permisos para aprobar esta solicitud' }, { status: 403 })
    }

    const updated = await (db as any)
      .updateTable('rrhh_requests')
      .set({
        status: action,
        reviewed_by_user_id: token.id,
        reviewed_at: new Date(),
        review_notes: review_notes?.trim() || null,
        updated_at: new Date(),
      })
      .where('id', '=', id)
      .where('tenant_id', '=', tenant.id)
      .returningAll()
      .executeTakeFirst()

    // Si se aprueba una solicitud de vacaciones, descontar del saldo
    if (action === 'approved' && req.request_type === 'vacaciones') {
      const year = new Date().getFullYear()
      const existing = await (db as any)
        .selectFrom('rrhh_vacation_balances')
        .select(['id', 'days_taken'])
        .where('employee_id', '=', req.employee_id)
        .where('year', '=', year)
        .where('tenant_id', '=', tenant.id)
        .executeTakeFirst()

      if (existing) {
        await (db as any)
          .updateTable('rrhh_vacation_balances')
          .set({ days_taken: existing.days_taken + req.working_days, updated_at: new Date() })
          .where('id', '=', existing.id)
          .execute()
      } else {
        await (db as any)
          .insertInto('rrhh_vacation_balances')
          .values({
            tenant_id: tenant.id,
            employee_id: req.employee_id,
            year,
            days_earned: 15,
            days_taken: req.working_days,
            days_carried: 0,
            days_lost: 0,
          })
          .execute()
      }
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[rrhh/requests/[id]:PATCH]', error)
    return NextResponse.json({ error: 'Error al procesar solicitud' }, { status: 500 })
  }
}
