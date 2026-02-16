'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, Printer } from 'lucide-react'
import Link from 'next/link'

interface PayrollDetail {
  id: string
  employee_name: string
  employee_rut: string
  employee_position: string
  period_year: number
  period_month: number
  base_salary: number
  overtime_total: number
  transport_allowance: number
  food_allowance: number
  other_allowances: number
  gross_salary: number
  afp_amount: number
  afp_rate_applied: number
  health_amount: number
  health_rate_applied: number
  unemployment_amount: number
  tax_amount: number
  other_deductions: number
  total_deductions: number
  net_salary: number
  working_days: number
  absent_days: number
  vacation_days_in_period: number
  status: string
  afp_institution: string | null
  health_institution: string | null
  notes: string | null
}

const MONTHS = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

function fmt(n: number) {
  return `$${Math.round(n).toLocaleString('es-CL')}`
}

export default function LiquidacionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [payroll, setPayroll] = useState<PayrollDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/rrhh/payrolls/${id}`)
      .then((r) => r.json())
      .then(setPayroll)
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="p-12 text-center text-sm text-slate-400">Cargando...</div>
  if (!payroll) return <div className="p-12 text-center text-sm text-red-500">Liquidación no encontrada</div>

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/rrhh/liquidaciones" className="rounded-lg p-2 hover:bg-slate-100 transition">
            <ArrowLeft size={18} className="text-slate-500" />
          </Link>
          <h1 className="text-xl font-bold text-slate-900">
            Liquidación — {MONTHS[payroll.period_month]} {payroll.period_year}
          </h1>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
        >
          <Printer size={15} />
          Imprimir
        </button>
      </div>

      {/* Encabezado empleado */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><span className="text-slate-500">Trabajador:</span> <span className="font-semibold text-slate-800">{payroll.employee_name}</span></div>
          <div><span className="text-slate-500">RUT:</span> <span className="font-medium">{payroll.employee_rut}</span></div>
          <div><span className="text-slate-500">Cargo:</span> <span className="font-medium">{payroll.employee_position}</span></div>
          <div><span className="text-slate-500">Período:</span> <span className="font-medium">{MONTHS[payroll.period_month]} {payroll.period_year}</span></div>
          <div><span className="text-slate-500">Días trabajados:</span> <span className="font-medium">{payroll.working_days}</span></div>
          {payroll.absent_days > 0 && (
            <div><span className="text-slate-500">Días ausente:</span> <span className="font-medium text-amber-600">{payroll.absent_days}</span></div>
          )}
          {payroll.afp_institution && (
            <div><span className="text-slate-500">AFP:</span> <span className="font-medium">{payroll.afp_institution}</span></div>
          )}
          {payroll.health_institution && (
            <div><span className="text-slate-500">Salud:</span> <span className="font-medium">{payroll.health_institution}</span></div>
          )}
        </div>
      </div>

      {/* Haberes */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Haberes</p>
        </div>
        <div className="divide-y divide-slate-100 text-sm">
          <Row label="Sueldo base" value={fmt(payroll.base_salary)} />
          {payroll.overtime_total > 0 && <Row label="Horas extra" value={fmt(payroll.overtime_total)} />}
          {payroll.transport_allowance > 0 && <Row label="Movilización" value={fmt(payroll.transport_allowance)} />}
          {payroll.food_allowance > 0 && <Row label="Colación" value={fmt(payroll.food_allowance)} />}
          {payroll.other_allowances > 0 && <Row label="Otros haberes" value={fmt(payroll.other_allowances)} />}
          <Row label="Total haberes" value={fmt(payroll.gross_salary)} bold />
        </div>
      </div>

      {/* Descuentos */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Descuentos legales</p>
        </div>
        <div className="divide-y divide-slate-100 text-sm">
          <Row label={`AFP (${payroll.afp_rate_applied}%)`} value={fmt(payroll.afp_amount)} negative />
          <Row label={`Salud (${payroll.health_rate_applied}%)`} value={fmt(payroll.health_amount)} negative />
          <Row label="Seguro cesantía (0.6%)" value={fmt(payroll.unemployment_amount)} negative />
          {payroll.tax_amount > 0 && <Row label="Impuesto único 2ª categoría" value={fmt(payroll.tax_amount)} negative />}
          {payroll.other_deductions > 0 && <Row label="Otros descuentos" value={fmt(payroll.other_deductions)} negative />}
          <Row label="Total descuentos" value={fmt(payroll.total_deductions)} bold negative />
        </div>
      </div>

      {/* Neto */}
      <div className="rounded-xl border-2 border-fuchsia-200 bg-fuchsia-50 p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-fuchsia-700 uppercase tracking-wide">Sueldo líquido</p>
          <p className="text-2xl font-black text-fuchsia-700">{fmt(payroll.net_salary)}</p>
        </div>
      </div>

      {payroll.notes && (
        <p className="text-sm text-slate-500 italic">Nota: {payroll.notes}</p>
      )}
    </div>
  )
}

function Row({ label, value, bold, negative }: { label: string; value: string; bold?: boolean; negative?: boolean }) {
  return (
    <div className={`flex justify-between px-5 py-2.5 ${bold ? 'bg-slate-50' : ''}`}>
      <span className={`text-slate-600 ${bold ? 'font-semibold' : ''}`}>{label}</span>
      <span className={`tabular-nums ${bold ? 'font-bold text-slate-900' : negative ? 'text-red-600' : 'text-slate-800'}`}>
        {negative ? '-' : ''}{value}
      </span>
    </div>
  )
}
