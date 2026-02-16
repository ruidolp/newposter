'use client'

import { useCallback, useEffect, useState } from 'react'
import currency from 'currency.js'
import {
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Globe,
  RefreshCw,
  Save,
  Store,
  ShoppingCart,
} from 'lucide-react'

interface CurrencyFormat {
  country: string
  currency_symbol: string
  decimal_separator: '.' | ','
  thousand_separator: '.' | ',' | ' '
  decimal_places: number
}

interface Settings {
  store_name: string
  language: string
  currency: string
  timezone: string
  currency_format: CurrencyFormat
  print_ticket: boolean
}

const COUNTRIES = [
  { code: 'CL', name: 'Chile' },
  { code: 'AR', name: 'Argentina' },
  { code: 'MX', name: 'México' },
  { code: 'CO', name: 'Colombia' },
  { code: 'PE', name: 'Perú' },
  { code: 'UY', name: 'Uruguay' },
  { code: 'VE', name: 'Venezuela' },
  { code: 'EC', name: 'Ecuador' },
  { code: 'BO', name: 'Bolivia' },
  { code: 'PY', name: 'Paraguay' },
  { code: 'CR', name: 'Costa Rica' },
  { code: 'GT', name: 'Guatemala' },
  { code: 'DO', name: 'República Dominicana' },
  { code: 'US', name: 'Estados Unidos' },
  { code: 'ES', name: 'España' },
]

const LANGUAGES = [
  { code: 'es', name: 'Español' },
  { code: 'en', name: 'English' },
  { code: 'pt', name: 'Português' },
  { code: 'fr', name: 'Français' },
]

const CURRENCIES = [
  { code: 'CLP', name: 'Peso Chileno', symbol: '$' },
  { code: 'ARS', name: 'Peso Argentino', symbol: '$' },
  { code: 'MXN', name: 'Peso Mexicano', symbol: '$' },
  { code: 'COP', name: 'Peso Colombiano', symbol: '$' },
  { code: 'PEN', name: 'Sol Peruano', symbol: 'S/' },
  { code: 'UYU', name: 'Peso Uruguayo', symbol: '$U' },
  { code: 'USD', name: 'Dólar Estadounidense', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'BRL', name: 'Real Brasileño', symbol: 'R$' },
  { code: 'BOB', name: 'Boliviano', symbol: 'Bs.' },
  { code: 'PYG', name: 'Guaraní Paraguayo', symbol: '₲' },
  { code: 'GBP', name: 'Libra Esterlina', symbol: '£' },
]

