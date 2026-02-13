'use client'

import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, X, CheckCircle2, AlertCircle, Info, Search, Truck } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Supplier {
  id: string; name: string; rut: string | null; email: string | null
  phone: string | null; address: string | null; contact_name: string | null
  notes: string | null; active: boolean; created_at: string
}

interface Toast { id: number; type: 'success' | 'error' | 'info'; msg: string }

const emptyForm = () => ({
  name: '', rut: '', email: '', phone: '', address: '', contact_name: '', notes: '', active: true,
})

// ─── Toast ───────────────────────────────────────────────────────────────────

function Toasts({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: number) => void }) {
  return (
    <div className="admin-toast-container">
      {toasts.map(t => (
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

// ─── Modal ───────────────────────────────────────────────────────────────────

function SupplierModal({
  supplier, onClose, onSaved,
}: {
  supplier: Supplier | null
  onClose: () => void
  onSaved: (s: Supplier) => void
}) {
  const [form, setForm] = useState(supplier ? {
    name: supplier.name, rut: supplier.rut ?? '', email: supplier.email ?? '',
    phone: supplier.phone ?? '', address: supplier.address ?? '',
    contact_name: supplier.contact_name ?? '', notes: supplier.notes ?? '',
    active: supplier.active,
  } : emptyForm())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(key: string, val: string | boolean) {
    setForm(f => ({ ...f, [key]: val }))
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('El nombre es requerido'); return }
    setSaving(true)
    setError('')
    try {
      const url = supplier ? `/api/suppliers/${supplier.id}` : '/api/suppliers'
      const method = supplier ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al guardar')
      }
      const saved = await res.json()
      onSaved(saved)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="admin-modal">
        <div className="admin-modal-header">
          <span className="admin-modal-title">
            {supplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}
          </span>
          <button className="admin-btn-icon" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="admin-modal-body">
          {error && (
            <div style={{ background: 'var(--a-red-dim)', border: '1px solid rgba(244,63,94,0.2)', borderRadius: 'var(--a-radius-sm)', padding: '8px 12px', marginBottom: 14, color: 'var(--a-red)', fontSize: 13 }}>
              {error}
            </div>
          )}

          <div className="admin-form-grid cols-2">
            <div className="admin-form-field" style={{ gridColumn: 'span 2' }}>
              <label className="admin-label">Nombre *</label>
              <input className="admin-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Nombre o razón social" autoFocus />
            </div>
            <div className="admin-form-field">
              <label className="admin-label">RUT</label>
              <input className="admin-input mono" value={form.rut} onChange={e => set('rut', e.target.value)} placeholder="12.345.678-9" />
            </div>
            <div className="admin-form-field">
              <label className="admin-label">Contacto</label>
              <input className="admin-input" value={form.contact_name} onChange={e => set('contact_name', e.target.value)} placeholder="Nombre del contacto" />
            </div>
            <div className="admin-form-field">
              <label className="admin-label">Email</label>
              <input type="email" className="admin-input" value={form.email} onChange={e => set('email', e.target.value)} placeholder="contacto@proveedor.cl" />
            </div>
            <div className="admin-form-field">
              <label className="admin-label">Teléfono</label>
              <input className="admin-input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+56 9 1234 5678" />
            </div>
            <div className="admin-form-field" style={{ gridColumn: 'span 2' }}>
              <label className="admin-label">Dirección</label>
              <input className="admin-input" value={form.address} onChange={e => set('address', e.target.value)} placeholder="Dirección" />
            </div>
            <div className="admin-form-field" style={{ gridColumn: 'span 2' }}>
              <label className="admin-label">Notas</label>
              <textarea className="admin-textarea" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Observaciones, condiciones, etc." rows={2} />
            </div>
            {supplier && (
              <div className="admin-form-field">
                <label className="admin-label">Estado</label>
                <select className="admin-select" value={form.active ? 'true' : 'false'} onChange={e => set('active', e.target.value === 'true')}>
                  <option value="true">Activo</option>
                  <option value="false">Inactivo</option>
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="admin-modal-footer">
          <button className="admin-btn admin-btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="admin-btn admin-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <span className="admin-spinner" /> : <CheckCircle2 size={14} />}
            {supplier ? 'Guardar cambios' : 'Crear proveedor'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Confirm delete ───────────────────────────────────────────────────────────

function ConfirmModal({ name, onConfirm, onClose }: { name: string; onConfirm: () => void; onClose: () => void }) {
  const [loading, setLoading] = useState(false)
  return (
    <div className="admin-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="admin-modal" style={{ maxWidth: 380 }}>
        <div className="admin-modal-header">
          <span className="admin-modal-title">Eliminar proveedor</span>
          <button className="admin-btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="admin-modal-body">
          <p style={{ color: 'var(--a-text-2)', fontSize: 14 }}>
            ¿Eliminar a <strong style={{ color: 'var(--a-text-1)' }}>{name}</strong>? Esta acción lo desactivará del sistema.
          </p>
        </div>
        <div className="admin-modal-footer">
          <button className="admin-btn admin-btn-secondary" onClick={onClose}>Cancelar</button>
          <button
            className="admin-btn admin-btn-danger"
            disabled={loading}
            onClick={async () => { setLoading(true); await onConfirm(); setLoading(false) }}
          >
            {loading ? <span className="admin-spinner" /> : <Trash2 size={14} />}
            Eliminar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ProveedoresPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [deleting, setDeleting] = useState<Supplier | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [showInactive, setShowInactive] = useState(false)

  useEffect(() => { fetchSuppliers() }, [showInactive])

  async function fetchSuppliers() {
    setLoading(true)
    try {
      const res = await fetch(`/api/suppliers?${showInactive ? 'all=true' : ''}`)
      const data = await res.json()
      setSuppliers(data.suppliers ?? [])
    } catch {
      toast('error', 'Error al cargar proveedores')
    } finally {
      setLoading(false)
    }
  }

  function toast(type: Toast['type'], msg: string) {
    const id = Date.now()
    setToasts(t => [...t, { id, type, msg }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4500)
  }

  function handleSaved(s: Supplier) {
    setSuppliers(prev => {
      const idx = prev.findIndex(x => x.id === s.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = s; return next }
      return [s, ...prev]
    })
    toast('success', editing ? 'Proveedor actualizado' : 'Proveedor creado')
    setShowModal(false)
    setEditing(null)
  }

  async function handleDelete() {
    if (!deleting) return
    try {
      const res = await fetch(`/api/suppliers/${deleting.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setSuppliers(prev => prev.filter(s => s.id !== deleting.id))
      toast('success', `"${deleting.name}" eliminado`)
    } catch {
      toast('error', 'Error al eliminar proveedor')
    } finally {
      setDeleting(null)
    }
  }

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.rut ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (s.contact_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (s.email ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Gestión de <span>Proveedores</span></h1>
          <p className="admin-page-subtitle">{suppliers.length} proveedor{suppliers.length !== 1 ? 'es' : ''} registrado{suppliers.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="admin-btn admin-btn-primary admin-btn-lg" onClick={() => { setEditing(null); setShowModal(true) }}>
          <Plus size={16} /> Nuevo Proveedor
        </button>
      </div>

      {/* Panel */}
      <div className="admin-panel">
        <div className="admin-panel-header">
          <span className="admin-panel-title">Listado</span>
          <div className="a-flex a-items-center a-gap-3">
            <label className="a-flex a-items-center a-gap-2" style={{ fontSize: 12, color: 'var(--a-text-3)', cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={showInactive}
                onChange={e => setShowInactive(e.target.checked)}
                style={{ accentColor: 'var(--a-accent)' }}
              />
              Ver inactivos
            </label>
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--a-text-3)' }} />
              <input
                className="admin-input admin-input-sm"
                style={{ paddingLeft: 30, width: 220 }}
                placeholder="Buscar…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 48, display: 'flex', justifyContent: 'center' }}>
            <span className="admin-spinner" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="admin-empty">
            <Truck size={36} className="admin-empty-icon" />
            <p className="admin-empty-text">Sin proveedores{search ? ' que coincidan' : ''}</p>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>RUT</th>
                  <th>Contacto</th>
                  <th>Email</th>
                  <th>Teléfono</th>
                  <th>Estado</th>
                  <th style={{ width: 80, textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id}>
                    <td>
                      <span style={{ fontWeight: 500 }}>{s.name}</span>
                      {s.address && (
                        <div style={{ fontSize: 11, color: 'var(--a-text-3)', marginTop: 2 }}>{s.address}</div>
                      )}
                    </td>
                    <td>
                      <span className="admin-mono">{s.rut ?? '—'}</span>
                    </td>
                    <td style={{ color: 'var(--a-text-2)' }}>{s.contact_name ?? '—'}</td>
                    <td>
                      {s.email
                        ? <a href={`mailto:${s.email}`} style={{ color: 'var(--a-cyan)', textDecoration: 'none', fontSize: 12, fontFamily: 'var(--a-font-mono)' }}>{s.email}</a>
                        : <span style={{ color: 'var(--a-text-3)' }}>—</span>
                      }
                    </td>
                    <td className="admin-mono">{s.phone ?? '—'}</td>
                    <td>
                      <span className={`admin-badge ${s.active ? 'admin-badge-success' : 'admin-badge-danger'}`}>
                        {s.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                        <button
                          className="admin-btn-icon"
                          title="Editar"
                          onClick={() => { setEditing(s); setShowModal(true) }}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          className="admin-btn-icon danger"
                          title="Eliminar"
                          onClick={() => setDeleting(s)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {showModal && (
        <SupplierModal
          supplier={editing}
          onClose={() => { setShowModal(false); setEditing(null) }}
          onSaved={handleSaved}
        />
      )}

      {deleting && (
        <ConfirmModal
          name={deleting.name}
          onConfirm={handleDelete}
          onClose={() => setDeleting(null)}
        />
      )}

      <Toasts toasts={toasts} onRemove={id => setToasts(t => t.filter(x => x.id !== id))} />
    </>
  )
}
