'use client'

import { useState, useEffect, useCallback } from 'react'
import currency from 'currency.js'
import {
  Store,
  Globe,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  Save,
  RefreshCw,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

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
}

// ─── Data ─────────────────────────────────────────────────────────────────────

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

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: Settings = {
  store_name: '',
  language: 'es',
  currency: 'CLP',
  timezone: 'America/Santiago',
  currency_format: {
    country: 'CL',
    currency_symbol: '$',
    decimal_separator: ',',
    thousand_separator: '.',
    decimal_places: 0,
  },
}

// ─── Preview ──────────────────────────────────────────────────────────────────

function CurrencyPreview({ fmt }: { fmt: CurrencyFormat }) {
  const samples = [1234567.89, 9999, 0.5, 1000000]

  function format(val: number) {
    return currency(val, {
      symbol: fmt.currency_symbol,
      separator: fmt.thousand_separator,
      decimal: fmt.decimal_separator,
      precision: fmt.decimal_places,
    }).format()
  }

  return (
    <div className="admin-card" style={{ padding: '16px 20px' }}>
      <div style={{ fontSize: 11, fontFamily: 'var(--a-font-mono)', color: 'var(--a-text-3)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Vista previa
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {samples.map((v) => (
          <span
            key={v}
            style={{
              fontFamily: 'var(--a-font-mono)',
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--a-accent)',
              background: 'var(--a-accent-dim)',
              border: '1px solid var(--a-border-accent)',
              borderRadius: 'var(--a-radius-sm)',
              padding: '3px 10px',
            }}
          >
            {format(v)}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Field ────────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label className="admin-label">{label}</label>
      {children}
    </div>
  )
}

function Select({
  value, onChange, options,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <select
      className="admin-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

// ─── Section header ───────────────────────────────────────────────────────────

function Section({ icon: Icon, title, children }: {
  icon: React.ElementType
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="admin-card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 14, borderBottom: '1px solid var(--a-border)' }}>
        <Icon size={15} color="var(--a-accent)" />
        <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--a-text-1)' }}>{title}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
        {children}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

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

  useEffect(() => { load() }, [load])

  function setFmt(key: keyof CurrencyFormat, val: string | number) {
    setSettings((s) => ({
      ...s,
      currency_format: { ...s.currency_format, [key]: val },
    }))
  }

  // Auto-fill symbol when currency changes
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Configuración</h1>
          <p className="admin-page-subtitle">Personaliza tu tienda: nombre, región, moneda y formato</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={load} disabled={loading}>
            <RefreshCw size={13} />
            Recargar
          </button>
          <button className="admin-btn admin-btn-primary admin-btn-sm" onClick={handleSave} disabled={saving || loading}>
            {saving ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={13} />}
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`admin-toast ${toast.type}`} style={{ alignSelf: 'flex-start' }}>
          <span className={`admin-toast-icon ${toast.type}`}>
            {toast.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
          </span>
          <span className="admin-toast-msg">{toast.msg}</span>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--a-text-3)', fontSize: 13 }}>
          Cargando…
        </div>
      ) : (
        <>
          {/* Tienda */}
          <Section icon={Store} title="Tienda">
            <Field label="Nombre de la tienda">
              <input
                className="admin-input"
                value={settings.store_name}
                onChange={(e) => setSettings((s) => ({ ...s, store_name: e.target.value }))}
                placeholder="Mi Tienda"
              />
            </Field>
            <Field label="País">
              <Select
                value={settings.currency_format.country}
                onChange={(v) => setFmt('country', v)}
                options={COUNTRIES.map((c) => ({ value: c.code, label: c.name }))}
              />
            </Field>
          </Section>

          {/* Regional */}
          <Section icon={Globe} title="Idioma y región">
            <Field label="Idioma">
              <Select
                value={settings.language}
                onChange={(v) => setSettings((s) => ({ ...s, language: v }))}
                options={LANGUAGES.map((l) => ({ value: l.code, label: l.name }))}
              />
            </Field>
            <Field label="Zona horaria">
              <Select
                value={settings.timezone}
                onChange={(v) => setSettings((s) => ({ ...s, timezone: v }))}
                options={TIMEZONES.map((t) => ({ value: t.value, label: t.label }))}
              />
            </Field>
          </Section>

          {/* Moneda */}
          <Section icon={DollarSign} title="Moneda">
            <Field label="Moneda">
              <Select
                value={settings.currency}
                onChange={handleCurrencyChange}
                options={CURRENCIES.map((c) => ({ value: c.code, label: `${c.code} — ${c.name}` }))}
              />
            </Field>
            <Field label="Símbolo">
              <input
                className="admin-input"
                value={settings.currency_format.currency_symbol}
                onChange={(e) => setFmt('currency_symbol', e.target.value)}
                placeholder="$"
                maxLength={6}
              />
            </Field>
          </Section>

          {/* Formato */}
          <Section icon={Clock} title="Formato de moneda">
            <Field label="Separador decimal">
              <Select
                value={settings.currency_format.decimal_separator}
                onChange={(v) => setFmt('decimal_separator', v)}
                options={[
                  { value: '.', label: 'Punto  ( 1234.56 )' },
                  { value: ',', label: 'Coma   ( 1234,56 )' },
                ]}
              />
            </Field>
            <Field label="Separador de miles">
              <Select
                value={settings.currency_format.thousand_separator}
                onChange={(v) => setFmt('thousand_separator', v)}
                options={[
                  { value: ',', label: 'Coma   ( 1,234,567 )' },
                  { value: '.', label: 'Punto  ( 1.234.567 )' },
                  { value: ' ', label: 'Espacio ( 1 234 567 )' },
                ]}
              />
            </Field>
            <Field label="Decimales">
              <Select
                value={String(settings.currency_format.decimal_places)}
                onChange={(v) => setFmt('decimal_places', parseInt(v, 10))}
                options={[
                  { value: '0', label: '0  — Sin decimales' },
                  { value: '1', label: '1  — Un decimal' },
                  { value: '2', label: '2  — Dos decimales' },
                  { value: '3', label: '3  — Tres decimales' },
                  { value: '4', label: '4  — Cuatro decimales' },
                ]}
              />
            </Field>
          </Section>

          {/* Preview */}
          <CurrencyPreview fmt={settings.currency_format} />
        </>
      )}
    </div>
  )
}
