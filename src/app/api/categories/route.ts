import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/database/db'
import { requireTenant } from '@/lib/tenant'

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

async function resolveUniqueSlug(tenantId: string, raw: string) {
  const base = normalizeSlug(raw) || 'categoria'
  const existing = await db
    .selectFrom('categories')
    .select(['slug'])
    .where('tenant_id', '=', tenantId as any)
    .where('slug', 'like', `${base}%`)
    .execute()

  const used = new Set(existing.map((x) => x.slug))
  if (!used.has(base)) return base

  let i = 2
  while (used.has(`${base}-${i}`)) i += 1
  return `${base}-${i}`
}

export async function GET(_request: NextRequest) {
  try {
    const tenant = await requireTenant()
    const categoriesRaw = await db
      .selectFrom('categories')
      .selectAll()
      .where('tenant_id', '=', tenant.id as any)
      .orderBy('name', 'asc')
      .execute()

    const products = await db
      .selectFrom('products')
      .select(['id', 'category_id', 'metadata'])
      .where('tenant_id', '=', tenant.id as any)
      .execute()

    const categories = categoriesRaw.map((c) => {
      const products_count = products.filter((p) => {
        if (p.category_id === c.id) return true
        const meta = p.metadata as any
        return Array.isArray(meta?.category_ids) && meta.category_ids.includes(c.id)
      }).length
      return { ...c, products_count }
    })

    return NextResponse.json({ categories })
  } catch {
    return NextResponse.json({ categories: [] })
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenant = await requireTenant()
    const { name, description, slug } = await request.json()
    if (!name?.trim()) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })
    const uniqueSlug = await resolveUniqueSlug(tenant.id, slug || name)
    const category = await db
      .insertInto('categories')
      .values({
        tenant_id: tenant.id as any,
        name: name.trim(),
        description: description?.trim() || null,
        slug: uniqueSlug,
      })
      .returningAll()
      .executeTakeFirstOrThrow()
    return NextResponse.json(category, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: 'Error al crear categoría' }, { status: 500 })
  }
}
