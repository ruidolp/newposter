'use client'

import { type MouseEvent as ReactMouseEvent, useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, Plus, Search, Tags, Trash2, X } from 'lucide-react'

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  created_at: string
  products_count?: number
}

interface Toast {
  id: number
  type: 'success' | 'error'
  msg: string
}

interface LinkedProduct {
  id: string
  name: string
  sku: string
}

function Toasts({
  toasts,
  onRemove,
}: {
  toasts: Toast[]
  onRemove: (id: number) => void
}) {
  return (
    <div className="fixed right-4 top-4 z-[90] space-y-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          aria-live="polite"
          className={`flex min-w-[280px] items-center gap-2 rounded-md border px-3 py-2 text-sm shadow-sm ${
            t.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {t.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
          <span className="flex-1">{t.msg}</span>
          <button
            type="button"
            onClick={() => onRemove(t.id)}
            className="rounded p-1 transition hover:bg-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500"
            aria-label="Cerrar mensaje"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}

function CategoryModal({
  category,
  onClose,
  onSaved,
}: {
  category: Category | null
  onClose: () => void
  onSaved: (c: Category) => void
}) {
  function toSlug(value: string) {
    return value
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  }

  const [name, setName] = useState(category?.name ?? '')
  const [slug, setSlug] = useState(category?.slug ?? '')
  const [slugTouched, setSlugTouched] = useState(Boolean(category?.slug))
  const [description, setDescription] = useState(category?.description ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const initialRef = useRef(
    JSON.stringify({
      name: (category?.name ?? '').trim(),
      slug: (category?.slug ?? '').trim(),
      description: (category?.description ?? '').trim(),
    })
  )

  function hasUnsavedChanges() {
    const current = JSON.stringify({
      name: name.trim(),
      slug: slug.trim(),
      description: description.trim(),
    })
    return current !== initialRef.current
  }

  function requestClose() {
    if (saving) return
    if (hasUnsavedChanges()) {
      const ok = window.confirm('Tienes cambios sin guardar. ¿Salir y descartarlos?')
      if (!ok) return
    }
    onClose()
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        requestClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [requestClose])

  async function handleSave() {
    if (!name.trim()) {
      setError('Nombre requerido')
      return
    }

    setSaving(true)
    setError('')
    try {
      const isEdit = Boolean(category)
      const res = await fetch(isEdit ? `/api/categories/${category!.id}` : '/api/categories', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          slug: toSlug(slug || name),
          description: description.trim() || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Error al guardar categoría' }))
        throw new Error(data.error || 'Error al guardar categoría')
      }

      const saved = await res.json()
      onSaved(saved)
    } catch (e: unknown) {
      setError((e as Error).message || 'Error al guardar categoría')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/45 p-4"
      onClick={(e) => e.target === e.currentTarget && requestClose()}
    >
      <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">{category ? 'Editar Categoría' : 'Nueva Categoría'}</h2>
          <button
            type="button"
            onClick={requestClose}
            className="rounded p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="category_name" className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Nombre *
            </label>
            <input
              id="category_name"
              name="category_name"
              value={name}
              autoFocus
              onChange={(e) => {
                const next = e.target.value
                setName(next)
                if (!slugTouched) setSlug(toSlug(next))
              }}
              placeholder="Ej: Bebidas"
              className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="category_slug" className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Slug
            </label>
            <input
              id="category_slug"
              name="category_slug"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true)
                setSlug(toSlug(e.target.value))
              }}
              placeholder="ej: bebidas"
              className="h-10 w-full rounded-md border border-slate-300 px-3 font-mono text-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200"
            />
            <p className="text-xs text-slate-500">Se usa como identificador legible para URLs e integraciones técnicas.</p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="category_description" className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Descripción
            </label>
            <textarea
              id="category_description"
              name="category_description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Opcional…"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={requestClose}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="inline-flex items-center gap-2 rounded-md bg-fuchsia-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-fuchsia-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400 focus-visible:ring-offset-2 disabled:opacity-60"
          >
            <CheckCircle2 size={14} className={saving ? 'animate-pulse' : ''} />
            {category ? 'Guardar Cambios' : 'Crear Categoría'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ConfirmDeleteModal({
  category,
  linkedProducts,
  onConfirm,
  onForceConfirm,
  onClose,
}: {
  category: Category
  linkedProducts: LinkedProduct[]
  onConfirm: () => Promise<void>
  onForceConfirm: () => Promise<void>
  onClose: () => void
}) {
  const [loading, setLoading] = useState(false)
  const isBlocked = linkedProducts.length > 0

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/45 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">Eliminar Categoría</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3 px-5 py-4 text-sm text-slate-600">
          {!isBlocked ? (
            <p>
              ¿Eliminar la categoría <strong className="text-slate-900">{category.name}</strong>? Esta acción no se puede deshacer.
            </p>
          ) : (
            <>
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-700">
                Esta categoría está asociada a {linkedProducts.length} producto(s).
              </div>
              <p>Si continúas, se quitará esta categoría de los siguientes productos:</p>
              <div className="max-h-48 overflow-y-auto rounded-md border border-slate-200 bg-slate-50">
                {linkedProducts.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-2 last:border-b-0">
                    <span className="text-sm font-medium text-slate-900">{p.name}</span>
                    <span className="font-mono text-xs text-slate-500">{p.sku}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={async () => {
              setLoading(true)
              if (isBlocked) await onForceConfirm()
              else await onConfirm()
              setLoading(false)
            }}
            className="inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 disabled:opacity-60"
          >
            <Trash2 size={14} />
            {loading ? 'Procesando…' : isBlocked ? 'Eliminar y Desvincular' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CategoriasPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [deleting, setDeleting] = useState<Category | null>(null)
  const [linkedProducts, setLinkedProducts] = useState<LinkedProduct[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    fetchCategories()
  }, [])

  useEffect(() => {
    const validIds = new Set(categories.map((c) => c.id))
    setSelectedIds((prev) => prev.filter((id) => validIds.has(id)))
    setLastSelectedId((prev) => (prev && validIds.has(prev) ? prev : null))
  }, [categories])

  async function fetchCategories() {
    setLoading(true)
    try {
      const res = await fetch('/api/categories')
      const data = await res.json()
      setCategories(data.categories ?? [])
    } catch {
      toast('error', 'Error al cargar categorías')
    } finally {
      setLoading(false)
    }
  }

  function toast(type: Toast['type'], msg: string) {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, type, msg }])
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4500)
  }

  function handleSaved(c: Category) {
    setCategories((prev) => {
      const idx = prev.findIndex((x) => x.id === c.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = c
        return next.sort((a, b) => a.name.localeCompare(b.name, 'es'))
      }
      return [c, ...prev].sort((a, b) => a.name.localeCompare(b.name, 'es'))
    })
    toast('success', editing ? 'Categoría actualizada' : 'Categoría creada')
    setShowModal(false)
    setEditing(null)
  }

  async function handleDelete(force = false) {
    if (!deleting) return
    try {
      const res = await fetch(`/api/categories/${deleting.id}${force ? '?force=true' : ''}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Error al eliminar categoría' }))
        if (res.status === 409 && Array.isArray(data.products) && !force) {
          setLinkedProducts(data.products)
          return
        }
        throw new Error(data.error || 'Error al eliminar categoría')
      }
      setCategories((prev) => prev.filter((c) => c.id !== deleting.id))
      setSelectedIds((prev) => prev.filter((id) => id !== deleting.id))
      toast('success', `"${deleting.name}" eliminada`)
      setDeleting(null)
      setLinkedProducts([])
    } catch (e: unknown) {
      toast('error', (e as Error).message || 'Error al eliminar categoría')
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return categories
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.description ?? '').toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q)
    )
  }, [categories, search])

  function handleRowClick(e: ReactMouseEvent<HTMLTableRowElement>, row: Category, rowIndex: number) {
    const withModifiers = e.metaKey || e.ctrlKey || e.shiftKey
    if (!withModifiers) {
      setEditing(row)
      setShowModal(true)
      return
    }

    e.preventDefault()
    e.stopPropagation()

    if (e.shiftKey && lastSelectedId) {
      const anchorIndex = filtered.findIndex((c) => c.id === lastSelectedId)
      if (anchorIndex >= 0) {
        const [start, end] = [anchorIndex, rowIndex].sort((a, b) => a - b)
        const rangeIds = filtered.slice(start, end + 1).map((c) => c.id)
        setSelectedIds((prev) => Array.from(new Set([...prev, ...rangeIds])))
        setLastSelectedId(row.id)
        return
      }
    }

    setSelectedIds((prev) => (prev.includes(row.id) ? prev.filter((id) => id !== row.id) : [...prev, row.id]))
    setLastSelectedId(row.id)
  }

  async function handleBulkDelete() {
    const selectedCount = selectedIds.length
    if (selectedCount === 0) return
    const selected = categories.filter((c) => selectedIds.includes(c.id))
    if (selected.length === 1) {
      setLinkedProducts([])
      setDeleting(selected[0])
      return
    }

    const confirmed = window.confirm(
      `¿Eliminar ${selected.length} categorías?\n\nSi alguna está asociada a productos, se desvinculará automáticamente.`
    )
    if (!confirmed) return

    const deletedIds: string[] = []
    let failed = 0
    for (const item of selected) {
      try {
        const res = await fetch(`/api/categories/${item.id}?force=true`, { method: 'DELETE' })
        if (res.ok) deletedIds.push(item.id)
        else failed += 1
      } catch {
        failed += 1
      }
    }

    if (deletedIds.length > 0) {
      const removed = new Set(deletedIds)
      setCategories((prev) => prev.filter((c) => !removed.has(c.id)))
      setSelectedIds((prev) => prev.filter((id) => !removed.has(id)))
      toast('success', `${deletedIds.length} categoría(s) eliminada(s)`)
    }
    if (failed > 0) toast('error', `${failed} categoría(s) no se pudieron eliminar`)
  }

  function clearSelection() {
    setSelectedIds([])
    setLastSelectedId(null)
  }

  const selectedCount = selectedIds.length

  return (
    <section className="space-y-5">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 [text-wrap:balance]">
            Gestión de <span className="text-fuchsia-600">Categorías</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {categories.length} categoría{categories.length !== 1 ? 's' : ''} registrada{categories.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing(null)
            setShowModal(true)
          }}
          className="inline-flex items-center gap-2 rounded-md bg-fuchsia-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-fuchsia-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400 focus-visible:ring-offset-2"
        >
          <Plus size={16} />
          Nueva Categoría
        </button>
      </header>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-sm font-semibold text-slate-800">Listado</h2>
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar categoría…"
                className="h-9 w-full min-w-[240px] rounded-md border border-slate-300 pl-8 pr-3 text-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200"
              />
            </div>
            <span className="text-xs text-slate-500">
              Selección: <strong>Shift + click</strong> o <strong>Ctrl/Cmd + click</strong>
            </span>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center px-4 py-14 text-sm text-slate-500">Cargando…</div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-14 text-center text-slate-500">
            <Tags size={34} className="mx-auto mb-2 text-slate-300" />
            <p className="text-sm">Sin categorías{search ? ' que coincidan' : ''}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Nombre</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Descripción</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Slug</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">Productos</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Creada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((c, rowIndex) => (
                  <tr
                    key={c.id}
                    onClick={(e) => handleRowClick(e, c, rowIndex)}
                    className={`cursor-pointer hover:bg-slate-50/70 ${selectedIds.includes(c.id) ? 'bg-fuchsia-50/60' : ''}`}
                  >
                    <td className="px-4 py-3 font-semibold text-slate-900">{c.name}</td>
                    <td className="px-4 py-3 text-slate-600">{c.description || <span className="text-slate-400">—</span>}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{c.slug}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">
                        {c.products_count ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{new Date(c.created_at).toLocaleDateString('es-CL')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedCount > 0 && (
        <div className="fixed bottom-6 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-2 shadow-lg">
          <span className="text-xs font-semibold text-slate-800">
            {selectedCount} seleccionada{selectedCount !== 1 ? 's' : ''}
          </span>
          <button
            type="button"
            onClick={clearSelection}
            className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500"
          >
            Limpiar
          </button>
          <button
            type="button"
            onClick={handleBulkDelete}
            className="inline-flex items-center gap-1 rounded-md bg-red-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2"
          >
            <Trash2 size={12} />
            Eliminar
          </button>
        </div>
      )}

      {showModal && (
        <CategoryModal
          category={editing}
          onClose={() => {
            setShowModal(false)
            setEditing(null)
          }}
          onSaved={handleSaved}
        />
      )}

      {deleting && (
        <ConfirmDeleteModal
          category={deleting}
          linkedProducts={linkedProducts}
          onClose={() => {
            setDeleting(null)
            setLinkedProducts([])
          }}
          onConfirm={() => handleDelete(false)}
          onForceConfirm={() => handleDelete(true)}
        />
      )}

      <Toasts toasts={toasts} onRemove={(id) => setToasts((prev) => prev.filter((x) => x.id !== id))} />
    </section>
  )
}
