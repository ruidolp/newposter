import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/database/db'
import { requireTenant } from '@/lib/tenant'

function buildSlug(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

async function resolveUniqueSlug(tenantId: string, categoryId: string, raw: string) {
  const base = buildSlug(raw) || 'categoria'
  const existing = await db
    .selectFrom('categories')
    .select(['slug'])
    .where('tenant_id', '=', tenantId as any)
    .where('id', '!=', categoryId)
    .where('slug', 'like', `${base}%`)
    .execute()

  const used = new Set(existing.map((x) => x.slug))
  if (!used.has(base)) return base

  let i = 2
  while (used.has(`${base}-${i}`)) i += 1
  return `${base}-${i}`
}

// PATCH /api/categories/[id]
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const tenant = await requireTenant()
    const body = await request.json()

    const name = String(body?.name ?? '').trim()
    if (!name) {
      return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })
    }
    const uniqueSlug = await resolveUniqueSlug(tenant.id, id, body?.slug || name)

    const category = await db
      .updateTable('categories')
      .set({
        name,
        description: body?.description?.trim() || null,
        slug: uniqueSlug,
      })
      .where('id', '=', id)
      .where('tenant_id', '=', tenant.id as any)
      .returningAll()
      .executeTakeFirst()

    if (!category) {
      return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 404 })
    }

    return NextResponse.json(category)
  } catch (error) {
    console.error('[categories/[id]:PATCH]', error)
    return NextResponse.json({ error: 'Error al actualizar categoría' }, { status: 500 })
  }
}

// DELETE /api/categories/[id]
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const tenant = await requireTenant()
    const force = new URL(_request.url).searchParams.get('force') === 'true'

    const products = await db
      .selectFrom('products')
      .select(['id', 'name', 'sku', 'category_id', 'metadata'])
      .where('tenant_id', '=', tenant.id as any)
      .execute()

    const linked = products.filter((p) => {
      if (p.category_id === id) return true
      const meta = p.metadata as any
      return Array.isArray(meta?.category_ids) && meta.category_ids.includes(id)
    })

    if (linked.length > 0 && !force) {
      return NextResponse.json(
        {
          error: `No se puede eliminar. Hay ${linked.length} producto(s) asociados a esta categoría.`,
          inUse: linked.length,
          products: linked.map((p) => ({ id: p.id, name: p.name, sku: p.sku })),
        },
        { status: 409 }
      )
    }

    if (linked.length > 0 && force) {
      await db.transaction().execute(async (trx) => {
        for (const p of linked) {
          const rawMeta = p.metadata as any
          const baseMeta = rawMeta && typeof rawMeta === 'object' && !Array.isArray(rawMeta) ? { ...rawMeta } : {}
          const currentIds = Array.isArray(baseMeta.category_ids)
            ? baseMeta.category_ids.filter((x: unknown) => typeof x === 'string')
            : []
          const nextIds = currentIds.filter((catId: string) => catId !== id)
          baseMeta.category_ids = nextIds

          await trx
            .updateTable('products')
            .set({
              category_id: p.category_id === id ? (nextIds[0] ?? null) : p.category_id,
              metadata: baseMeta,
              updated_at: new Date(),
            })
            .where('id', '=', p.id)
            .where('tenant_id', '=', tenant.id as any)
            .executeTakeFirst()
        }
      })
    }

    const deleted = await db
      .deleteFrom('categories')
      .where('id', '=', id)
      .where('tenant_id', '=', tenant.id as any)
      .returning(['id'])
      .executeTakeFirst()

    if (!deleted) {
      return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[categories/[id]:DELETE]', error)
    return NextResponse.json({ error: 'Error al eliminar categoría' }, { status: 500 })
  }
}
