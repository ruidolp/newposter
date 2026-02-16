// ─────────────────────────────────────────────────────────────
// Módulo RRHH – Tipos TypeScript
// Aislado para futura migración a sistema independiente
// ─────────────────────────────────────────────────────────────

export type ContractType = 'indefinido' | 'plazo_fijo' | 'honorarios' | 'part_time'
export type EmployeeStatus = 'active' | 'inactive' | 'terminated'
export type RequestType = 'vacaciones' | 'permiso_con_goce' | 'permiso_sin_goce' | 'otro'
export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'
export type OvertimeType = 'regular' | 'domingo' | 'festivo'
export type OvertimeStatus = 'pending' | 'approved' | 'rejected' | 'paid'
export type PayrollStatus = 'draft' | 'issued' | 'paid'

export interface RrhhEmployee {
  id: string
  tenant_id: string
  rut: string
  full_name: string
  email: string | null
  phone: string | null
  address: string | null
  birth_date: string | null
  nationality: string | null
  employee_code: string | null
  position: string
  department: string | null
  hire_date: string
  contract_type: ContractType
  status: EmployeeStatus
  manager_id: string | null
  user_id: string | null
  country_code: string
  bank_name: string | null
  bank_account_type: string | null
  bank_account_number: string | null
  notes: string | null
  created_at: Date
  updated_at: Date
}

export interface RrhhContract {
  id: string
  tenant_id: string
  employee_id: string
  contract_type: ContractType
  base_salary: number
  daily_rate: number | null
  hourly_rate: number | null
  currency: string
  start_date: string
  end_date: string | null
  is_current: boolean
  afp_institution: string | null
  health_institution: string | null
  health_additional_rate: number | null
  transport_allowance: number
  food_allowance: number
  other_allowances: number
  notes: string | null
  created_at: Date
}

export interface RrhhVacationBalance {
  id: string
  tenant_id: string
  employee_id: string
  year: number
  days_earned: number
  days_taken: number
  days_carried: number
  days_lost: number
  updated_at: Date
}

export interface RrhhRequest {
  id: string
  tenant_id: string
  employee_id: string
  request_type: RequestType
  start_date: string
  end_date: string
  working_days: number
  reason: string | null
  status: RequestStatus
  reviewed_by_user_id: string | null
  reviewed_at: Date | null
  review_notes: string | null
  created_by_user_id: string | null
  created_at: Date
  updated_at: Date
}

export interface RrhhOvertime {
  id: string
  tenant_id: string
  employee_id: string
  overtime_date: string
  hours: number
  overtime_type: OvertimeType
  multiplier: number
  hourly_rate: number
  amount: number
  status: OvertimeStatus
  description: string | null
  approved_by_user_id: string | null
  approved_at: Date | null
  payroll_id: string | null
  created_by_user_id: string | null
  created_at: Date
}

export interface RrhhPayroll {
  id: string
  tenant_id: string
  employee_id: string
  contract_id: string | null
  period_year: number
  period_month: number
  base_salary: number
  overtime_total: number
  transport_allowance: number
  food_allowance: number
  other_allowances: number
  gross_salary: number
  afp_amount: number
  health_amount: number
  unemployment_amount: number
  tax_amount: number
  other_deductions: number
  total_deductions: number
  net_salary: number
  afp_rate_applied: number | null
  health_rate_applied: number | null
  status: PayrollStatus
  working_days: number
  absent_days: number
  vacation_days_in_period: number
  notes: string | null
  pdf_path: string | null
  issued_at: Date | null
  paid_at: Date | null
  created_by_user_id: string | null
  created_at: Date
  updated_at: Date
}

export interface RrhhCountryConfig {
  id: string
  tenant_id: string
  country_code: string
  vacation_days_per_year: number
  vacation_years_progressive: number
  vacation_extra_day: number
  afp_rate: number
  health_rate: number
  unemployment_rate: number
  unemployment_rate_employer: number
  overtime_regular_multiplier: number
  overtime_special_multiplier: number
  max_overtime_hours_week: number
  uf_value: number | null
  utm_value: number | null
  updated_at: Date
}

// ─── DTOs para crear/editar ────────────────────────────────────

export interface CreateEmployeeDto {
  rut: string
  full_name: string
  email?: string
  phone?: string
  address?: string
  birth_date?: string
  nationality?: string
  employee_code?: string
  position: string
  department?: string
  hire_date: string
  contract_type: ContractType
  manager_id?: string
  user_id?: string
  country_code?: string
  bank_name?: string
  bank_account_type?: string
  bank_account_number?: string
  notes?: string
}

export interface CreateContractDto {
  employee_id: string
  contract_type: ContractType
  base_salary: number
  start_date: string
  end_date?: string
  afp_institution?: string
  health_institution?: string
  health_additional_rate?: number
  transport_allowance?: number
  food_allowance?: number
  other_allowances?: number
  notes?: string
}

export interface CreateRequestDto {
  employee_id: string
  request_type: RequestType
  start_date: string
  end_date: string
  reason?: string
}

export interface CreateOvertimeDto {
  employee_id: string
  overtime_date: string
  hours: number
  overtime_type: OvertimeType
  description?: string
}

// ─── Vistas enriquecidas (joins) ──────────────────────────────

export interface EmployeeWithManager extends RrhhEmployee {
  manager_name: string | null
  current_salary: number | null
  vacation_balance: number | null
}

export interface RequestWithEmployee extends RrhhRequest {
  employee_name: string
  employee_rut: string
  reviewer_name: string | null
}

export interface OvertimeWithEmployee extends RrhhOvertime {
  employee_name: string
}

export interface PayrollWithEmployee extends RrhhPayroll {
  employee_name: string
  employee_rut: string
}
