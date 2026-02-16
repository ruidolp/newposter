// ─────────────────────────────────────────────────────────────
// Cálculo de liquidaciones de sueldo
// Parametrizado por país via CountryConfig
// ─────────────────────────────────────────────────────────────

import type { CountryConfig } from './countries/cl'

export interface PayrollInput {
  baseSalary: number
  overtimeTotal: number
  transportAllowance: number
  foodAllowance: number
  otherAllowances: number
  absentDays: number               // días de inasistencia (descuentan)
  workingDaysInMonth: number       // días hábiles del mes
  // Tasas específicas del contrato (override de config país)
  afpRateOverride?: number
  healthRateOverride?: number
  healthAdditionalRate?: number    // adicional Isapre
  otherDeductions?: number
  // Para impuesto único
  utmValue?: number                // valor UTM del mes
}

export interface PayrollResult {
  // Haberes
  baseSalary: number
  proportionalBase: number         // base ajustada por ausencias
  overtimeTotal: number
  transportAllowance: number
  foodAllowance: number
  otherAllowances: number
  grossSalary: number              // total imponible
  // Descuentos
  afpAmount: number
  afpRate: number
  healthAmount: number
  healthRate: number
  unemploymentAmount: number
  taxAmount: number
  otherDeductions: number
  totalDeductions: number
  // Neto
  netSalary: number
}

/**
 * Calcula una liquidación de sueldo completa.
 * Implementa la lógica chilena; al agregar países,
 * el mismo input + config del país producirá el resultado correcto.
 */
export function calculatePayroll(
  input: PayrollInput,
  config: CountryConfig,
  utmValue?: number
): PayrollResult {
  const {
    baseSalary,
    overtimeTotal,
    transportAllowance,
    foodAllowance,
    otherAllowances,
    absentDays,
    workingDaysInMonth,
    afpRateOverride,
    healthRateOverride,
    healthAdditionalRate = 0,
    otherDeductions = 0,
  } = input

  // Sueldo proporcional si hay ausencias
  const dailyRate = baseSalary / workingDaysInMonth
  const proportionalBase = absentDays > 0
    ? baseSalary - dailyRate * absentDays
    : baseSalary

  // Base imponible (incluye HHEE, excluye algunos no imponibles según ley)
  const taxableBase = proportionalBase + overtimeTotal

  // Cotizaciones (sobre base imponible)
  const afpRate = afpRateOverride ?? config.afpRate
  const healthRate = (healthRateOverride ?? config.healthRate) + healthAdditionalRate
  const unemploymentRate = config.unemploymentRateEmployee

  const afpAmount = roundCLP(taxableBase * afpRate / 100)
  const healthAmount = roundCLP(taxableBase * healthRate / 100)
  const unemploymentAmount = roundCLP(taxableBase * unemploymentRate / 100)

  // Sueldo imponible para impuesto único (base - AFP - Salud)
  const taxableIncome = taxableBase - afpAmount - healthAmount - unemploymentAmount

  // Impuesto único 2da categoría
  const utm = utmValue ?? 67294 // UTM referencial - en producción se pasa el valor real
  const taxAmount = calculateTax(taxableIncome, utm, config)

  // Total haberes (se suman colaciones/movilización que no siempre son imponibles)
  const grossSalary = proportionalBase + overtimeTotal + transportAllowance + foodAllowance + otherAllowances

  const totalDeductions = afpAmount + healthAmount + unemploymentAmount + taxAmount + otherDeductions
  const netSalary = grossSalary - totalDeductions

  return {
    baseSalary,
    proportionalBase,
    overtimeTotal,
    transportAllowance,
    foodAllowance,
    otherAllowances,
    grossSalary,
    afpAmount,
    afpRate,
    healthAmount,
    healthRate,
    unemploymentAmount,
    taxAmount,
    otherDeductions,
    totalDeductions,
    netSalary: Math.max(0, netSalary),
  }
}

/**
 * Calcula impuesto único de 2da categoría usando tabla de tramos en UTM.
 */
function calculateTax(
  taxableIncome: number,
  utmValue: number,
  config: CountryConfig
): number {
  if (!config.taxBrackets || utmValue <= 0) return 0

  const incomeInUtm = taxableIncome / utmValue

  for (const bracket of config.taxBrackets) {
    const isInBracket =
      incomeInUtm >= bracket.fromUtm &&
      (bracket.toUtm === null || incomeInUtm < bracket.toUtm)

    if (isInBracket) {
      if (bracket.rate === 0) return 0
      const tax = taxableIncome * bracket.rate - bracket.deductionUtm * utmValue
      return roundCLP(Math.max(0, tax))
    }
  }
  return 0
}

export function calcOvertimeAmount(
  hours: number,
  hourlyRate: number,
  type: 'regular' | 'domingo' | 'festivo',
  config: CountryConfig
): number {
  const multiplier = type === 'regular'
    ? config.overtimeRegularMultiplier
    : config.overtimeSpecialMultiplier
  return roundCLP(hours * hourlyRate * multiplier)
}

/**
 * Calcula valor hora desde sueldo mensual.
 * En Chile: sueldo / (días mes * horas jornada)
 */
export function calcHourlyRate(
  monthlySalary: number,
  hoursPerDay: number = 8,
  workingDays: number = 26
): number {
  return roundCLP(monthlySalary / (workingDays * hoursPerDay))
}

function roundCLP(value: number): number {
  return Math.round(value)
}