const TIMEZONES = [
  { value: 'America/Santiago', label: 'Santiago (GMT-3/GMT-4)' },
  { value: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires (GMT-3)' },
  { value: 'America/Mexico_City', label: 'Ciudad de México (GMT-6/GMT-5)' },
  { value: 'America/Bogota', label: 'Bogotá (GMT-5)' },
  { value: 'America/Lima', label: 'Lima (GMT-5)' },
  { value: 'America/Montevideo', label: 'Montevideo (GMT-3)' },
  { value: 'America/Caracas', label: 'Caracas (GMT-4)' },
  { value: 'America/Guayaquil', label: 'Guayaquil (GMT-5)' },
  { value: 'America/La_Paz', label: 'La Paz (GMT-4)' },
  { value: 'America/Asuncion', label: 'Asunción (GMT-4/GMT-3)' },
  { value: 'America/New_York', label: 'Nueva York (GMT-5/GMT-4)' },
  { value: 'America/Los_Angeles', label: 'Los Ángeles (GMT-8/GMT-7)' },
  { value: 'Europe/Madrid', label: 'Madrid (GMT+1/GMT+2)' },
  { value: 'Europe/London', label: 'Londres (GMT+0/GMT+1)' },
  { value: 'UTC', label: 'UTC (GMT+0)' },
]

const DEFAULT_SETTINGS: Settings = {
  store_name: '',
  language: 'es',
  currency: 'CLP',
  timezone: 'America/Santiago',
  print_ticket: false,
  currency_format: {
    country: 'CL',
    currency_symbol: '$',
    decimal_separator: ',',
    thousand_separator: '.',
    decimal_places: 0,
  },
}

function Field({
  id,
  label,
  children,
}: {
  id: string
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </label>
      {children}
    </div>
  )
}

function Select({
  id,
  value,
  onChange,
  options,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <select
      id={id}
      name={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <header className="mb-4 flex items-center gap-2 border-b border-slate-200 pb-3">
        <Icon size={16} className="text-fuchsia-600" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      </header>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>
    </section>
  )
}

function CurrencyPreview({ fmt }: { fmt: CurrencyFormat }) {
  const samples = [1234567.89, 9999, 0.5, 1000000]
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Vista previa</p>
      <div className="flex flex-wrap gap-2">
        {samples.map((val) => (
          <span
            key={val}
            className="rounded-md border border-fuchsia-200 bg-fuchsia-50 px-2.5 py-1 font-mono text-sm font-semibold text-fuchsia-700"
          >
            {currency(val, {
              symbol: fmt.currency_symbol,
              separator: fmt.thousand_separator,
              decimal: fmt.decimal_separator,
              precision: fmt.decimal_places,
            }).format()}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function ConfiguracionPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  function showToast(type: 'success' | 'error', msg: string) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3500)
  }

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/settings')
      if (!res.ok) throw new Error()
      const data = await res.json()
      const meta = (data.settings?.metadata ?? {}) as Record<string, unknown>
      setSettings({
        store_name: data.tenant?.name ?? '',
        language: data.settings?.language ?? 'es',
        currency: data.settings?.currency ?? 'CLP',
        timezone: data.settings?.timezone ?? 'America/Santiago',
        print_ticket: meta.print_ticket === true,
        currency_format: {
          country: (meta.country as string) ?? 'CL',
          currency_symbol: (meta.currency_symbol as string) ?? '$',
          decimal_separator: ((meta.decimal_separator as string) ?? ',') as '.' | ',',
          thousand_separator: ((meta.thousand_separator as string) ?? '.') as '.' | ',' | ' ',
          decimal_places: typeof meta.decimal_places === 'number' ? meta.decimal_places : 0,
        },
      })
    } catch {
      showToast('error', 'No se pudo cargar la configuración')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function setFmt(key: keyof CurrencyFormat, val: string | number) {
    setSettings((s) => ({ ...s, currency_format: { ...s.currency_format, [key]: val } }))
  }

  function handleCurrencyChange(code: string) {
    const found = CURRENCIES.find((c) => c.code === code)
    setSettings((s) => ({
      ...s,
      currency: code,
      currency_format: {
        ...s.currency_format,
        currency_symbol: found?.symbol ?? s.currency_format.currency_symbol,
      },
    }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_name: settings.store_name,
          language: settings.language,
          currency: settings.currency,
          timezone: settings.timezone,
          print_ticket: settings.print_ticket,
          country: settings.currency_format.country,
          currency_symbol: settings.currency_format.currency_symbol,
          decimal_separator: settings.currency_format.decimal_separator,
          thousand_separator: settings.currency_format.thousand_separator,
          decimal_places: settings.currency_format.decimal_places,
        }),
      })
      if (!res.ok) throw new Error()
      showToast('success', 'Configuración guardada correctamente')
    } catch {
      showToast('error', 'Error al guardar configuración')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-5">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 [text-wrap:balance]">Configuración</h1>
          <p className="mt-1 text-sm text-slate-500">Personaliza tu tienda: nombre, región, moneda y formato</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Recargar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="inline-flex items-center gap-2 rounded-md bg-fuchsia-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-fuchsia-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400 focus-visible:ring-offset-2 disabled:opacity-50"
          >
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Guardando…' : 'Guardar Cambios'}
          </button>
        </div>
      </header>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
            toast.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
          {toast.msg}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-16 text-center text-sm text-slate-500">
          <RefreshCw size={16} className="mx-auto mb-2 animate-spin" />
          Cargando configuración…
        </div>
      ) : (
        <>
          <Section icon={Store} title="Tienda">
            <Field id="store_name" label="Nombre de la tienda">
              <input
                id="store_name"
                name="store_name"
                value={settings.store_name}
                onChange={(e) => setSettings((s) => ({ ...s, store_name: e.target.value }))}
                className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200"
                placeholder="Ej: Mi Tienda…"
                autoComplete="off"
              />
            </Field>
            <Field id="country" label="País">
              <Select
                id="country"
                value={settings.currency_format.country}
                onChange={(v) => setFmt('country', v)}
                options={COUNTRIES.map((c) => ({ value: c.code, label: c.name }))}
              />
            </Field>
          </Section>

          <Section icon={Globe} title="Idioma y región">
            <Field id="language" label="Idioma">
              <Select
                id="language"
                value={settings.language}
                onChange={(v) => setSettings((s) => ({ ...s, language: v }))}
                options={LANGUAGES.map((l) => ({ value: l.code, label: l.name }))}
              />
            </Field>
            <Field id="timezone" label="Zona horaria">
              <Select
                id="timezone"
                value={settings.timezone}
                onChange={(v) => setSettings((s) => ({ ...s, timezone: v }))}
                options={TIMEZONES.map((t) => ({ value: t.value, label: t.label }))}
              />
            </Field>
          </Section>

          <Section icon={ShoppingCart} title="Punto de Venta (POS)">
            <div className="md:col-span-2 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-800">Imprimir ticket al finalizar venta</p>
                <p className="mt-0.5 text-xs text-slate-500">Muestra el botón "Imprimir" en la pantalla de confirmación</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.print_ticket}
                onClick={() => setSettings((s) => ({ ...s, print_ticket: !s.print_ticket }))}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500 focus-visible:ring-offset-2 ${
                  settings.print_ticket ? 'bg-fuchsia-600' : 'bg-slate-200'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                    settings.print_ticket ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </Section>

          <Section icon={DollarSign} title="Moneda">
            <Field id="currency" label="Moneda">
              <Select
                id="currency"
                value={settings.currency}
                onChange={handleCurrencyChange}
                options={CURRENCIES.map((c) => ({ value: c.code, label: `${c.code} — ${c.name}` }))}
              />
            </Field>
            <Field id="currency_symbol" label="Símbolo">
              <input
                id="currency_symbol"
                name="currency_symbol"
                value={settings.currency_format.currency_symbol}
                onChange={(e) => setFmt('currency_symbol', e.target.value)}
                className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200"
                placeholder="$…"
                autoComplete="off"
              />
            </Field>
            <Field id="decimal_separator" label="Separador decimal">
              <Select
                id="decimal_separator"
                value={settings.currency_format.decimal_separator}
                onChange={(v) => setFmt('decimal_separator', v as '.' | ',')}
                options={[
                  { value: ',', label: 'Coma (,)' },
                  { value: '.', label: 'Punto (.)' },
                ]}
              />
            </Field>
            <Field id="thousand_separator" label="Separador de miles">
              <Select
                id="thousand_separator"
                value={settings.currency_format.thousand_separator}
                onChange={(v) => setFmt('thousand_separator', v as '.' | ',' | ' ')}
                options={[
                  { value: '.', label: 'Punto (.)' },
                  { value: ',', label: 'Coma (,)' },
                  { value: ' ', label: 'Espacio' },
                ]}
              />
            </Field>
            <Field id="decimal_places" label="Cantidad de decimales">
              <Select
                id="decimal_places"
                value={String(settings.currency_format.decimal_places)}
                onChange={(v) => setFmt('decimal_places', Number(v))}
                options={[
                  { value: '0', label: '0' },
                  { value: '1', label: '1' },
                  { value: '2', label: '2' },
                  { value: '3', label: '3' },
                ]}
              />
            </Field>
            <div className="md:col-span-2">
              <CurrencyPreview fmt={settings.currency_format} />
            </div>
          </Section>
        </>
      )}
    </section>
  )
}
