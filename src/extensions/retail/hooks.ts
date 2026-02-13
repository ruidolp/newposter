import type { ExtensionHook, HookPayload } from '@/types/extensions'

// Product hooks
async function handleProductBeforeCreate(payload: HookPayload): Promise<any> {
  const { data } = payload

  // Validate barcode format if provided
  if (data.barcode) {
    // Basic barcode validation (you can enhance this)
    if (!/^\d{8,13}$/.test(data.barcode.replace(/\s/g, ''))) {
      console.warn('⚠️ Barcode format may be invalid:', data.barcode)
    }
  }

  // Ensure metadata is initialized
  if (!data.metadata) {
    data.metadata = {}
  }

  return data
}

async function handleProductAfterCreate(payload: HookPayload): Promise<void> {
  const { data: product } = payload

  console.log(`📦 Retail: Product created - ${product.name} (${product.sku})`)

  // You could trigger additional actions here:
  // - Send notification
  // - Update inventory system
  // - Create initial stock movement
}

// Order hooks
async function handleCalculateTotal(payload: HookPayload): Promise<any> {
  const { data: orderData, context } = payload

  console.log('💰 Retail: Calculating order total...')

  // Apply promotions/discounts if available
  // This is where you would implement promotion logic

  return orderData
}

async function handleOrderAfterCreate(payload: HookPayload): Promise<void> {
  const { data: order } = payload

  console.log(`🛒 Retail: Order created - ${order.order_number}`)

  // You could:
  // - Send receipt via email
  // - Update loyalty points
  // - Trigger inventory update
}

export const retailHooks: ExtensionHook[] = [
  {
    name: 'product.beforeCreate',
    handler: handleProductBeforeCreate,
  },
  {
    name: 'product.afterCreate',
    handler: handleProductAfterCreate,
  },
  {
    name: 'order.calculateTotal',
    handler: handleCalculateTotal,
  },
  {
    name: 'order.afterCreate',
    handler: handleOrderAfterCreate,
  },
]
