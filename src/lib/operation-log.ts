import { db } from '@/database/db'

interface LogParams {
  tenantId: string
  userId?: string | null
  userName?: string | null
  action: string
  entityType?: string
  entityId?: string
  detail?: Record<string, unknown>
  ipAddress?: string
}

/**
 * Registra una operación en el log del sistema.
 * Captura usuario, acción, entidad afectada y detalle.
 */
export async function logOperation(params: LogParams): Promise<void> {
  try {
    await db
      .insertInto('operation_logs')
      .values({
        tenant_id: params.tenantId,
        user_id: params.userId ?? null,
        user_name: params.userName ?? null,
        action: params.action,
        entity_type: params.entityType ?? null,
        entity_id: params.entityId ?? null,
        detail: JSON.stringify(params.detail ?? {}) as any,
        ip_address: params.ipAddress ?? null,
      })
      .execute()
  } catch (err) {
    // El log nunca debe interrumpir la operación principal
    console.error('[operation-log] Error registrando operación:', err)
  }
}
