'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Building2, Plus, Search, ShieldCheck, LogOut,
  CheckCircle2, XCircle, ChevronRight, Users, Package,
} from 'lucide-react'

interface TenantRow {
  id: string
  name: string
  slug: string
  plan: string | null
  active: boolean | null
  created_at: string
  user_count: number
  product_count: number
}

const PLAN_COLORS: Record<string, string> = {
  FREE: 'bg-slate-100 text-slate-600',
  BASIC: 'bg-blue-50 text-blue-700',
  PRO: 'bg-violet-50 text-violet-700',
  ENTERPRISE: 'bg-amber-50 text-amber-700',
}

export default function SuperadminDashboardClient({ adminName }: { adminName: string }) {
  const router = useRouter()
  const [tenants, setTenants] = useState<TenantRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [toggling, setToggling] = useState<string | null>(null)

  const fetchTenants = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/superadmin/tenants')
      if (res.status === 401) { router.push('/superadmin/login'); return }
      const data = await res.json()
      setTenants(data.tenants ?? [])
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { fetchTenants() }, [fetchTenants])

  async function handleLogout() {
    await fetch('/api/superadmin/auth', { method: 'DELETE' })
    router.push('/superadmin/login')
  }

  async function toggleActive(t: TenantRow) {
    setToggling(t.id)
    try {
      await fetch(`/api/superadmin/tenants/${t.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !t.active }),
      })
      setTenants((prev) => prev.map((x) => x.id === t.id ? { ...x, active: !t.active } : x))
    } finally {
      setToggling(null)
    }
  }

  const filtered = tenants.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.slug.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Topbar */}
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-violet-600">
              <ShieldCheck size={16} aria-hidden="true" />
            </div>
            <span className="font-bold tracking-tight">
              Venta<span className="text-violet-400">Fácil</span>
              <span className="ml-2 text-xs font-normal text-slate-400">Root</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-400 sm:block">{adminName}</span>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Cerrar sesión"
              className="flex items-center gap-1.5 rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-300 transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            >
              <LogOut size={14} aria-hidden="true" />
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* Page header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight [text-wrap:balance]">
              Empresas
            </h1>
            <p className="mt-0.5 text-sm text-slate-400">
              {tenants.length} empresa{tenants.length !== 1 ? 's' : ''} registrada{tenants.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Link
            href="/superadmin/empresas/nueva"
            className="inline-flex items-center gap-2 rounded-md bg-violet-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-violet-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            <Plus size={15} aria-hidden="true" />
            Nueva Empresa
          </Link>
        </div>

        {/* Search */}
        <div className="mb-4 relative max-w-xs">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar empresa o slug…"
            aria-label="Buscar empresas"
            className="h-9 w-full rounded-md border border-slate-700 bg-slate-800 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30"
          />
        </div>

        {/* Table / empty */}
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-sm text-slate-500">
              <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-violet-500" aria-hidden="true" />
              Cargando empresas…
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              <Building2 size={36} className="mx-auto mb-2 text-slate-700" aria-hidden="true" />
              <p className="text-sm">
                {search ? 'Sin resultados para esa búsqueda' : 'No hay empresas creadas aún'}
              </p>
              {!search && (
                <Link
                  href="/superadmin/empresas/nueva"
                  className="mt-3 inline-flex items-center gap-2 rounded-md bg-violet-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-violet-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                >
                  <Plus size={14} aria-hidden="true" />
                  Crear primera empresa
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-800 text-sm" aria-label="Listado de empresas">
                <thead className="bg-slate-800/50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Empresa</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Slug</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Plan</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                      <span className="inline-flex items-center gap-1"><Users size={12} aria-hidden="true" /> Usuarios</span>
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                      <span className="inline-flex items-center gap-1"><Package size={12} aria-hidden="true" /> Productos</span>
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Estado</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Creada</th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filtered.map((t) => (
                    <tr key={t.id} className="transition hover:bg-slate-800/40">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-white">{t.name}</p>
                      </td>
                      <td className="px-4 py-3">
                        <code className="rounded bg-slate-800 px-1.5 py-0.5 text-xs text-violet-300">
                          {t.slug}
                        </code>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${PLAN_COLORS[t.plan ?? 'FREE'] ?? PLAN_COLORS.FREE}`}>
                          {t.plan ?? 'FREE'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{t.user_count}</td>
                      <td className="px-4 py-3 text-slate-300">{t.product_count}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => toggleActive(t)}
                          disabled={toggling === t.id}
                          aria-label={t.active ? `Desactivar ${t.name}` : `Activar ${t.name}`}
                          aria-pressed={!!t.active}
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:opacity-50
                            ${t.active ? 'bg-emerald-900/50 text-emerald-400 hover:bg-red-900/40 hover:text-red-400' : 'bg-red-900/40 text-red-400 hover:bg-emerald-900/50 hover:text-emerald-400'}"
                        >
                          {t.active
                            ? <><CheckCircle2 size={11} aria-hidden="true" /> Activa</>
                            : <><XCircle size={11} aria-hidden="true" /> Inactiva</>
                          }
                        </button>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {new Date(t.created_at).toLocaleDateString('es-CL')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <a
                          href={`/login/${t.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Ir al login de ${t.name}`}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 transition hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                        >
                          Login <ChevronRight size={12} aria-hidden="true" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
