// ─────────────────────────────────────────────────────────────
// Parámetros legales Chile (CL)
// Para agregar un nuevo país: crear ar.ts, pe.ts, etc.
// con la misma interfaz CountryConfig
// ─────────────────────────────────────────────────────────────

export interface CountryConfig {
  code: string
  name: string
  currency: string
  vacationDaysPerYear: number          // días hábiles/año base
  vacationYearsForExtra: number        // años de antigüedad para día adicional
  vacationExtraDays: number            // días extra por antigüedad
  afpRate: number                      // % cotización AFP (trabajador)
  healthRate: number                   // % cotización salud base
  unemploymentRateEmployee: number     // % seguro cesantía trabajador
  unemploymentRateEmployer: number     // % seguro cesantía empleador
  overtimeRegularMultiplier: number    // factor HHEE normal
  overtimeSpecialMultiplier: number    // factor HHEE domingo/festivo
  maxOvertimeHoursPerWeek: number
  // Tramos impuesto único 2da categoría (UTM) - vigentes a Enero 2025
  taxBrackets: TaxBracket[]
}

export interface TaxBracket {
  fromUtm: number       // desde (UTM)
  toUtm: number | null  // hasta (null = sin límite)
  rate: number          // tasa porcentaje
  deductionUtm: number  // factor de rebaja en UTM
}

export const CL_CONFIG: CountryConfig = {
  code: 'CL',
  name: 'Chile',
  currency: 'CLP',
  vacationDaysPerYear: 15,
  vacationYearsForExtra: 10,
  vacationExtraDays: 1,
  afpRate: 10.00,
  healthRate: 7.00,
  unemploymentRateEmployee: 0.60,
  unemploymentRateEmployer: 2.40,
  overtimeRegularMultiplier: 1.50,
  overtimeSpecialMultiplier: 2.00,
  maxOvertimeHoursPerWeek: 10,
  // Tabla vigente 2025 - actualizar anualmente según SII
  taxBrackets: [
    { fromUtm: 0,    toUtm: 13.5,  rate: 0,     deductionUtm: 0 },
    { fromUtm: 13.5, toUtm: 30,    rate: 0.04,  deductionUtm: 0.540 },
    { fromUtm: 30,   toUtm: 50,    rate: 0.08,  deductionUtm: 1.740 },
    { fromUtm: 50,   toUtm: 70,    rate: 0.135, deductionUtm: 4.490 },
    { fromUtm: 70,   toUtm: 90,    rate: 0.23,  deductionUtm: 11.140 },
    { fromUtm: 90,   toUtm: 120,   rate: 0.304, deductionUtm: 17.794 },
    { fromUtm: 120,  toUtm: 310,   rate: 0.355, deductionUtm: 23.914 },
    { fromUtm: 310,  toUtm: null,  rate: 0.40,  deductionUtm: 37.864 },
  ],
}
