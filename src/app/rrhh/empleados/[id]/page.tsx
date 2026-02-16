'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import EmpleadoForm, { type EmpleadoFormData } from '../EmpleadoForm'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

function splitFullName(fullName: string): { nombres: string; apellido_paterno: string; apellido_materno: string } {
  const parts = (fullName ?? '').trim().split(/\s+/)
  if (parts.length === 1) return { nombres: parts[0], apellido_paterno: '', apellido_materno: '' }
  if (parts.length === 2) return { nombres: parts[0], apellido_paterno: parts[1], apellido_materno: '' }
  // Asume: primer token = nombres, penúltimo = ap. paterno, último = ap. materno
  const apellido_materno = parts[parts.length - 1]
  const apellido_paterno = parts[parts.length - 2]
  const nombres = parts.slice(0, parts.length - 2).join(' ')
  return { nombres, apellido_paterno, apellido_materno }
}

export default function EditarEmpleadoPage() {
  const { id } = useParams<{ id: string }>()
  const [initialData, setInitialData] = useState<Partial<EmpleadoFormData> | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/rrhh/employees/${id}`)
        if (!res.ok) { setError('Empleado no encontrado'); return }
        const { employee, contracts } = await res.json()
        const contract = contracts?.find((c: any) => c.is_current) ?? contracts?.[0]
        const nameParts = splitFullName(employee.full_name)

        setInitialData({
          rut: employee.rut ?? '',
          nombres: nameParts.nombres,
          apellido_paterno: nameParts.apellido_paterno,
          apellido_materno: nameParts.apellido_materno,
          email: employee.email ?? '',
          phone: employee.phone ?? '',
          address: employee.address ?? '',
          birth_date: employee.birth_date ? employee.birth_date.split('T')[0] : '',
          nationality: employee.nationality ?? 'Chilena',
          employee_code: employee.employee_code ?? '',
          position: employee.position ?? '',
          department: employee.department ?? '',
          hire_date: employee.hire_date ? employee.hire_date.split('T')[0] : '',
          contract_type: employee.contract_type ?? 'indefinido',
          manager_id: employee.manager_id ?? '',
          user_id: employee.user_id ?? '',
          country_code: employee.country_code ?? 'CL',
          bank_name: employee.bank_name ?? '',
          bank_account_type: employee.bank_account_type ?? 'cuenta_corriente',
          bank_account_number: employee.bank_account_number ?? '',
          notes: employee.notes ?? '',
          _initial_user_id: employee.user_id ?? null,
          base_salary: contract?.base_salary ? String(contract.base_salary) : '',
          transport_allowance: contract?.transport_allowance ? String(contract.transport_allowance) : '',
          food_allowance: contract?.food_allowance ? String(contract.food_allowance) : '',
          other_allowances: contract?.other_allowances ? String(contract.other_allowances) : '',
          afp_institution: contract?.afp_institution ?? '',
          health_institution: contract?.health_institution ?? '',
          health_additional_rate: contract?.health_additional_rate ? String(contract.health_additional_rate) : '',
        })
      } catch {
        setError('Error al cargar el empleado')
      }
    }
    load()
  }, [id])

  if (error) {
    return (
      <div className="space-y-4">
        <Link href="/rrhh/empleados" className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft size={16} /> Volver
        </Link>
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      </div>
    )
  }

  if (!initialData) {
    return <div className="p-12 text-center text-sm text-slate-400">Cargando...</div>
  }

  return <EmpleadoForm mode="edit" employeeId={id} initialData={initialData} />
}
