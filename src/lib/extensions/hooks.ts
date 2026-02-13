import { extensionRegistry } from './registry'
import type { HookName, HookPayload, ExtensionContext } from '@/types/extensions'

export async function executeHook<T = any>(
  hookName: HookName,
  data: T,
  context: Partial<ExtensionContext>
): Promise<T> {
  const payload: HookPayload<T> = {
    data,
    context: context as ExtensionContext,
  }

  return extensionRegistry.executeHook(hookName, payload)
}

export function hasHook(hookName: HookName): boolean {
  return extensionRegistry.hasHook(hookName)
}

// Specific hook helpers

export async function beforeCreateProduct(
  productData: any,
  tenantId: string,
  userId?: string
): Promise<any> {
  return executeHook('product.beforeCreate', productData, {
    tenantId,
    userId,
    extension: {} as any, // Will be filled by extension
  })
}

export async function afterCreateProduct(
  product: any,
  tenantId: string,
  userId?: string
): Promise<void> {
  await executeHook('product.afterCreate', product, {
    tenantId,
    userId,
    extension: {} as any,
  })
}

export async function beforeUpdateProduct(
  productData: any,
  tenantId: string,
  userId?: string
): Promise<any> {
  return executeHook('product.beforeUpdate', productData, {
    tenantId,
    userId,
    extension: {} as any,
  })
}

export async function afterUpdateProduct(
  product: any,
  tenantId: string,
  userId?: string
): Promise<void> {
  await executeHook('product.afterUpdate', product, {
    tenantId,
    userId,
    extension: {} as any,
  })
}

export async function beforeCreateOrder(
  orderData: any,
  tenantId: string,
  userId?: string
): Promise<any> {
  return executeHook('order.beforeCreate', orderData, {
    tenantId,
    userId,
    extension: {} as any,
  })
}

export async function afterCreateOrder(
  order: any,
  tenantId: string,
  userId?: string
): Promise<void> {
  await executeHook('order.afterCreate', order, {
    tenantId,
    userId,
    extension: {} as any,
  })
}

export async function calculateOrderTotal(
  orderData: any,
  tenantId: string
): Promise<any> {
  return executeHook('order.calculateTotal', orderData, {
    tenantId,
    extension: {} as any,
  })
}
