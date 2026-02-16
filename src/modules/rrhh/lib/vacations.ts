// ─────────────────────────────────────────────────────────────
// Cálculo de vacaciones
// Implementa ley chilena: 15 días hábiles/año, progresivas a los 10 años
// ─────────────────────────────────────────────────────────────

import type { CountryConfig } from './countries/cl'

/**
 * Calcula días hábiles de vacaciones acumulados según antigüedad.
 * No cuenta sábados, domingos ni feriados.
 */
export function calcVacationDaysEarned(
  hireDateStr: string,
  asOfDateStr: string,
  config: CountryConfig
): number {
  const hireDate = new Date(hireDateStr)
  const asOf = new Date(asOfDateStr)

  const monthsWorked = monthsDiff(hireDate, asOf)
  if (monthsWorked < 12) {
    // Proporcional al primer año
    return Math.floor((config.vacationDaysPerYear / 12) * monthsWorked * 100) / 100
  }

  const yearsWorked = Math.floor(monthsWorked / 12)
  let baseDays = config.vacationDaysPerYear

  // Días progresivos: +1 día por cada año adicional a partir del año 10
  if (yearsWorked >= config.vacationYearsForExtra) {
    baseDays += (yearsWorked - config.vacationYearsForExtra + 1) * config.vacationExtraDays
  }

  // Proporcional a los meses del año en curso
  const completedYears = Math.floor(monthsWorked / 12)
  const extraMonths = monthsWorked - completedYears * 12
  const proportionalExtra = Math.floor((baseDays / 12) * extraMonths * 100) / 100

  return completedYears * baseDays + proportionalExtra
}

/**
 * Cuenta días hábiles entre dos fechas (excluye sábados y domingos).
 * Para excluir feriados, pasar lista de fechas en formato YYYY-MM-DD.
 */
export function countWorkingDays(
  startDateStr: string,
  endDateStr: string,
  holidays: string[] = []
): number {
  const start = new Date(startDateStr)
  const end = new Date(endDateStr)
  const holidaySet = new Set(holidays)

  let count = 0
  const current = new Date(start)
  while (current <= end) {
    const day = current.getDay()
    const dateStr = current.toISOString().split('T')[0]
    if (day !== 0 && day !== 6 && !holidaySet.has(dateStr)) {
      count++
    }
    current.setDate(current.getDate() + 1)
  }
  return count
}

/**
 * Calcula saldo disponible de vacaciones.
 * earned - taken - (days being requested)
 */
export function calcAvailableBalance(
  earned: number,
  taken: number,
  carried: number,
  requestingDays: number = 0
): { available: number; afterRequest: number; canTake: boolean } {
  const available = earned + carried - taken
  const afterRequest = available - requestingDays
  return {
    available: Math.max(0, available),
    afterRequest,
    canTake: afterRequest >= 0,
  }
}

// ─── Helpers ──────────────────────────────────────────────────

function monthsDiff(from: Date, to: Date): number {
  return (
    (to.getFullYear() - from.getFullYear()) * 12 +
    (to.getMonth() - from.getMonth())
  )
}
