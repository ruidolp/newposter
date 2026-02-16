'use client'

import { useEffect, useState } from 'react'
import { Users, CalendarClock, Clock, FileText, TrendingUp, AlertCircle } from 'lucide-react'
import Link from 'next/link'

interface DashboardStats {
  totalEmployees: number
  activeEmployees: number
  pendingRequests: number
  pendingOvertime: number
  draftPayrolls: number
}

export default function RrhhDashboardClient() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [empRes, reqRes, otRes, payRes] = await Promise.all([
          fetch('/api/rrhh/employees?status=active'),
          fetch('/api/rrhh/requests?status=pending'),
          fetch('/api/rrhh/overtime?status=pending'),
          fetch('/api/rrhh/payrolls'),
        ])
        const [empData, reqData, otData, payData] = await Promise.all([
          empRes.json(), reqRes.json(), otRes.json(), payRes.json(),
        ])
        setStats({
          totalEmployees: empData.employees?.length ?? 0,
          activeEmployees: empData.employees?.length ?? 0,
          pendingRequests: reqData.requests?.length ?? 0,
          pendingOvertime: otData.overtime?.length ?? 0,
          draftPayrolls: payData.payrolls?.filter((p: any) => p.status === 'draft').length ?? 0,
        })
      } catch {
        // noop
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const cards = [
    {
      label: 'Empleados activos',
      value: stats?.activeEmployees ?? 0,
      icon: Users,
      href: '/rrhh/empleados',
      color: 'text-fuchsia-600',
      bg: 'bg-fuchsia-50',
    },
    {
      label: 'Solicitudes pendientes',
      value: stats?.pendingRequests ?? 0,
      icon: CalendarClock,
      href: '/rrhh/solicitudes',
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      alert: (stats?.pendingRequests ?? 0) > 0,
    },
    {
      label: 'HHEE por aprobar',
      value: stats?.pendingOvertime ?? 0,
      icon: Clock,
      href: '/rrhh/horas-extra',
      color: 'text-rose-600',
      bg: 'bg-rose-50',
      alert: (stats?.pendingOvertime ?? 0) > 0,
    },
    {
      label: 'Liquidaciones en borrador',
      value: stats?.draftPayrolls ?? 0,
      icon: FileText,
      href: '/rrhh/liquidaciones',
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard RRHH</h1>
        <p className="mt-1 text-sm text-slate-500">Resumen general de gestión de personal</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <Link
              key={card.label}
              href={card.href}
              className="group relative rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-fuchsia-200"
            >
              {card.alert && (
                <span className="absolute right-3 top-3">
                  <AlertCircle size={16} className="text-amber-500" />
                </span>
              )}
              <div className={`inline-flex rounded-lg p-2.5 ${card.bg}`}>
                <Icon size={20} className={card.color} />
              </div>
              <p className="mt-3 text-2xl font-bold text-slate-900">
                {loading ? '—' : card.value}
              </p>
              <p className="mt-0.5 text-sm text-slate-500">{card.label}</p>
            </Link>
          )
        })}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={18} className="text-fuchsia-600" />
          <h2 className="font-semibold text-slate-800">Accesos rápidos</h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { label: 'Agregar empleado', href: '/rrhh/empleados/nuevo', desc: 'Registrar nuevo trabajador' },
            { label: 'Nueva solicitud', href: '/rrhh/solicitudes/nueva', desc: 'Vacaciones o permiso' },
            { label: 'Registrar HHEE', href: '/rrhh/horas-extra/nueva', desc: 'Horas extra del día' },
            { label: 'Generar liquidación', href: '/rrhh/liquidaciones/nueva', desc: 'Liquidación del mes' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg border border-slate-100 bg-slate-50 p-4 transition hover:bg-fuchsia-50 hover:border-fuchsia-200"
            >
              <p className="font-medium text-slate-800 text-sm">{item.label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
