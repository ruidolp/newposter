import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { db } from '@/database/db'
import { requireTenant } from '@/lib/tenant'

async function getAdminToken(request: NextRequest) {
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })
  if (!token || !['ADMIN', 'OWNER'].includes(token.role as string)) return null
  return token
}

// GET /api/operation-logs — obtener logs de operaciones
export async function GET(request: NextRequest) {
  try {
    const token = await getAdminToken(request)
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const tenant = await requireTenant()
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const action = searchParams.get('action') || ''
    const entityType = searchParams.get('entity_type') || ''
    const offset = (page - 1) * limit

    let query = db
      .selectFrom('operation_logs')
      .selectAll()
      .where('tenant_id', '=', tenant.id as any)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset)

    if (action) query = query.where('action', '=', action)
    if (entityType) query = query.where('entity_type', '=', entityType)

    const logs = await query.execute()
    return NextResponse.json({ logs, page, limit })
  } catch (error) {
    console.error('[operation-logs:GET]', error)
    return NextResponse.json({ error: 'Error al obtener logs' }, { status: 500 })
  }
}
