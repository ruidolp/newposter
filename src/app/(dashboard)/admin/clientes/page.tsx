'use client'

import { useState, useEffect } from 'react'
import {
  Plus, Pencil, Trash2, X, CheckCircle2, AlertCircle, Info,
  Search, UserCircle2,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Customer {
  id: string; name: string; email: string | null; phone: string | null
  address: string | null; created_at: string; updated_at: string
}

interface Toast { id: number; type: 'success' | 'error' | 'info'; msg: string }

const emptyForm = () => ({ name: '', email: '', phone: '', address: '' })

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

function CustomerModal({
  customer, onClose, onSaved,
}: {
  customer: Customer | null
  onClose: () => void
  onSaved: (c: Customer) => void
}) {
  const [form, setForm] = useState(customer ? {
    name: customer.name,
    email: customer.email ?? '',
    phone: customer.phone ?? '',
    address: customer.address ?? '',
  } : emptyForm())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(key: string, val: string) { setForm(f => ({ ...f, [key]: val })) }

  async function handleSave() {
    if (!form.name.trim()) { setError('El nombre es requerido'); return }
    setSaving(true); setError('')
    try {
      const url = customer ? `/api/customers/${customer.id}` : '/api/customers'
      const method = customer ? 'PATCH' : 'POST'
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
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="admin-modal">
        <div className="admin-modal-header">
          <span className="admin-modal-title">
            {customer ? 'Editar Cliente' : 'Nuevo Cliente'}
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
              <input
                className="admin-input"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="Nombre del cliente"
                autoFocus
              />
            </div>
            <div className="admin-form-field">
              <label className="admin-label">Email</label>
              <input
                type="email"
                className="admin-input"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="cliente@email.com"
              />
            </div>
            <div className="admin-form-field">
              <label className="admin-label">Teléfono</label>
              <input
                className="admin-input"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                placeholder="+56 9 1234 5678"
              />
            </div>
            <div className="admin-form-field" style={{ gridColumn: 'span 2' }}>
              <label className="admin-label">Dirección</label>
              <input
                className="admin-input"
                value={form.address}
                onChange={e => set('address', e.target.value)}
                placeholder="Dirección del cliente"
              />
            </div>
          </div>
        </div>

        <div className="admin-modal-footer">
          <button className="admin-btn admin-btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="admin-btn admin-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <span className="admin-spinner" /> : <CheckCircle2 size={14} />}
            {customer ? 'Guardar cambios' : 'Crear cliente'}
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
          <span className="admin-modal-title">Eliminar cliente</span>
          <button className="admin-btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="admin-modal-body">
          <p style={{ color: 'var(--a-text-2)', fontSize: 14 }}>
            ¿Eliminar a <strong style={{ color: 'var(--a-text-1)' }}>{name}</strong>? Esta acción no se puede deshacer.
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

export default function ClientesPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [deleting, setDeleting] = useState<Customer | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => { fetchCustomers() }, [])

  async function fetchCustomers(q?: string) {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (q) params.set('search', q)
      const res = await fetch(`/api/customers?${params}`)
      const data = await res.json()
      setCustomers(data.customers ?? [])
      setTotal(data.total ?? 0)
    } catch {
      toast('error', 'Error al cargar clientes')
    } finally {
      setLoading(false)
    }
  }

  function toast(type: Toast['type'], msg: string) {
    const id = Date.now()
    setToasts(t => [...t, { id, type, msg }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4500)
  }

  function handleSaved(c: Customer) {
    setCustomers(prev => {
      const idx = prev.findIndex(x => x.id === c.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = c; return next }
      return [c, ...prev]
    })
    setTotal(t => editing ? t : t + 1)
    toast('success', editing ? 'Cliente actualizado' : 'Cliente creado')
    setShowModal(false)
    setEditing(null)
  }

  async function handleDelete() {
    if (!deleting) return
    try {
      const res = await fetch(`/api/customers/${deleting.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setCustomers(prev => prev.filter(c => c.id !== deleting.id))
      setTotal(t => t - 1)
      toast('success', `"${deleting.name}" eliminado`)
    } catch {
      toast('error', 'Error al eliminar cliente')
    } finally {
      setDeleting(null)
    }
  }

  // Búsqueda con debounce simple
  let searchTimer: ReturnType<typeof setTimeout>
  function handleSearch(val: string) {
    setSearch(val)
    clearTimeout(searchTimer)
    searchTimer = setTimeout(() => fetchCustomers(val), 350)
  }

  return (
    <>
      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Gestión de <span>Clientes</span></h1>
          <p className="admin-page-subtitle">{total} cliente{total !== 1 ? 's' : ''} registrado{total !== 1 ? 's' : ''}</p>
        </div>
        <button
          className="admin-btn admin-btn-primary admin-btn-lg"
          onClick={() => { setEditing(null); setShowModal(true) }}
        >
          <Plus size={16} /> Nuevo Cliente
        </button>
      </div>

      {/* Panel */}
      <div className="admin-panel">
        <div className="admin-panel-header">
          <span className="admin-panel-title">Listado</span>
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--a-text-3)' }} />
            <input
              className="admin-input admin-input-sm"
              style={{ paddingLeft: 30, width: 240 }}
              placeholder="Buscar por nombre, email o teléfono…"
              value={search}
              onChange={e => handleSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 48, display: 'flex', justifyContent: 'center' }}>
            <span className="admin-spinner" />
          </div>
        ) : customers.length === 0 ? (
          <div className="admin-empty">
            <UserCircle2 size={36} className="admin-empty-icon" />
            <p className="admin-empty-text">Sin clientes{search ? ' que coincidan' : ''}</p>
            {!search && (
              <button
                className="admin-btn admin-btn-primary"
                style={{ marginTop: 12 }}
                onClick={() => setShowModal(true)}
              >
                <Plus size={14} /> Agregar primer cliente
              </button>
            )}
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Teléfono</th>
                  <th>Dirección</th>
                  <th>Registrado</th>
                  <th style={{ width: 80, textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {customers.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%',
                          background: 'var(--a-surface-2)',
                          border: '1px solid var(--a-border)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 600, color: 'var(--a-text-2)',
                          flexShrink: 0,
                        }}>
                          {c.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <span style={{ fontWeight: 500 }}>{c.name}</span>
                      </div>
                    </td>
                    <td>
                      {c.email
                        ? <a href={`mailto:${c.email}`} style={{ color: 'var(--a-cyan)', textDecoration: 'none', fontSize: 12, fontFamily: 'var(--a-font-mono)' }}>{c.email}</a>
                        : <span style={{ color: 'var(--a-text-3)' }}>—</span>}
                    </td>
                    <td className="admin-mono">{c.phone ?? '—'}</td>
                    <td style={{ color: 'var(--a-text-2)', fontSize: 12 }}>{c.address ?? '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--a-text-3)' }}>
                      {new Date(c.created_at).toLocaleDateString('es-CL')}
                    </td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                        <button
                          className="admin-btn-icon"
                          title="Editar"
                          onClick={() => { setEditing(c); setShowModal(true) }}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          className="admin-btn-icon danger"
                          title="Eliminar"
                          onClick={() => setDeleting(c)}
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
        <CustomerModal
          customer={editing}
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
