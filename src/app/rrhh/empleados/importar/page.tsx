'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Download, UserCircle2 } from 'lucide-react'
import Link from 'next/link'

interface SystemUser {
  id: string
  name: string
  email: string
  role: string
  active: boolean
  created_at: string
}

const ROLE_LABEL: Record<string, string> = {
  OWNER: 'Propietario',
  ADMIN: 'Administrador',
  EMPLOYEE: 'Empleado',
  CASHIER: 'Cajero',
  STAFF: 'Staff',
}
const ROLE_COLOR: Record<string, string> = {
  OWNER: 'bg-rose-100 text-rose-700',
  ADMIN: 'bg-fuchsia-100 text-fuchsia-700',
  EMPLOYEE: 'bg-blue-100 text-blue-700',
  CASHIER: 'bg-amber-100 text-amber-700',
  STAFF: 'bg-slate-100 text-slate-600',
}

export default function ImportarUsuariosPage() {
  const router = useRouter()
  const [users, setUsers] = useState<SystemUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/rrhh/users-without-profile')
      .then((r) => r.json())
      .then((d) => setUsers(d.users ?? []))
      .finally(() => setLoading(false))
  }, [])

  function handleImport(user: SystemUser) {
    // Redirige al formulario de nuevo empleado con datos del user como query params
    const params = new URLSearchParams({
      from_user_id: user.id,
      email: user.email,
      full_name: user.name,
    })
    router.push(`/rrhh/empleados/nuevo?${params.toString()}`)
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/rrhh/empleados" className="rounded-lg p-2 hover:bg-slate-100 transition">
          <ArrowLeft size={18} className="text-slate-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Importar desde sistema de ventas</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Usuarios con login existente que aún no tienen perfil de empleado en RRHH
          </p>
        </div>
      </div>

      {/* Explicación */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-4 text-sm text-blue-800">
        <p className="font-semibold mb-1">¿Para qué sirve esto?</p>
        <p className="text-blue-700">
          Si un vendedor o administrador ya tiene acceso al sistema de ventas y quieres gestionarle
          vacaciones, liquidaciones y permisos en RRHH, aquí puedes crear su ficha de empleado
          vinculada a su cuenta existente. <strong>No se crea un login nuevo</strong> — usa el mismo que ya tiene.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-400">Cargando...</div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center">
            <UserCircle2 size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-sm font-medium text-slate-600">Todos los usuarios del sistema ya tienen perfil RRHH</p>
            <p className="mt-1 text-xs text-slate-400">
              Puedes crear nuevos empleados directamente desde{' '}
              <Link href="/rrhh/empleados/nuevo" className="text-fuchsia-600 hover:underline">
                Agregar empleado
              </Link>
            </p>
          </div>
        ) : (
          <>
            <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {users.length} usuario{users.length !== 1 ? 's' : ''} disponible{users.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="divide-y divide-slate-100">
              {users.map((user) => (
                <div key={user.id} className="flex items-center justify-between gap-4 px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">{user.name}</p>
                      <p className="text-xs text-slate-400">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`hidden rounded-full px-2.5 py-0.5 text-xs font-medium sm:inline-flex ${ROLE_COLOR[user.role] ?? 'bg-slate-100 text-slate-500'}`}>
                      {ROLE_LABEL[user.role] ?? user.role}
                    </span>
                    <button
                      onClick={() => handleImport(user)}
                      className="flex items-center gap-1.5 rounded-lg bg-fuchsia-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-fuchsia-700 transition"
                    >
                      <Download size={13} />
                      Crear ficha
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
