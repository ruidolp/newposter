// Extension system types

export interface Extension {
  id: string
  name: string
  version: string
  description: string
  enabled: boolean
  hooks: ExtensionHook[]
  components?: ExtensionComponent[]
}

export interface ExtensionHook {
  name: string
  handler: (...args: any[]) => Promise<any> | any
}

export interface ExtensionComponent {
  name: string
  component: React.ComponentType<any>
  location: 'pos' | 'products' | 'orders' | 'settings'
}

export interface ExtensionContext {
  tenantId: string
  userId?: string
  extension: Extension
}

export type HookName =
  | 'product.beforeCreate'
  | 'product.afterCreate'
  | 'product.beforeUpdate'
  | 'product.afterUpdate'
  | 'order.beforeCreate'
  | 'order.afterCreate'
  | 'order.calculateTotal'
  | 'pos.renderActions'
  | 'pos.renderProductCard'

export interface HookPayload<T = any> {
  data: T
  context: ExtensionContext
}
