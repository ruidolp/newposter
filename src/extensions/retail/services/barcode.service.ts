import { db } from '@/database/db'

export class BarcodeService {
  /**
   * Find product by barcode
   */
  static async findProductByBarcode(
    barcode: string,
    tenantId: string
  ) {
    const product = await db
      .selectFrom('products')
      .selectAll()
      .where('barcode', '=', barcode)
      .where('tenant_id', '=', tenantId)
      .where('active', '=', true)
      .executeTakeFirst()

    if (!product) {
      // Also check product variants
      const variant = await db
        .selectFrom('product_variants as pv')
        .innerJoin('products as p', 'p.id', 'pv.product_id')
        .selectAll('p')
        .select([
          'pv.id as variant_id',
          'pv.sku as variant_sku',
          'pv.price as variant_price',
          'pv.stock as variant_stock',
          'pv.attributes as variant_attributes',
        ])
        .where('pv.barcode', '=', barcode)
        .where('pv.tenant_id', '=', tenantId)
        .where('pv.active', '=', true)
        .executeTakeFirst()

      return variant || null
    }

    return product
  }

  /**
   * Validate barcode format
   */
  static validateBarcode(barcode: string): boolean {
    // Remove spaces
    const cleaned = barcode.replace(/\s/g, '')

    // Check if it's a valid EAN-8, EAN-13, UPC-A, or UPC-E
    if (!/^\d{8}$|^\d{12,13}$/.test(cleaned)) {
      return false
    }

    // Could add checksum validation here
    return true
  }

  /**
   * Generate a random barcode (for products without one)
   */
  static generateBarcode(): string {
    // Generate a simple 13-digit barcode
    const prefix = '780' // Custom prefix
    const random = Math.floor(Math.random() * 9999999999).toString().padStart(10, '0')
    return prefix + random
  }
}
