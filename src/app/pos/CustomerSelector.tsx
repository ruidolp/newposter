'use client'

import { useEffect, useRef, useState } from 'react'
import { UserCircle2, Search, X, Plus, Check, Phone } from 'lucide-react'
import CustomerLoyaltyPanel from './CustomerLoyaltyPanel'

export interface CustomerSnap {
  id: string
  name: string
  phone: string | null
  email: string | null
}

interface Props {
  selected: CustomerSnap | null
  onSelect: (c: CustomerSnap | null) => void
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function CustomerSelector({ selected, onSelect }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CustomerSnap[]>([])
  const [searching, setSearching] = useState(false)
  const [creating, setCreating] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setCreating(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const t = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/customers?q=${encodeURIComponent(query)}&limit=6`)
        const data = await res.json()
        setResults(data.customers ?? [])
      } finally {
        setSearching(false)
      }
    }, 200)
    return () => clearTimeout(t)
  }, [query])

  function pick(c: CustomerSnap) {
    onSelect(c)
    setOpen(false)
    setQuery('')
    setResults([])
    setCreating(false)
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation()
    onSelect(null)
  }

  // ── Quick create form ─────────────────────────────────────────────────────
  function QuickCreateForm() {
    const [name, setName] = useState(query)
    const [phone, setPhone] = useState('')
    const [email, setEmail] = useState('')
    const [saving, setSaving] = useState(false)
    const [err, setErr] = useState('')
    const nameRef = useRef<HTMLInputElement>(null)

    useEffect(() => { nameRef.current?.focus() }, [])

    async function handleCreate(e: React.FormEvent) {
      e.preventDefault()
      if (!name.trim()) { setErr('El nombre es obligatorio'); return }
      if (email && !EMAIL_RE.test(email)) { setErr('Email inválido'); return }
      setSaving(true); setErr('')
      try {
        const res = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), phone: phone.trim() || null, email: email.trim() || null }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Error al crear cliente')
        pick({ id: data.id, name: data.name, phone: data.phone ?? null, email: data.email ?? null })
      } catch (e: unknown) {
        setErr((e as Error).message)
      } finally {
        setSaving(false)
      }
    }

    return (
      <form onSubmit={handleCreate} noValidate className="border-t border-slate-100 p-3 space-y-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Nuevo cliente</p>
        {err && <p role="alert" className="rounded-md bg-rose-50 px-2 py-1 text-xs text-rose-600">{err}</p>}
        <div>
          <label htmlFor="qc-name" className="sr-only">Nombre</label>
          <input
            id="qc-name"
            ref={nameRef}
            name="name"
            type="text"
            autoComplete="off"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre…"
            className="h-8 w-full rounded-lg border border-slate-200 px-2.5 text-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200"
          />
        </div>
        <div>
          <label htmlFor="qc-phone" className="sr-only">Teléfono</label>
          <input
            id="qc-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Teléfono (opcional)…"
            className="h-8 w-full rounded-lg border border-slate-200 px-2.5 text-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200"
          />
        </div>
        <div>
          <label htmlFor="qc-email" className="sr-only">Email</label>
          <input
            id="qc-email"
            name="email"
            type="email"
            autoComplete="email"
            spellCheck={false}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email (opcional)…"
            className="h-8 w-full rounded-lg border border-slate-200 px-2.5 text-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200"
          />
        </div>
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => setCreating(false)}
            className="flex-1 rounded-lg border border-slate-200 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-fuchsia-600 py-1.5 text-xs font-bold text-white transition hover:bg-fuchsia-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500 disabled:opacity-60"
          >
            {saving
              ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" />
              : <Check size={12} aria-hidden="true" />}
            {saving ? 'Guardando…' : 'Crear y seleccionar'}
          </button>
        </div>
      </form>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div ref={containerRef} className="relative space-y-1.5">
      {/* Trigger */}
      {selected ? (
        <>
          <div className="flex items-center gap-2 rounded-xl border border-fuchsia-200 bg-fuchsia-50 px-3 py-2">
            <UserCircle2 size={15} className="shrink-0 text-fuchsia-600" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className="truncate text-xs font-semibold text-fuchsia-800">{selected.name}</p>
              {selected.phone && (
                <p className="flex items-center gap-0.5 text-[10px] text-fuchsia-500">
                  <Phone size={9} aria-hidden="true" />{selected.phone}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={clear}
              aria-label="Quitar cliente"
              className="grid h-5 w-5 shrink-0 place-items-center rounded text-fuchsia-400 transition hover:text-fuchsia-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500"
            >
              <X size={12} aria-hidden="true" />
            </button>
          </div>
          <CustomerLoyaltyPanel customer={selected} />
        </>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex w-full items-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-left text-xs text-slate-400 transition hover:border-fuchsia-300 hover:text-fuchsia-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500"
        >
          <UserCircle2 size={14} aria-hidden="true" />
          Agregar cliente (opcional)
        </button>
      )}

      {/* Dropdown */}
      {open && !selected && (
        <div className="absolute bottom-full left-0 right-0 mb-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          {/* Search */}
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
            <Search size={13} className="shrink-0 text-slate-400" aria-hidden="true" />
            <input
              ref={inputRef}
              type="search"
              autoComplete="off"
              spellCheck={false}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre o teléfono…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
            {searching && (
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-200 border-t-fuchsia-500" aria-hidden="true" />
            )}
          </div>

          {/* Results */}
          {results.length > 0 && (
            <ul role="listbox" aria-label="Resultados de clientes" className="max-h-40 overflow-y-auto">
              {results.map((c) => (
                <li key={c.id} role="option" aria-selected={false}>
                  <button
                    type="button"
                    onClick={() => pick(c)}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition hover:bg-fuchsia-50 focus:outline-none focus-visible:bg-fuchsia-50"
                  >
                    <UserCircle2 size={14} className="shrink-0 text-slate-400" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">{c.name}</p>
                      {c.phone && <p className="text-xs text-slate-400">{c.phone}</p>}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Create quick */}
          {!creating ? (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2.5 text-xs font-semibold text-fuchsia-600 transition hover:bg-fuchsia-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500"
            >
              <Plus size={13} aria-hidden="true" />
              Crear nuevo cliente
            </button>
          ) : (
            <QuickCreateForm />
          )}
        </div>
      )}
    </div>
  )
}
