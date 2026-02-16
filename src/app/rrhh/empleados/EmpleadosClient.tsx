'use client'

import { useEffect, useState } from 'react'
import { Download, Plus, Search, UserCircle2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Employee {
  id: string
  rut: string
  full_name: string
  position: string
  department: string | null
  hire_date: string
  contract_type: string
  status: string
  manager_name: string | null
  current_salary: number | null
}

const STATUS_LABEL: Record<string, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
  terminated: 'Desvinculado',
}
const STATUS_COLOR: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  inactive: 'bg-amber-100 text-amber-700',
  terminated: 'bg-slate-100 text-slate-500',
}
const CONTRACT_LABEL: Record<string, string> = {
  indefinido: 'Indefinido',
  plazo_fijo: 'Plazo fijo',
  honorarios: 'Honorarios',
  part_time: 'Part time',
}

export default function EmpleadosClient() {
  const router = useRouter()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`/api/rrhh/employees?search=${encodeURIComponent(search)}&status=${statusFilter}`)
      const data = await res.json()
      setEmployees(data.employees ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [search, statusFilter])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Empleados</h1>
          <p className="mt-0.5 text-sm text-slate-500">{employees.length} registros</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/rrhh/empleados/importar"
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
            title="Importar usuarios que ya tienen login en el sistema de ventas"
          >
            <Download size={15} />
            <span className="hidden sm:inline">Importar del sistema</span>
          </Link>
          <Link
            href="/rrhh/empleados/nuevo"
            className="flex items-center gap-2 rounded-lg bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-fuchsia-700"
          >
            <Plus size={16} />
            Agregar empleado
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Buscar por nombre, RUT o cargo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-fuchsia-400 focus:outline-none focus:ring-1 focus:ring-fuchsia-400"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-fuchsia-400 focus:outline-none focus:ring-1 focus:ring-fuchsia-400"
        >
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
          <option value="terminated">Desvinculados</option>
          <option value="all">Todos</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-400">Cargando...</div>
        ) : employees.length === 0 ? (
          <div className="p-12 text-center">
            <UserCircle2 size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-sm text-slate-500">No se encontraron empleados</p>
            <Link href="/rrhh/empleados/nuevo" className="mt-3 inline-block text-sm font-medium text-fuchsia-600 hover:underline">
              Agregar el primero
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Empleado</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Cargo / Área</th>
                  <th className="hidden px-4 py-3 text-left font-semibold text-slate-600 md:table-cell">Ingreso</th>
                  <th className="hidden px-4 py-3 text-left font-semibold text-slate-600 lg:table-cell">Contrato</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Sueldo base</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map((emp) => (
                  <tr
                    key={emp.id}
                    onClick={() => router.push(`/rrhh/empleados/${emp.id}`)}
                    className="cursor-pointer hover:bg-fuchsia-50 transition"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-fuchsia-100 text-xs font-bold text-fuchsia-700">
                          {emp.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{emp.full_name}</p>
                          <p className="text-xs text-slate-400">{emp.rut}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-700">{emp.position}</p>
                      {emp.department && <p className="text-xs text-slate-400">{emp.department}</p>}
                    </td>
                    <td className="hidden px-4 py-3 text-slate-500 md:table-cell">
                      {new Date(emp.hire_date).toLocaleDateString('es-CL')}
                    </td>
                    <td className="hidden px-4 py-3 text-slate-500 lg:table-cell">
                      {CONTRACT_LABEL[emp.contract_type] ?? emp.contract_type}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-700">
                      {emp.current_salary
                        ? `$${Number(emp.current_salary).toLocaleString('es-CL')}`
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[emp.status] ?? 'bg-slate-100 text-slate-500'}`}>
                        {STATUS_LABEL[emp.status] ?? emp.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
