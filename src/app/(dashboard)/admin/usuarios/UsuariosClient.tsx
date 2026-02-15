'use client'

import { useState, useEffect } from 'react'
import {
  Plus, X, CheckCircle2, AlertCircle, Info,
  Search, Users, ShieldCheck, Eye, EyeOff, KeyRound, ChevronRight,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

type Role = 'OWNER' | 'ADMIN' | 'STAFF' | 'CASHIER'

interface User {
  id: string; name: string; email: string; role: Role
  active: boolean; created_at: string
}

interface Toast { id: number; type: 'success' | 'error' | 'info'; msg: string }

const ROLE_LABELS: Record<Role, string> = {
  OWNER: 'Dueño', ADMIN: 'Administrador', STAFF: 'Empleado', CASHIER: 'Cajero',
}

const ROLE_COLORS: Record<Role, string> = {
  OWNER: 'admin-badge-warning', ADMIN: 'admin-badge-info',
  STAFF: 'admin-badge-success', CASHIER: 'admin-badge-default',
}

const ROLE_DESCRIPTIONS: Record<string, string> = {
  OWNER: 'Acceso total al sistema. Puede gestionar todos los módulos y configuración.',
  ADMIN: 'Acceso completo al panel admin. Puede gestionar productos, compras y empleados.',
  STAFF: 'Acceso a compras, inventario y operaciones del día a día.',
  CASHIER: 'Solo acceso al punto de venta (POS).',
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function allowedRolesFor(actorRole: string): Role[] {
  if (actorRole === 'OWNER') return ['ADMIN', 'STAFF', 'CASHIER']
  if (actorRole === 'ADMIN') return ['STAFF', 'CASHIER']
  return []
}

function canManageRoleCheck(actorRole: string, targetRole: string): boolean {
  if (actorRole === 'OWNER') return targetRole !== 'OWNER'
  if (actorRole === 'ADMIN') return ['STAFF', 'CASHIER'].includes(targetRole)
  return false
}

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

// ─── Create modal (solo para crear nuevos) ───────────────────────────────────

function CreateModal({
  actorRole, onClose, onSaved,
}: {
  actorRole: string
  onClose: () => void
  onSaved: (u: User) => void
}) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'STAFF' as Role })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showPass, setShowPass] = useState(false)

  const roles = allowedRolesFor(actorRole)
  function set(key: string, val: string) { setForm(f => ({ ...f, [key]: val })) }

  async function handleSave() {
    if (!form.name.trim()) { setError('El nombre es requerido'); return }
    if (!form.email.trim()) { setError('El email es requerido'); return }
    if (!EMAIL_RE.test(form.email.trim())) { setError('Ingresa un email válido'); return }
    if (!form.password || form.password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Error al guardar') }
      onSaved(await res.json())
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
          <span className="admin-modal-title">Nuevo Usuario</span>
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
              <label className="admin-label">Nombre completo *</label>
              <input className="admin-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Nombre del empleado" autoFocus />
            </div>
            <div className="admin-form-field" style={{ gridColumn: 'span 2' }}>
              <label className="admin-label">Email *</label>
              <input
                type="email"
                className="admin-input"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="empleado@tienda.cl"
                onBlur={() => {
                  if (form.email && !EMAIL_RE.test(form.email)) setError('Ingresa un email válido')
                  else setError('')
                }}
              />
            </div>
            <div className="admin-form-field">
              <label className="admin-label">Rol *</label>
              <select className="admin-select" value={form.role} onChange={e => set('role', e.target.value)}>
                {roles.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
              <span style={{ fontSize: 11, color: 'var(--a-text-3)', marginTop: 4, display: 'block' }}>
                {ROLE_DESCRIPTIONS[form.role]}
              </span>
            </div>
            <div className="admin-form-field">
              <label className="admin-label">Contraseña *</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  className="admin-input"
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  style={{ paddingRight: 38 }}
                />
                <button type="button" className="admin-btn-icon" tabIndex={-1}
                  style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)' }}
                  onClick={() => setShowPass(s => !s)}>
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="admin-modal-footer">
          <button className="admin-btn admin-btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="admin-btn admin-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <span className="admin-spinner" /> : <CheckCircle2 size={14} />}
            Crear usuario
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Drawer (editar + cambiar contraseña) ────────────────────────────────────

function UserDrawer({
  user, actorRole, actorId, onClose, onSaved, onToast,
}: {
  user: User
  actorRole: string
  actorId: string
  onClose: () => void
  onSaved: (u: User) => void
  onToast: (type: Toast['type'], msg: string) => void
}) {
  const isSelf = user.id === actorId
  const canEdit = !isSelf && canManageRoleCheck(actorRole, user.role)
  const roles = allowedRolesFor(actorRole)

  // Edit form state
  const [form, setForm] = useState({ name: user.name, email: user.email, role: user.role, active: user.active })
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState('')

  // Password state
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [savingPass, setSavingPass] = useState(false)
  const [passError, setPassError] = useState('')

  function setF(key: string, val: string | boolean) { setForm(f => ({ ...f, [key]: val })) }

  async function handleSaveEdit() {
    if (!form.name.trim()) { setEditError('El nombre es requerido'); return }
    if (!form.email.trim()) { setEditError('El email es requerido'); return }
    if (!EMAIL_RE.test(form.email.trim())) { setEditError('Ingresa un email válido'); return }
    setSaving(true); setEditError('')
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, email: form.email, role: form.role, active: form.active }),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
      onSaved(await res.json())
      onToast('success', 'Usuario actualizado')
    } catch (e: unknown) {
      setEditError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function handleChangePass() {
    if (!password || password.length < 6) { setPassError('Mínimo 6 caracteres'); return }
    setSavingPass(true); setPassError('')
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
      setPassword('')
      onToast('success', 'Contraseña actualizada')
    } catch (e: unknown) {
      setPassError((e as Error).message)
    } finally {
      setSavingPass(false)
    }
  }

  return (
    <>
      {/* Overlay */}
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200 }}
        onClick={onClose}
      />
      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 420, background: 'var(--a-surface-1)',
        borderLeft: '1px solid var(--a-border)',
        zIndex: 201, display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.25)',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--a-border)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: 'var(--a-surface-2)', border: '1px solid var(--a-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 700, color: 'var(--a-text-2)', flexShrink: 0,
          }}>
            {user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--a-text-1)' }}>{user.name}</div>
            <div style={{ fontSize: 12, color: 'var(--a-text-3)', fontFamily: 'var(--a-font-mono)', marginTop: 1 }}>{user.email}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className={`admin-badge ${ROLE_COLORS[user.role]}`}>{ROLE_LABELS[user.role]}</span>
            <button className="admin-btn-icon" onClick={onClose}><X size={16} /></button>
          </div>
        </div>

        {/* Body scrollable */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

          {/* Info solo lectura si no puede editar */}
          {!canEdit && (
            <div style={{
              background: 'var(--a-surface-2)', border: '1px solid var(--a-border)',
              borderRadius: 'var(--a-radius-sm)', padding: '10px 14px',
              fontSize: 12, color: 'var(--a-text-3)', marginBottom: 20,
            }}>
              {isSelf ? 'Este es tu propio perfil. Contacta a otro administrador para modificarlo.' : 'No tienes permisos para editar este usuario.'}
            </div>
          )}

          {/* Sección: datos */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--a-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
              Información
            </div>
            <div className="admin-form-grid cols-1" style={{ gap: 12 }}>
              <div className="admin-form-field">
                <label className="admin-label">Nombre completo</label>
                <input
                  className="admin-input"
                  value={form.name}
                  onChange={e => setF('name', e.target.value)}
                  disabled={!canEdit}
                />
              </div>
              <div className="admin-form-field">
                <label className="admin-label">Email</label>
                <input
                  type="email"
                  className="admin-input"
                  value={form.email}
                  onChange={e => setF('email', e.target.value)}
                  disabled={!canEdit}
                  onBlur={() => {
                    if (form.email && !EMAIL_RE.test(form.email)) setEditError('Ingresa un email válido')
                    else setEditError('')
                  }}
                />
              </div>
              <div className="admin-form-grid cols-2" style={{ gap: 12 }}>
                <div className="admin-form-field">
                  <label className="admin-label">Rol</label>
                  {canEdit ? (
                    <select className="admin-select" value={form.role} onChange={e => setF('role', e.target.value)}>
                      {roles.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                    </select>
                  ) : (
                    <div style={{ padding: '7px 10px', fontSize: 13, color: 'var(--a-text-2)' }}>
                      {ROLE_LABELS[form.role]}
                    </div>
                  )}
                </div>
                <div className="admin-form-field">
                  <label className="admin-label">Estado</label>
                  {canEdit ? (
                    <select className="admin-select" value={form.active ? 'true' : 'false'} onChange={e => setF('active', e.target.value === 'true')}>
                      <option value="true">Activo</option>
                      <option value="false">Inactivo</option>
                    </select>
                  ) : (
                    <div style={{ padding: '7px 10px' }}>
                      <span className={`admin-badge ${user.active ? 'admin-badge-success' : 'admin-badge-danger'}`}>
                        {user.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {editError && (
              <div style={{ background: 'var(--a-red-dim)', border: '1px solid rgba(244,63,94,0.2)', borderRadius: 'var(--a-radius-sm)', padding: '8px 12px', marginTop: 10, color: 'var(--a-red)', fontSize: 13 }}>
                {editError}
              </div>
            )}

            {canEdit && (
              <button className="admin-btn admin-btn-primary" style={{ marginTop: 14 }} onClick={handleSaveEdit} disabled={saving}>
                {saving ? <span className="admin-spinner" /> : <CheckCircle2 size={14} />}
                Guardar cambios
              </button>
            )}
          </div>

          {/* Separador */}
          {canEdit && (
            <div style={{ borderTop: '1px solid var(--a-border)', marginBottom: 24 }} />
          )}

          {/* Sección: contraseña */}
          {canEdit && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--a-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <KeyRound size={12} /> Cambiar contraseña
              </div>
              <div className="admin-form-field">
                <label className="admin-label">Nueva contraseña</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPass ? 'text' : 'password'}
                    className="admin-input"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    style={{ paddingRight: 38 }}
                  />
                  <button type="button" className="admin-btn-icon" tabIndex={-1}
                    style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)' }}
                    onClick={() => setShowPass(s => !s)}>
                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              {passError && (
                <div style={{ background: 'var(--a-red-dim)', border: '1px solid rgba(244,63,94,0.2)', borderRadius: 'var(--a-radius-sm)', padding: '8px 12px', marginTop: 8, color: 'var(--a-red)', fontSize: 13 }}>
                  {passError}
                </div>
              )}
              <button className="admin-btn admin-btn-secondary" style={{ marginTop: 10 }} onClick={handleChangePass} disabled={savingPass}>
                {savingPass ? <span className="admin-spinner" /> : <KeyRound size={14} />}
                Cambiar contraseña
              </button>
            </div>
          )}

          {/* Info de solo lectura al fondo */}
          <div style={{ marginTop: 28, borderTop: '1px solid var(--a-border)', paddingTop: 16 }}>
            <div style={{ fontSize: 11, color: 'var(--a-text-3)', lineHeight: 1.7 }}>
              <div><strong style={{ color: 'var(--a-text-2)' }}>Permisos:</strong> {ROLE_DESCRIPTIONS[user.role]}</div>
              <div style={{ marginTop: 4 }}><strong style={{ color: 'var(--a-text-2)' }}>Registrado:</strong> {new Date(user.created_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Main client component ────────────────────────────────────────────────────

export default function UsuariosClient({ actorRole, actorId }: { actorRole: string; actorId: string }) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [selected, setSelected] = useState<User | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => { fetchUsers() }, [showInactive])

  async function fetchUsers() {
    setLoading(true)
    try {
      const res = await fetch(`/api/users?${showInactive ? 'all=true' : ''}`)
      const data = await res.json()
      setUsers(data.users ?? [])
    } catch {
      toast('error', 'Error al cargar usuarios')
    } finally {
      setLoading(false)
    }
  }

  function toast(type: Toast['type'], msg: string) {
    const id = Date.now()
    setToasts(t => [...t, { id, type, msg }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4500)
  }

  function handleCreated(u: User) {
    setUsers(prev => [u, ...prev])
    toast('success', 'Usuario creado')
    setShowCreate(false)
  }

  function handleSaved(u: User) {
    setUsers(prev => {
      const idx = prev.findIndex(x => x.id === u.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = u; return next }
      return prev
    })
    setSelected(u)
  }

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  const canCreate = allowedRolesFor(actorRole).length > 0

  return (
    <>
      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Gestión de <span>Usuarios</span></h1>
          <p className="admin-page-subtitle">{users.length} usuario{users.length !== 1 ? 's' : ''} registrado{users.length !== 1 ? 's' : ''}</p>
        </div>
        {canCreate && (
          <button className="admin-btn admin-btn-primary admin-btn-lg" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> Nuevo Usuario
          </button>
        )}
      </div>

      {/* Panel */}
      <div className="admin-panel">
        <div className="admin-panel-header">
          <span className="admin-panel-title">Equipo</span>
          <div className="a-flex a-items-center a-gap-3">
            <label className="a-flex a-items-center a-gap-2" style={{ fontSize: 12, color: 'var(--a-text-3)', cursor: 'pointer', userSelect: 'none' }}>
              <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} style={{ accentColor: 'var(--a-accent)' }} />
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
            <Users size={36} className="admin-empty-icon" />
            <p className="admin-empty-text">Sin usuarios{search ? ' que coincidan' : ''}</p>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Registrado</th>
                  <th style={{ width: 32 }} />
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => {
                  const isSelf = u.id === actorId
                  return (
                    <tr
                      key={u.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelected(u)}
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%',
                            background: 'var(--a-surface-2)', border: '1px solid var(--a-border)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 12, fontWeight: 600, color: 'var(--a-text-2)', flexShrink: 0,
                          }}>
                            {u.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 500 }}>{u.name}</div>
                            {isSelf && <div style={{ fontSize: 10, color: 'var(--a-accent)', marginTop: 1 }}>Tú</div>}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ color: 'var(--a-text-2)', fontSize: 12, fontFamily: 'var(--a-font-mono)' }}>
                          {u.email}
                        </span>
                      </td>
                      <td>
                        <span className={`admin-badge ${ROLE_COLORS[u.role]}`}>{ROLE_LABELS[u.role]}</span>
                      </td>
                      <td>
                        <span className={`admin-badge ${u.active ? 'admin-badge-success' : 'admin-badge-danger'}`}>
                          {u.active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--a-text-3)' }}>
                        {new Date(u.created_at).toLocaleDateString('es-CL')}
                      </td>
                      <td>
                        <ChevronRight size={14} style={{ color: 'var(--a-text-3)' }} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Guía de roles */}
      <div className="admin-panel" style={{ marginTop: 16 }}>
        <div className="admin-panel-header">
          <span className="admin-panel-title"><ShieldCheck size={14} style={{ marginRight: 6 }} />Guía de roles</span>
        </div>
        <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {(['OWNER', 'ADMIN', 'STAFF', 'CASHIER'] as Role[]).map(role => (
            <div key={role} style={{ padding: '10px 14px', background: 'var(--a-surface-2)', borderRadius: 'var(--a-radius-sm)', border: '1px solid var(--a-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span className={`admin-badge ${ROLE_COLORS[role]}`}>{ROLE_LABELS[role]}</span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--a-text-3)', margin: 0, lineHeight: 1.5 }}>
                {ROLE_DESCRIPTIONS[role]}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Create modal */}
      {showCreate && (
        <CreateModal
          actorRole={actorRole}
          onClose={() => setShowCreate(false)}
          onSaved={handleCreated}
        />
      )}

      {/* Drawer */}
      {selected && (
        <UserDrawer
          user={selected}
          actorRole={actorRole}
          actorId={actorId}
          onClose={() => setSelected(null)}
          onSaved={handleSaved}
          onToast={toast}
        />
      )}

      <Toasts toasts={toasts} onRemove={id => setToasts(t => t.filter(x => x.id !== id))} />
    </>
  )
}
