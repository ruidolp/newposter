'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Calculator, Link2, UserCheck } from 'lucide-react'
import Link from 'next/link'
import AccesoSistema from './AccesoSistema'

// ─── Listas instituciones ─────────────────────────────────────
const AFP_OPTIONS = [
  'AFP Capital',
  'AFP Cuprum',
  'AFP Habitat',
  'AFP Modelo',
  'AFP PlanVital',
  'AFP ProVida',
  'AFP Uno',
]
const SALUD_OPTIONS = [
  'Fonasa',
  'Isapre Banmédica',
  'Isapre ColMédica',
  'Isapre Consalud',
  'Isapre Cruz Blanca',
  'Isapre Cruz del Norte',
  'Isapre MasVida',
  'Isapre Vida Tres',
  'Isapre Esencial',
]

// ─── Tipos ────────────────────────────────────────────────────
export interface EmpleadoFormData {
  rut: string
  nombres: string
  apellido_paterno: string
  apellido_materno: string
  email: string
  phone_prefix: string
  phone: string
  address: string
  birth_date: string
  nationality: string
  employee_code: string
  position: string
  department: string
  hire_date: string
  contract_type: string
  manager_id: string
  user_id: string
  country_code: string
  bank_name: string
  bank_account_type: string
  bank_account_number: string
  notes: string
  // Remuneración
  base_salary: string
  transport_allowance: string
  food_allowance: string
  other_allowances: string
  afp_institution: string
  health_institution: string
  health_additional_rate: string
  // Solo para modo edición (no se envía al API de empleados)
  _initial_user_id?: string | null
}

const EMPTY_FORM: EmpleadoFormData = {
  rut: '', nombres: '', apellido_paterno: '', apellido_materno: '',
  email: '', phone_prefix: '+56', phone: '', address: '', birth_date: '', nationality: 'Chilena', employee_code: '',
  position: '', department: '', hire_date: '',
  contract_type: 'indefinido', manager_id: '', user_id: '',
  country_code: 'CL', bank_name: '', bank_account_type: 'cuenta_corriente',
  bank_account_number: '', notes: '',
  base_salary: '', transport_allowance: '', food_allowance: '',
  other_allowances: '', afp_institution: '', health_institution: '',
  health_additional_rate: '',
}

interface Props {
  mode: 'create' | 'edit'
  employeeId?: string
  initialData?: Partial<EmpleadoFormData>
}

// ─── Cálculo rápido sueldo líquido (Chile) ───────────────────
function calcLiquido(base: number, movilizacion: number, colacion: number, otros: number): number {
  if (!base) return 0
  const afp = Math.round(base * 0.10)
  const salud = Math.round(base * 0.07)
  const cesantia = Math.round(base * 0.006)
  const bruto = base + movilizacion + colacion + otros
  return Math.max(0, bruto - afp - salud - cesantia)
}

// ─── Helpers UI ───────────────────────────────────────────────
const ROLE_LABEL_MINI: Record<string, string> = {
  OWNER: 'Propietario', ADMIN: 'Admin', EMPLOYEE: 'Empleado',
  CASHIER: 'Cajero', STAFF: 'Staff',
}

const inputCls = 'w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-fuchsia-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-fuchsia-400'
const selectCls = inputCls

function Field({ label, children, span2 }: { label: string; children: React.ReactNode; span2?: boolean }) {
  return (
    <div className={`space-y-1 ${span2 ? 'sm:col-span-2' : ''}`}>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label>
      {children}
    </div>
  )
}

function MoneyInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">$</span>
      <input
        type="number" min="0" step="1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? '0'}
        className={`${inputCls} pl-7`}
      />
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────
export default function EmpleadoForm({ mode, employeeId, initialData }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const emailCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Pre-cargar datos desde query params (viene de "Importar desde sistema")
  const fromUserId = searchParams.get('from_user_id')
  const prefillEmail = searchParams.get('email') ?? ''
  const prefillName = searchParams.get('full_name') ?? ''

  // Separar nombre prefillado en partes
  const prefillParts = prefillName.trim().split(/\s+/)
  const prefillNombres = prefillParts.length > 2 ? prefillParts.slice(0, -2).join(' ') : (prefillParts[0] ?? '')
  const prefillAp = prefillParts.length >= 2 ? prefillParts[prefillParts.length - 2] : ''
  const prefillAm = prefillParts.length >= 3 ? prefillParts[prefillParts.length - 1] : ''

  const [form, setForm] = useState<EmpleadoFormData>({
    ...EMPTY_FORM,
    ...(prefillEmail ? { email: prefillEmail } : {}),
    ...(prefillNombres ? { nombres: prefillNombres, apellido_paterno: prefillAp, apellido_materno: prefillAm } : {}),
    ...(fromUserId ? { user_id: fromUserId, _initial_user_id: fromUserId } : {}),
    ...initialData,
  })

  const [managers, setManagers] = useState<{ id: string; full_name: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Detección de usuario existente por email
  const [emailMatch, setEmailMatch] = useState<{
    found: boolean
    user?: { id: string; name: string; email: string; role: string }
    already_linked_to?: { id: string; name: string } | null
  } | null>(null)

  useEffect(() => {
    fetch('/api/rrhh/employees?status=active')
      .then((r) => r.json())
      .then((d) => {
        const list = (d.employees ?? []).filter((e: any) => e.id !== employeeId)
        setManagers(list)
      })
  }, [employeeId])

  // Si viene de importar, ya sabemos el match — no es necesario re-chequear
  useEffect(() => {
    if (fromUserId && prefillEmail) {
      setEmailMatch({
        found: true,
        user: { id: fromUserId, name: prefillName, email: prefillEmail, role: '' },
        already_linked_to: null,
      })
    }
  }, [fromUserId])

  function set(key: keyof EmpleadoFormData, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))

    // Detección de email en tiempo real (solo en modo crear)
    if (key === 'email' && mode === 'create' && !fromUserId) {
      setEmailMatch(null)
      if (emailCheckTimer.current) clearTimeout(emailCheckTimer.current)
      const email = value.trim().toLowerCase()
      if (email.includes('@')) {
        emailCheckTimer.current = setTimeout(async () => {
          const res = await fetch(`/api/rrhh/check-email?email=${encodeURIComponent(email)}`)
          const data = await res.json()
          setEmailMatch(data)
        }, 500)
      }
    }
  }

  function linkExistingUser() {
    if (!emailMatch?.user) return
    setForm((prev) => ({ ...prev, user_id: emailMatch!.user!.id, _initial_user_id: emailMatch!.user!.id }))
  }

  const liquidoEstimado = useMemo(() => {
    return calcLiquido(
      Number(form.base_salary || 0),
      Number(form.transport_allowance || 0),
      Number(form.food_allowance || 0),
      Number(form.other_allowances || 0),
    )
  }, [form.base_salary, form.transport_allowance, form.food_allowance, form.other_allowances])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const full_name = [form.nombres.trim(), form.apellido_paterno.trim(), form.apellido_materno.trim()]
      .filter(Boolean).join(' ')

    const payload = {
      ...form,
      full_name,
      phone: form.phone ? `${form.phone_prefix} ${form.phone}` : '',
      base_salary: form.base_salary ? Number(form.base_salary) : undefined,
      transport_allowance: Number(form.transport_allowance || 0),
      food_allowance: Number(form.food_allowance || 0),
      other_allowances: Number(form.other_allowances || 0),
      health_additional_rate: Number(form.health_additional_rate || 0),
      manager_id: form.manager_id || null,
      user_id: form.user_id || null,
    }

    try {
      const url = mode === 'create' ? '/api/rrhh/employees' : `/api/rrhh/employees/${employeeId}`
      const method = mode === 'create' ? 'POST' : 'PATCH'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Error al guardar'); return }
      router.push('/rrhh/empleados')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/rrhh/empleados" className="rounded-lg p-2 hover:bg-slate-100 transition">
          <ArrowLeft size={18} className="text-slate-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {mode === 'create' ? 'Nuevo empleado' : 'Editar empleado'}
          </h1>
          <p className="text-sm text-slate-500">
            {mode === 'create' ? 'Registrar nuevo trabajador' : 'Modificar datos del trabajador'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ── Datos personales ── */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="font-semibold text-slate-800">Datos personales</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="RUT *">
              <input required value={form.rut} onChange={(e) => set('rut', e.target.value)}
                placeholder="12.345.678-9" className={inputCls} />
            </Field>
            <Field label="Nombres *">
              <input required value={form.nombres} onChange={(e) => set('nombres', e.target.value)}
                placeholder="Ej: Juan Carlos" className={inputCls} />
            </Field>
            <Field label="Apellido paterno *">
              <input required value={form.apellido_paterno} onChange={(e) => set('apellido_paterno', e.target.value)}
                placeholder="Ej: González" className={inputCls} />
            </Field>
            <Field label="Apellido materno">
              <input value={form.apellido_materno} onChange={(e) => set('apellido_materno', e.target.value)}
                placeholder="Ej: Ramírez" className={inputCls} />
            </Field>
            <Field label="Fecha de nacimiento">
              <input type="date" value={form.birth_date} onChange={(e) => set('birth_date', e.target.value)}
                className={inputCls} />
            </Field>
            <Field label="Email">
              <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
                className={inputCls} />
              {/* Detección de usuario existente */}
              {emailMatch?.found && !emailMatch.already_linked_to && (
                <div className="mt-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <UserCheck size={14} className="mt-0.5 flex-shrink-0 text-amber-600" />
                      <div className="text-xs text-amber-800">
                        <p className="font-semibold">Usuario del sistema encontrado</p>
                        <p className="mt-0.5"><strong>{emailMatch.user?.name}</strong> ya tiene login con este email ({ROLE_LABEL_MINI[emailMatch.user?.role ?? ''] ?? emailMatch.user?.role}).</p>
                        <p className="mt-0.5 text-amber-600">Se vinculará automáticamente al guardar — mismo login para ventas y RRHH.</p>
                      </div>
                    </div>
                    {form.user_id !== emailMatch.user?.id && (
                      <button type="button" onClick={linkExistingUser}
                        className="flex-shrink-0 flex items-center gap-1 rounded bg-amber-600 px-2 py-1 text-xs font-semibold text-white hover:bg-amber-700 transition">
                        <Link2 size={11} /> Vincular
                      </button>
                    )}
                    {form.user_id === emailMatch.user?.id && (
                      <span className="flex-shrink-0 text-xs font-semibold text-emerald-700">✓ Vinculado</span>
                    )}
                  </div>
                </div>
              )}
              {emailMatch?.found && emailMatch.already_linked_to && (
                <p className="mt-1 text-xs text-red-600">
                  Este email ya está vinculado al empleado <strong>{emailMatch.already_linked_to.name}</strong>.
                </p>
              )}
              {/* Viene de importar */}
              {fromUserId && (
                <p className="mt-1 text-xs text-emerald-700 font-medium">
                  ✓ Se vinculará al usuario existente del sistema de ventas
                </p>
              )}
            </Field>
            <Field label="Teléfono">
              <div className="flex gap-2">
                <select
                  value={form.phone_prefix}
                  onChange={(e) => set('phone_prefix', e.target.value)}
                  className="w-28 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-sm focus:border-fuchsia-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-fuchsia-400"
                >
                  <option value="+56">🇨🇱 +56</option>
                  <option value="+54">🇦🇷 +54</option>
                  <option value="+51">🇵🇪 +51</option>
                  <option value="+52">🇲🇽 +52</option>
                  <option value="+57">🇨🇴 +57</option>
                  <option value="+55">🇧🇷 +55</option>
                  <option value="+598">🇺🇾 +598</option>
                  <option value="+595">🇵🇾 +595</option>
                  <option value="+591">🇧🇴 +591</option>
                  <option value="+593">🇪🇨 +593</option>
                  <option value="+1">🇺🇸 +1</option>
                  <option value="+34">🇪🇸 +34</option>
                </select>
                <input
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  placeholder="9 1234 5678"
                  className={`${inputCls} flex-1`}
                />
              </div>
            </Field>
            <Field label="Dirección" span2>
              <input value={form.address} onChange={(e) => set('address', e.target.value)}
                className={inputCls} />
            </Field>
          </div>
        </section>

        {/* ── Datos laborales ── */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="font-semibold text-slate-800">Datos laborales</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Cargo *">
              <input required value={form.position} onChange={(e) => set('position', e.target.value)}
                placeholder="Ej: Vendedor, Supervisor" className={inputCls} />
            </Field>
            <Field label="Área / Departamento">
              <input value={form.department} onChange={(e) => set('department', e.target.value)}
                placeholder="Ej: Ventas, Bodega" className={inputCls} />
            </Field>
            <Field label="Fecha de ingreso *">
              <input required type="date" value={form.hire_date} onChange={(e) => set('hire_date', e.target.value)}
                className={inputCls} />
            </Field>
            <Field label="Tipo de contrato">
              <select value={form.contract_type} onChange={(e) => set('contract_type', e.target.value)} className={selectCls}>
                <option value="indefinido">Indefinido</option>
                <option value="plazo_fijo">Plazo fijo</option>
                <option value="honorarios">Honorarios</option>
                <option value="part_time">Part time</option>
              </select>
            </Field>
            <Field label="Jefe directo" span2>
              <select value={form.manager_id} onChange={(e) => set('manager_id', e.target.value)} className={selectCls}>
                <option value="">Sin jefe directo asignado</option>
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>{m.full_name}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-400">El jefe directo podrá aprobar o rechazar solicitudes de este empleado.</p>
            </Field>
          </div>
        </section>

        {/* ── Remuneración ── */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="font-semibold text-slate-800">Remuneración</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Sueldo base bruto (CLP)">
              <MoneyInput value={form.base_salary} onChange={(v) => set('base_salary', v)} placeholder="800.000" />
              <p className="mt-1 text-xs text-slate-400">Monto antes de descuentos legales</p>
            </Field>
            <Field label="Movilización (CLP)">
              <MoneyInput value={form.transport_allowance} onChange={(v) => set('transport_allowance', v)} />
              <p className="mt-1 text-xs text-slate-400">No imponible</p>
            </Field>
            <Field label="Colación (CLP)">
              <MoneyInput value={form.food_allowance} onChange={(v) => set('food_allowance', v)} />
              <p className="mt-1 text-xs text-slate-400">No imponible</p>
            </Field>
            <Field label="Otros beneficios (CLP)">
              <MoneyInput value={form.other_allowances} onChange={(v) => set('other_allowances', v)} />
            </Field>
          </div>

          {/* Card sueldo líquido estimado */}
          {Number(form.base_salary) > 0 && (
            <div className="rounded-xl border border-fuchsia-200 bg-gradient-to-br from-fuchsia-50 to-rose-50 p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-fuchsia-100">
                  <Calculator size={16} className="text-fuchsia-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-fuchsia-700 mb-2">
                    Estimación sueldo líquido
                  </p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-600">
                    <span>Sueldo bruto (imponible)</span>
                    <span className="text-right font-medium">${Number(form.base_salary || 0).toLocaleString('es-CL')}</span>
                    <span>AFP (10%)</span>
                    <span className="text-right text-red-500">-${Math.round(Number(form.base_salary || 0) * 0.10).toLocaleString('es-CL')}</span>
                    <span>Salud (7%)</span>
                    <span className="text-right text-red-500">-${Math.round(Number(form.base_salary || 0) * 0.07).toLocaleString('es-CL')}</span>
                    <span>Seg. cesantía (0.6%)</span>
                    <span className="text-right text-red-500">-${Math.round(Number(form.base_salary || 0) * 0.006).toLocaleString('es-CL')}</span>
                    {Number(form.transport_allowance) > 0 && <>
                      <span>+ Movilización</span>
                      <span className="text-right text-emerald-600">+${Number(form.transport_allowance).toLocaleString('es-CL')}</span>
                    </>}
                    {Number(form.food_allowance) > 0 && <>
                      <span>+ Colación</span>
                      <span className="text-right text-emerald-600">+${Number(form.food_allowance).toLocaleString('es-CL')}</span>
                    </>}
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-fuchsia-200 pt-2">
                    <span className="text-sm font-semibold text-fuchsia-800">Sueldo líquido aprox.</span>
                    <span className="text-lg font-black text-fuchsia-700">
                      ${liquidoEstimado.toLocaleString('es-CL')}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400">Estimación sin impuesto único. El monto real se calcula en la liquidación.</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="AFP">
              <select value={form.afp_institution} onChange={(e) => set('afp_institution', e.target.value)} className={selectCls}>
                <option value="">Seleccionar AFP...</option>
                {AFP_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </Field>
            <Field label="Salud">
              <select value={form.health_institution} onChange={(e) => set('health_institution', e.target.value)} className={selectCls}>
                <option value="">Seleccionar institución...</option>
                {SALUD_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            {form.health_institution && form.health_institution !== 'Fonasa' && (
              <Field label="Tasa adicional Isapre (%)">
                <input type="number" min="0" max="10" step="0.01"
                  value={form.health_additional_rate} onChange={(e) => set('health_additional_rate', e.target.value)}
                  placeholder="0.00" className={inputCls} />
                <p className="mt-1 text-xs text-slate-400">Adicional sobre el 7% base</p>
              </Field>
            )}
          </div>
        </section>

        {/* ── Datos bancarios ── */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="font-semibold text-slate-800">Datos bancarios</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Banco">
              <input value={form.bank_name} onChange={(e) => set('bank_name', e.target.value)}
                placeholder="Ej: Banco de Chile" className={inputCls} />
            </Field>
            <Field label="Tipo de cuenta">
              <select value={form.bank_account_type} onChange={(e) => set('bank_account_type', e.target.value)} className={selectCls}>
                <option value="cuenta_corriente">Cuenta corriente</option>
                <option value="cuenta_vista">Cuenta vista</option>
                <option value="cuenta_rut">Cuenta RUT</option>
              </select>
            </Field>
            <Field label="Número de cuenta">
              <input value={form.bank_account_number} onChange={(e) => set('bank_account_number', e.target.value)}
                className={inputCls} />
            </Field>
          </div>
        </section>

        {/* ── Notas ── */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
          <h2 className="font-semibold text-slate-800">Notas internas</h2>
          <textarea rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)}
            placeholder="Observaciones sobre el empleado..." className={inputCls} />
        </section>

        {/* ── Acceso al sistema (solo en edición) ── */}
        {mode === 'edit' && employeeId && (
          <AccesoSistema
            employeeId={employeeId}
            employeeName={[form.nombres, form.apellido_paterno, form.apellido_materno].filter(Boolean).join(' ')}
            employeePhone={form.phone || null}
            initialUserId={form._initial_user_id ?? null}
          />
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <div className="flex justify-end gap-3 pb-10">
          <Link href="/rrhh/empleados"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
            Cancelar
          </Link>
          <button type="submit" disabled={loading}
            className="rounded-lg bg-fuchsia-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-fuchsia-700 disabled:opacity-50 transition">
            {loading ? 'Guardando...' : mode === 'create' ? 'Guardar empleado' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  )
}
