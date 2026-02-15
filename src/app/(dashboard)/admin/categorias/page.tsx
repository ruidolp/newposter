'use client'

import { type MouseEvent as ReactMouseEvent, useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, X, CheckCircle2, AlertCircle, Info, Search, Tags } from 'lucide-react'

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
  type: 'success' | 'error' | 'info'
  msg: string
}

interface LinkedProduct {
  id: string
  name: string
  sku: string
}

function Toasts({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: number) => void }) {
  return (
    <div className="admin-toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`admin-toast ${t.type}`}>
          <span className={`admin-toast-icon ${t.type}`}>
            {t.type === 'success' ? <CheckCircle2 size={15} /> : t.type === 'error' ? <AlertCircle size={15} /> : <Info size={15} />}
          </span>
          <span className="admin-toast-msg">{t.msg}</span>
          <button className="admin-btn-icon" style={{ marginLeft: 'auto' }} onClick={() => onRemove(t.id)}>
            <X size={13} />
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
    } catch (e: any) {
      setError(e.message || 'Error al guardar categoría')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="admin-modal" style={{ maxWidth: 500 }}>
        <div className="admin-modal-header">
          <span className="admin-modal-title">{category ? 'Editar Categoría' : 'Nueva Categoría'}</span>
          <button className="admin-btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="admin-modal-body">
          {error && (
            <div className="prod-error-banner" style={{ marginBottom: 14 }}>
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <div className="admin-form-grid cols-1">
            <div className="admin-form-field">
              <label className="admin-label">Nombre *</label>
              <input
                className="admin-input"
                placeholder="Ej: Bebidas"
                value={name}
                onChange={(e) => {
                  const nextName = e.target.value
                  setName(nextName)
                  if (!slugTouched) setSlug(toSlug(nextName))
                }}
                autoFocus
              />
            </div>
            <div className="admin-form-field">
              <label className="admin-label">Slug</label>
              <input
                className="admin-input mono"
                placeholder="ej: bebidas"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true)
                  setSlug(toSlug(e.target.value))
                }}
              />
              <span style={{ marginTop: 4, fontSize: 11, color: 'var(--a-text-3)' }}>
                Se usa como identificador legible para URLs e integraciones técnicas.
              </span>
            </div>
            <div className="admin-form-field">
              <label className="admin-label">Descripción</label>
              <textarea
                className="admin-textarea"
                rows={3}
                placeholder="Opcional"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="admin-modal-footer">
          <button className="admin-btn admin-btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="admin-btn admin-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <span className="admin-spinner" /> : <CheckCircle2 size={14} />}
            {category ? 'Guardar cambios' : 'Crear categoría'}
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
    <div className="admin-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="admin-modal" style={{ maxWidth: 460 }}>
        <div className="admin-modal-header">
          <span className="admin-modal-title">Eliminar categoría</span>
          <button className="admin-btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="admin-modal-body">
          {!isBlocked ? (
            <p style={{ color: 'var(--a-text-2)', fontSize: 14 }}>
              ¿Eliminar la categoría <strong style={{ color: 'var(--a-text-1)' }}>{category.name}</strong>? Esta acción no se puede deshacer.
            </p>
          ) : (
            <>
              <div className="prod-error-banner" style={{ marginBottom: 12 }}>
                <AlertCircle size={14} />
                Esta categoría está asociada a {linkedProducts.length} producto(s).
              </div>
              <p style={{ color: 'var(--a-text-2)', fontSize: 13, marginBottom: 8 }}>
                Si continúas, se quitará esta categoría de los siguientes productos:
              </p>
              <div style={{
                maxHeight: 180, overflowY: 'auto', border: '1px solid var(--a-border)',
                borderRadius: 'var(--a-radius-sm)', background: 'var(--a-bg-0)',
              }}>
                {linkedProducts.map((p) => (
                  <div key={p.id} style={{
                    display: 'flex', justifyContent: 'space-between', gap: 8,
                    padding: '8px 10px', borderBottom: '1px solid var(--a-border)',
                  }}>
                    <span style={{ color: 'var(--a-text-1)', fontSize: 13, fontWeight: 500 }}>{p.name}</span>
                    <span className="admin-mono" style={{ color: 'var(--a-text-3)', fontSize: 11 }}>{p.sku}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="admin-modal-footer">
          <button className="admin-btn admin-btn-secondary" onClick={onClose}>Cancelar</button>
          {!isBlocked ? (
            <button
              className="admin-btn admin-btn-danger"
              disabled={loading}
              onClick={async () => {
                setLoading(true)
                await onConfirm()
                setLoading(false)
              }}
            >
              {loading ? <span className="admin-spinner" /> : <Trash2 size={14} />}
              Eliminar
            </button>
          ) : (
            <button
              className="admin-btn admin-btn-danger"
              disabled={loading}
              onClick={async () => {
                setLoading(true)
                await onForceConfirm()
                setLoading(false)
              }}
            >
              {loading ? <span className="admin-spinner" /> : <Trash2 size={14} />}
              Eliminar y desvincular
            </button>
          )}
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
    setToasts((t) => [...t, { id, type, msg }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500)
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
    } catch (e: any) {
      toast('error', e.message || 'Error al eliminar categoría')
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return categories
    return categories.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      (c.description ?? '').toLowerCase().includes(q) ||
      c.slug.toLowerCase().includes(q)
    )
  }, [categories, search])

  const selectedCount = selectedIds.length

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

    setSelectedIds((prev) => {
      if (prev.includes(row.id)) return prev.filter((id) => id !== row.id)
      return [...prev, row.id]
    })
    setLastSelectedId(row.id)
  }

  async function handleBulkDelete() {
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
    if (failed > 0) {
      toast('error', `${failed} categoría(s) no se pudieron eliminar`)
    }
  }

  function clearSelection() {
    setSelectedIds([])
    setLastSelectedId(null)
  }

  return (
    <>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Gestión de <span>Categorías</span></h1>
          <p className="admin-page-subtitle">
            {categories.length} categoría{categories.length !== 1 ? 's' : ''} registrada{categories.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          className="admin-btn admin-btn-primary admin-btn-lg"
          onClick={() => {
            setEditing(null)
            setShowModal(true)
          }}
        >
          <Plus size={16} /> Nueva Categoría
        </button>
      </div>

      <div className="admin-panel">
        <div className="admin-panel-header">
          <span className="admin-panel-title">Listado</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ position: 'relative' }}>
              <Search
                size={13}
                style={{
                  position: 'absolute',
                  left: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--a-text-3)',
                }}
              />
              <input
                className="admin-input admin-input-sm"
                style={{ paddingLeft: 30, width: 240 }}
                placeholder="Buscar categoría..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <span style={{ fontSize: 11, color: 'var(--a-text-3)' }}>
              Selección: <strong>Shift + click</strong> o <strong>Ctrl/Cmd + click</strong>
            </span>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 48, display: 'flex', justifyContent: 'center' }}>
            <span className="admin-spinner" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="admin-empty">
            <Tags size={36} className="admin-empty-icon" />
            <p className="admin-empty-text">Sin categorías{search ? ' que coincidan' : ''}</p>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Descripción</th>
                  <th>Slug</th>
                  <th style={{ textAlign: 'center' }}>Productos</th>
                  <th>Creada</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, rowIndex) => (
                  <tr
                    key={c.id}
                    style={{
                      cursor: 'pointer',
                      background: selectedIds.includes(c.id) ? 'var(--a-accent-dim)' : undefined,
                    }}
                    onClick={(e) => handleRowClick(e, c, rowIndex)}
                  >
                    <td>
                      <span style={{ fontWeight: 600 }}>{c.name}</span>
                    </td>
                    <td style={{ color: 'var(--a-text-2)' }}>
                      {c.description ? c.description : <span style={{ color: 'var(--a-text-3)' }}>—</span>}
                    </td>
                    <td>
                      <span className="admin-mono" style={{ fontSize: 11 }}>
                        {c.slug}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="admin-badge admin-badge-info">
                        {c.products_count ?? 0}
                      </span>
                    </td>
                    <td style={{ color: 'var(--a-text-2)', fontSize: 12 }}>
                      {new Date(c.created_at).toLocaleDateString('es-CL')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedCount > 0 && (
        <div
          style={{
            position: 'fixed',
            left: '50%',
            bottom: 22,
            transform: 'translateX(-50%)',
            zIndex: 450,
            background: 'var(--a-bg-1)',
            border: '1px solid var(--a-border-med)',
            borderRadius: '999px',
            padding: '8px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: 'var(--a-shadow-lg)',
          }}
        >
          <span style={{ fontSize: 12, color: 'var(--a-text-1)', fontWeight: 600 }}>
            {selectedCount} seleccionada{selectedCount !== 1 ? 's' : ''}
          </span>
          <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={clearSelection}>
            Limpiar
          </button>
          <button className="admin-btn admin-btn-danger admin-btn-sm" onClick={handleBulkDelete}>
            <Trash2 size={13} />
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
          onClose={() => { setDeleting(null); setLinkedProducts([]) }}
          onConfirm={() => handleDelete(false)}
          onForceConfirm={() => handleDelete(true)}
        />
      )}

      <Toasts toasts={toasts} onRemove={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
    </>
  )
}
