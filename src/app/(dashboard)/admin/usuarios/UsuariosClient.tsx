'use client'

import { type MouseEvent as ReactMouseEvent, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from 'lucide-react'

type Role = 'OWNER' | 'ADMIN' | 'STAFF' | 'CASHIER'

interface User {
  id: string
  name: string
  email: string
  role: Role
  active: boolean
  created_at: string
}

interface Toast {
  id: number
  type: 'success' | 'error' | 'info'
  msg: string
}

const ROLE_LABELS: Record<Role, string> = {
  OWNER: 'Dueño',
  ADMIN: 'Administrador',
  STAFF: 'Empleado',
  CASHIER: 'Cajero',
}

const ROLE_DESCRIPTIONS: Record<Role, string> = {
  OWNER: 'Acceso total al sistema.',
  ADMIN: 'Acceso completo al panel admin.',
  STAFF: 'Operación diaria, compras e inventario.',
  CASHIER: 'Solo acceso POS.',
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
              : t.type === 'error'
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-sky-200 bg-sky-50 text-sky-700'
          }`}
        >
          {t.type === 'success' ? <CheckCircle2 size={15} /> : t.type === 'error' ? <AlertCircle size={15} /> : <ShieldCheck size={15} />}
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

function CreateModal({
  actorRole,
  onClose,
  onSaved,
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

  function set<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: val }))
  }

  async function handleSave() {
    if (!form.name.trim()) return setError('El nombre es requerido')
    if (!form.email.trim()) return setError('El email es requerido')
    if (!EMAIL_RE.test(form.email.trim())) return setError('Ingresa un email válido')
    if (!form.password || form.password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres')

    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({ error: 'Error al guardar' }))
        throw new Error(e.error || 'Error al guardar')
      }
      onSaved(await res.json())
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/45 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">Nuevo Usuario</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5 md:col-span-2">
              <label htmlFor="u_name" className="text-xs font-medium uppercase tracking-wide text-slate-500">Nombre completo *</label>
              <input
                id="u_name"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Nombre del empleado…"
                autoFocus
                autoComplete="name"
                className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label htmlFor="u_email" className="text-xs font-medium uppercase tracking-wide text-slate-500">Email *</label>
              <input
                id="u_email"
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="empleado@tienda.cl"
                autoComplete="email"
                className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="u_role" className="text-xs font-medium uppercase tracking-wide text-slate-500">Rol *</label>
              <select
                id="u_role"
                value={form.role}
                onChange={(e) => set('role', e.target.value as Role)}
                className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200"
              >
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500">{ROLE_DESCRIPTIONS[form.role]}</p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="u_pass" className="text-xs font-medium uppercase tracking-wide text-slate-500">Contraseña *</label>
              <div className="relative">
                <input
                  id="u_pass"
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                  placeholder="Mínimo 6 caracteres…"
                  autoComplete="new-password"
                  className="h-10 w-full rounded-md border border-slate-300 px-3 pr-10 text-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                  aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          </div>
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
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-md bg-fuchsia-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-fuchsia-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400 focus-visible:ring-offset-2 disabled:opacity-60"
          >
            <CheckCircle2 size={14} className={saving ? 'animate-pulse' : ''} />
            Crear Usuario
          </button>
        </div>
      </div>
    </div>
  )
}

// ── User location permissions ─────────────────────────────────────────────────

interface LocationOption { id: string; name: string; type: string; is_default: boolean }

function UserLocationsSection({ userId, canEdit }: { userId: string; canEdit: boolean }) {
  const [locations, setLocations] = useState<LocationOption[]>([])
  const [allowed, setAllowed] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/locations')
      .then((r) => r.json())
      .then((d) => setLocations(d.locations ?? []))
    fetch(`/api/users/${userId}/locations`)
      .then((r) => r.json())
      .then((d) => setAllowed(d.allowed_location_ids ?? []))
  }, [userId])

  function toggle(id: string) {
    setAllowed((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  async function save() {
    setSaving(true)
    try {
      await fetch(`/api/users/${userId}/locations`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowed_location_ids: allowed }),
      })
    } finally {
      setSaving(false)
    }
  }

  if (locations.length <= 1) return null  // hide if only 1 location, no choice needed

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 p-4">
      <h3 className="text-sm font-semibold text-slate-800">Ubicaciones permitidas</h3>
      <p className="text-xs text-slate-500">
        Define en qué cajas puede abrir sesión este usuario.
        Si no se selecciona ninguna, tendrá acceso a todas.
      </p>
      <div className="space-y-1.5">
        {locations.map((loc) => (
          <label key={loc.id} className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50">
            <input
              type="checkbox"
              checked={allowed.length === 0 || allowed.includes(loc.id)}
              onChange={() => toggle(loc.id)}
              disabled={!canEdit}
              className="h-4 w-4 rounded border-slate-300 text-fuchsia-600 focus:ring-fuchsia-500"
            />
            <span className="text-sm text-slate-700">{loc.name}</span>
            {loc.is_default && <span className="text-[10px] text-slate-400">(Principal)</span>}
          </label>
        ))}
      </div>
      {canEdit && (
        <button type="button" onClick={save} disabled={saving}
          className="inline-flex items-center gap-2 rounded-md bg-fuchsia-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-fuchsia-700 disabled:opacity-60">
          {saving ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <CheckCircle2 size={14} />}
          Guardar permisos
        </button>
      )}
    </section>
  )
}

function UserDrawer({
  user,
  actorRole,
  actorId,
  onClose,
  onSaved,
  onToast,
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

  const [form, setForm] = useState({ name: user.name, email: user.email, role: user.role, active: user.active })
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState('')

  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [savingPass, setSavingPass] = useState(false)
  const [passError, setPassError] = useState('')

  function setF<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: val }))
  }

  async function handleSaveEdit() {
    if (!form.name.trim()) return setEditError('El nombre es requerido')
    if (!form.email.trim()) return setEditError('El email es requerido')
    if (!EMAIL_RE.test(form.email.trim())) return setEditError('Ingresa un email válido')

    setSaving(true)
    setEditError('')
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, email: form.email, role: form.role, active: form.active }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({ error: 'Error al actualizar usuario' }))
        throw new Error(e.error || 'Error al actualizar usuario')
      }
      onSaved(await res.json())
      onToast('success', 'Usuario actualizado')
    } catch (e: unknown) {
      setEditError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function handleChangePass() {
    if (!password || password.length < 6) return setPassError('Mínimo 6 caracteres')
    setSavingPass(true)
    setPassError('')
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({ error: 'Error al cambiar contraseña' }))
        throw new Error(e.error || 'Error al cambiar contraseña')
      }
      setPassword('')
      onToast('success', 'Contraseña actualizada')
    } catch (e: unknown) {
      setPassError((e as Error).message)
    } finally {
      setSavingPass(false)
    }
  }

  async function handleDeactivate() {
    const ok = window.confirm('¿Desactivar este usuario?')
    if (!ok) return
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const e = await res.json().catch(() => ({ error: 'Error al desactivar usuario' }))
        throw new Error(e.error || 'Error al desactivar usuario')
      }
      onSaved({ ...user, active: false })
      onToast('success', 'Usuario desactivado')
      onClose()
    } catch (e: unknown) {
      onToast('error', (e as Error).message || 'Error al desactivar usuario')
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-[80] bg-slate-900/40" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-[81] w-full max-w-xl overflow-y-auto border-l border-slate-200 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Usuario</h2>
            <p className="text-xs text-slate-500">{user.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <section className="space-y-3 rounded-xl border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-800">Datos del usuario</h3>
            {editError && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{editError}</div>}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Nombre</label>
                <input
                  value={form.name}
                  onChange={(e) => setF('name', e.target.value)}
                  disabled={!canEdit}
                  className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Email</label>
                <input
                  value={form.email}
                  onChange={(e) => setF('email', e.target.value)}
                  disabled={!canEdit}
                  className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Rol</label>
                <select
                  value={form.role}
                  onChange={(e) => setF('role', e.target.value as Role)}
                  disabled={!canEdit}
                  className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 disabled:bg-slate-100 disabled:text-slate-500"
                >
                  {[user.role, ...roles].filter((v, i, arr) => arr.indexOf(v) === i).map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r as Role]}
                    </option>
                  ))}
                </select>
              </div>
              <label className="inline-flex items-center gap-2 self-end text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setF('active', e.target.checked)}
                  disabled={!canEdit}
                  className="h-4 w-4 rounded border-slate-300 text-fuchsia-600 focus:ring-fuchsia-500 disabled:opacity-50"
                />
                Activo
              </label>
            </div>

            {canEdit ? (
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-md bg-fuchsia-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-fuchsia-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400 focus-visible:ring-offset-2 disabled:opacity-60"
              >
                <CheckCircle2 size={14} className={saving ? 'animate-pulse' : ''} />
                Guardar Cambios
              </button>
            ) : (
              <p className="text-xs text-slate-500">No tienes permisos para editar este usuario.</p>
            )}
          </section>

          <UserLocationsSection userId={user.id} canEdit={canEdit} />

          <section className="space-y-3 rounded-xl border border-slate-200 p-4">
            <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-800">
              <KeyRound size={14} />
              Cambiar contraseña
            </h3>
            {passError && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{passError}</div>}
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nueva contraseña (mínimo 6)…"
                autoComplete="new-password"
                disabled={!canEdit}
                className="h-10 w-full rounded-md border border-slate-300 px-3 pr-10 text-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 disabled:bg-slate-100 disabled:text-slate-500"
              />
              <button
                type="button"
                onClick={() => setShowPass((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 transition hover:bg-slate-100"
              >
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <button
              type="button"
              onClick={handleChangePass}
              disabled={!canEdit || savingPass}
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500 disabled:opacity-60"
            >
              <KeyRound size={14} />
              {savingPass ? 'Actualizando…' : 'Actualizar contraseña'}
            </button>
          </section>

          {canEdit && (
            <section className="rounded-xl border border-red-200 bg-red-50 p-4">
              <h3 className="mb-1 text-sm font-semibold text-red-700">Zona de riesgo</h3>
              <p className="mb-3 text-xs text-red-700/80">Desactiva la cuenta para impedir acceso al sistema.</p>
              <button
                type="button"
                onClick={handleDeactivate}
                className="inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2"
              >
                <Trash2 size={14} />
                Desactivar usuario
              </button>
            </section>
          )}
        </div>
      </aside>
    </>
  )
}

export default function UsuariosClient({
  actorRole,
  actorId,
}: {
  actorRole: string
  actorId: string
}) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    fetchUsers()
  }, [showInactive])

  function toast(type: Toast['type'], msg: string) {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, type, msg }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500)
  }

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
  }, [users, search])

  useEffect(() => {
    const validIds = new Set(filtered.map((u) => u.id))
    setSelectedIds((prev) => prev.filter((id) => validIds.has(id)))
    if (lastSelectedId && !validIds.has(lastSelectedId)) {
      setLastSelectedId(null)
    }
  }, [filtered, lastSelectedId])

  const selectedCount = selectedIds.length

  function upsertUser(user: User) {
    setUsers((prev) => {
      const idx = prev.findIndex((x) => x.id === user.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = user
        return next
      }
      return [user, ...prev]
    })
  }

  function clearSelection() {
    setSelectedIds([])
    setLastSelectedId(null)
  }

  function handleRowClick(
    e: ReactMouseEvent<HTMLTableRowElement>,
    row: User,
    rowIndex: number
  ) {
    const withModifiers = e.metaKey || e.ctrlKey || e.shiftKey
    if (!withModifiers) {
      setSelectedUser(row)
      return
    }

    e.preventDefault()
    e.stopPropagation()

    if (e.shiftKey && lastSelectedId) {
      const anchorIndex = filtered.findIndex((u) => u.id === lastSelectedId)
      if (anchorIndex >= 0) {
        const [start, end] = [anchorIndex, rowIndex].sort((a, b) => a - b)
        const rangeIds = filtered.slice(start, end + 1).map((u) => u.id)
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
    const confirmed = window.confirm(
      `¿Eliminar ${selectedCount} usuario(s)?\n\nSe desactivarán (eliminación lógica).`
    )
    if (!confirmed) return

    const deletedIds: string[] = []
    let okCount = 0
    let failCount = 0

    for (const id of selectedIds) {
      try {
        const res = await fetch(`/api/users/${id}`, { method: 'DELETE' })
        if (res.ok) {
          okCount += 1
          deletedIds.push(id)
        } else {
          failCount += 1
        }
      } catch {
        failCount += 1
      }
    }

    if (deletedIds.length > 0) {
      setUsers((prev) =>
        prev.map((u) => (deletedIds.includes(u.id) ? { ...u, active: false } : u))
      )
    }
    clearSelection()

    if (okCount > 0) toast('success', `${okCount} usuario(s) desactivado(s)`)
    if (failCount > 0) toast('error', `${failCount} usuario(s) no se pudieron desactivar`)
  }

  return (
    <section className="space-y-5">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 [text-wrap:balance]">
            Gestión de <span className="text-fuchsia-600">Usuarios</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {users.length} usuario{users.length !== 1 ? 's' : ''} registrado{users.length !== 1 ? 's' : ''}
            {' · '}
            Haz click en una fila para editar
          </p>
        </div>
        {allowedRolesFor(actorRole).length > 0 && (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-md bg-fuchsia-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-fuchsia-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400 focus-visible:ring-offset-2"
          >
            <Plus size={16} />
            Nuevo Usuario
          </button>
        )}
      </header>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <h2 className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-800">
            <Users size={14} />
            Listado
          </h2>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="inline-flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-fuchsia-600 focus:ring-fuchsia-500"
              />
              Ver inactivos
            </label>
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre o email…"
                className="h-9 w-full min-w-[260px] rounded-md border border-slate-300 pl-8 pr-3 text-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="px-4 py-14 text-center text-sm text-slate-500">Cargando…</div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-14 text-center text-slate-500">
            <Users size={34} className="mx-auto mb-2 text-slate-300" />
            <p className="text-sm">Sin usuarios{search ? ' que coincidan' : ''}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Nombre</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Email</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Rol</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Estado</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Creado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((u, rowIndex) => (
                  <tr
                    key={u.id}
                    className={`cursor-pointer transition hover:bg-slate-50 ${selectedIds.includes(u.id) ? 'bg-fuchsia-50' : ''}`}
                    onClick={(e) => handleRowClick(e, u, rowIndex)}
                  >
                    <td className="px-4 py-3 font-medium text-slate-900">{u.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">
                        {ROLE_LABELS[u.role]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${u.active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                        {u.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{new Date(u.created_at).toLocaleDateString('es-CL')}</td>
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
          <button className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50" onClick={clearSelection}>
            Limpiar
          </button>
          <button className="inline-flex h-8 items-center rounded-lg bg-rose-600 px-3 text-xs font-semibold text-white transition hover:bg-rose-700" onClick={handleBulkDelete}>
            Eliminar
          </button>
        </div>
      )}

      {showCreate && (
        <CreateModal
          actorRole={actorRole}
          onClose={() => setShowCreate(false)}
          onSaved={(u) => {
            upsertUser(u)
            setShowCreate(false)
            toast('success', 'Usuario creado')
          }}
        />
      )}

      {selectedUser && (
        <UserDrawer
          user={selectedUser}
          actorRole={actorRole}
          actorId={actorId}
          onClose={() => setSelectedUser(null)}
          onSaved={(u) => {
            upsertUser(u)
            setSelectedUser((prev) => (prev && prev.id === u.id ? u : prev))
          }}
          onToast={toast}
        />
      )}

      <Toasts toasts={toasts} onRemove={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </section>
  )
}
