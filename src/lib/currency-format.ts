import currency from 'currency.js'

export interface CurrencyFormatConfig {
  currency_symbol: string
  decimal_separator: '.' | ','
  thousand_separator: '.' | ',' | ' '
  decimal_places: number
}

export const DEFAULT_CURRENCY_FORMAT: CurrencyFormatConfig = {
  currency_symbol: '$',
  decimal_separator: ',',
  thousand_separator: '.',
  decimal_places: 0,
}

function groupThousands(intPart: string, separator: string) {
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, separator)
}

function extractCanonical(value: string, cfg: CurrencyFormatConfig) {
  const decimalSep = cfg.decimal_separator
  const thousandSep = cfg.thousand_separator
  const trailingDecimal = value.endsWith(decimalSep) || value.endsWith('.')

  let raw = value
  const symbol = cfg.currency_symbol || ''
  if (symbol) raw = raw.replaceAll(symbol, '')
  if (thousandSep) raw = raw.replaceAll(thousandSep, '')
  raw = raw.replace(/\s+/g, '')
  if (decimalSep !== '.') raw = raw.replaceAll(decimalSep, '.')

  raw = raw.replace(/[^\d.]/g, '')
  const firstDot = raw.indexOf('.')
  if (firstDot >= 0) {
    raw = raw.slice(0, firstDot + 1) + raw.slice(firstDot + 1).replace(/\./g, '')
  }

  if (raw.startsWith('.')) raw = `0${raw}`
  const [intRaw = '', decRaw = ''] = raw.split('.')
  const intPart = intRaw.replace(/^0+(?=\d)/, '') || (raw ? '0' : '')
  const decimalPart = (cfg.decimal_places > 0 ? decRaw : '').slice(0, Math.max(0, cfg.decimal_places))
  const hasDecimal = cfg.decimal_places > 0 && (raw.includes('.') || trailingDecimal)

  return { intPart, decimalPart, hasDecimal }
}

export function formatMoneyInput(value: string | number | null | undefined, cfg: CurrencyFormatConfig) {
  if (value === null || value === undefined) return ''
  const source = String(value)
  if (!source.trim()) return ''

  const { intPart, decimalPart, hasDecimal } = extractCanonical(source, cfg)
  if (!intPart) return ''

  const groupedInt = groupThousands(intPart, cfg.thousand_separator)
  if (!hasDecimal) return groupedInt
  return `${groupedInt}${cfg.decimal_separator}${decimalPart}`
}

export function parseMoneyInput(value: string | number | null | undefined, cfg: CurrencyFormatConfig) {
  if (value === null || value === undefined) return 0
  const source = String(value)
  if (!source.trim()) return 0

  const { intPart, decimalPart, hasDecimal } = extractCanonical(source, cfg)
  const canonical = hasDecimal ? `${intPart}.${decimalPart}` : intPart
  const parsed = Number(canonical)
  return Number.isNaN(parsed) ? 0 : parsed
}

export function formatMoneyDisplay(value: number, cfg: CurrencyFormatConfig) {
  return currency(value, {
    symbol: cfg.currency_symbol || '$',
    separator: cfg.thousand_separator || '.',
    decimal: cfg.decimal_separator || ',',
    precision: typeof cfg.decimal_places === 'number' ? cfg.decimal_places : 0,
  }).format()
}

export function resolveCurrencyFormat(metadata: Record<string, unknown> | null | undefined): CurrencyFormatConfig {
  const meta = metadata ?? {}
  return {
    currency_symbol: (meta.currency_symbol as string) ?? DEFAULT_CURRENCY_FORMAT.currency_symbol,
    decimal_separator: ((meta.decimal_separator as string) ?? DEFAULT_CURRENCY_FORMAT.decimal_separator) as '.' | ',',
    thousand_separator: ((meta.thousand_separator as string) ?? DEFAULT_CURRENCY_FORMAT.thousand_separator) as '.' | ',' | ' ',
    decimal_places: typeof meta.decimal_places === 'number' ? meta.decimal_places : DEFAULT_CURRENCY_FORMAT.decimal_places,
  }
}
