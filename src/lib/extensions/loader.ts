import { extensionRegistry } from './registry'
import { retailExtension } from '@/extensions/retail'

export function loadExtensions() {
  console.log('🔌 Loading extensions...')

  // Register core extensions
  extensionRegistry.register(retailExtension)

  console.log('✅ Extensions loaded')
}
