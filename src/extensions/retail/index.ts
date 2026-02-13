import type { Extension } from '@/types/extensions'
import { retailHooks } from './hooks'

export const retailExtension: Extension = {
  id: 'retail',
  name: 'Retail Extension',
  version: '1.0.0',
  description: 'Extensión para comercio minorista con soporte de variantes, códigos de barras y promociones',
  enabled: true,
  hooks: retailHooks,
}
