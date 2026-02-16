'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  BriefcaseBusiness,
  Building2,
  ChevronDown,
  ClipboardList,
  ExternalLink,
  FileText,
  Globe,
  LayoutDashboard,
  LogOut,
  Monitor,
  Package,
  Paintbrush2,
  PenLine,
  Receipt,
  Scan,
  Settings,
  ShoppingCart,
  Star,
  Store,
  Tags,
  Truck,
  UserCircle2,
  Users,
} from 'lucide-react'

interface AdminShellProps {
  user: { name: string; role: string }
  children: React.ReactNode
}

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  children?: { label: string; href: string; icon: React.ElementType }[]
}

interface NavSection {
  label: string
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'General',
    items: [
      { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Ventas',
    items: [
      { label: 'Punto de Venta', href: '/pos', icon: Scan },
      { label: 'Reporte Ventas', href: '/admin/ventas', icon: Receipt },
      { label: 'Sesiones de Caja', href: '/admin/sesiones', icon: Monitor },
    ],
  },
  {
    label: 'Inventario',
    items: [
      { label: 'Productos', href: '/admin/productos', icon: Package },
      { label: 'Categorías', href: '/admin/categorias', icon: Tags },
      {
        label: 'Compras',
        href: '/admin/compras',
        icon: ShoppingCart,
        children: [
          { label: 'Nueva Compra', href: '/admin/compras/nueva', icon: PenLine },
          { label: 'Historial', href: '/admin/compras/historial', icon: ClipboardList },
        ],
      },
      { label: 'Proveedores', href: '/admin/proveedores', icon: Truck },
    ],
  },
  {
    label: 'CRM',
    items: [
      { label: 'Clientes', href: '/admin/clientes', icon: UserCircle2 },
      { label: 'Fidelización', href: '/admin/fidelizacion', icon: Star },
    ],
  },
  {
    label: 'eCommerce',
    items: [
      { label: 'Editor Visual', href: '/editor-visual', icon: Paintbrush2 },
    ],
  },
  {
    label: 'Mi Negocio',
    items: [
      { label: 'Sucursales', href: '/admin/sucursales', icon: Building2 },
      { label: 'Usuarios', href: '/admin/usuarios', icon: Users },
    ],
  },
  {
    label: 'RRHH',
    items: [
      { label: 'Gestión de Personal', href: '/rrhh/dashboard', icon: BriefcaseBusiness },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { label: 'Configuración', href: '/admin/configuracion', icon: Settings },
      { label: 'Log Operaciones', href: '/admin/logs', icon: FileText },
    ],
  },
]

const NAV: NavItem[] = NAV_SECTIONS.flatMap((section) => section.items)

export default function AdminShell({ user, children }: AdminShellProps) {
  const pathname = usePathname()

  // Auto-expand parent if a child route is active
  const [expanded, setExpanded] = useState<string[]>(() =>
    NAV.filter((n) => n.children?.some((c) => pathname.startsWith(c.href)))
      .map((n) => n.href)
  )

  function toggleExpand(href: string) {
    setExpanded((prev) =>
      prev.includes(href) ? prev.filter(h => h !== href) : [...prev, href]
    )
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  const initials = useMemo(() => {
    const base = (user.name || '')
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
    return base || 'U'
  }, [user.name])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-fuchsia-700 focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-300"
      >
        Saltar al contenido principal
      </a>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-slate-200 bg-white md:flex md:flex-col">
        <div className="border-b border-slate-200 px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-tr from-fuchsia-600 to-rose-500 text-white shadow-md shadow-fuchsia-200">
              <Store size={18} aria-hidden="true" />
            </div>
            <div>
              <div className="text-xl font-black tracking-tight">
                <span className="bg-gradient-to-r from-fuchsia-600 to-rose-600 bg-clip-text text-transparent">POSFER</span>
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Panel Administrativo</p>
            </div>
          </div>
        </div>

        <nav aria-label="Módulos del panel" className="flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-4">
            {NAV_SECTIONS.map((sectionItem) => (
              <section key={sectionItem.label} aria-label={sectionItem.label}>
                <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {sectionItem.label}
                </p>
                <ul className="space-y-1">
                  {sectionItem.items.map((item) => {
                    const Icon = item.icon
                    const isParentActive = item.children
                      ? item.children.some((c) => isActive(c.href))
                      : isActive(item.href)
                    const isExpanded = expanded.includes(item.href)

                    if (item.children) {
                      return (
                        <li key={item.href} className="space-y-1">
                          <button
                            type="button"
                            aria-expanded={isExpanded}
                            aria-controls={`admin-nav-${item.href}`}
                            onClick={() => toggleExpand(item.href)}
                            className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500 ${
                              isParentActive
                                ? 'bg-fuchsia-50 text-fuchsia-700'
                                : 'text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <Icon size={16} aria-hidden="true" />
                            <span className="flex-1">{item.label}</span>
                            <ChevronDown
                              size={14}
                              aria-hidden="true"
                              className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            />
                          </button>

                          {isExpanded && (
                            <ul id={`admin-nav-${item.href}`} className="ml-6 space-y-1 border-l border-slate-200 pl-3">
                              {item.children.map((child) => {
                                const ChildIcon = child.icon
                                const childActive = isActive(child.href)
                                return (
                                  <li key={child.href}>
                                    <Link
                                      href={child.href}
                                      aria-current={childActive ? 'page' : undefined}
                                      className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500 ${
                                        childActive
                                          ? 'bg-fuchsia-50 font-semibold text-fuchsia-700'
                                          : 'text-slate-600 hover:bg-slate-100'
                                      }`}
                                    >
                                      <ChildIcon size={14} aria-hidden="true" />
                                      <span>{child.label}</span>
                                    </Link>
                                  </li>
                                )
                              })}
                            </ul>
                          )}
                        </li>
                      )
                    }

                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          aria-current={isParentActive ? 'page' : undefined}
                          className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500 ${
                            isParentActive
                              ? 'bg-fuchsia-50 text-fuchsia-700'
                              : 'text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <Icon size={16} aria-hidden="true" />
                          <span>{item.label}</span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))}
          </div>
        </nav>

        <div className="border-t border-slate-200 px-3 py-3">
          <div className="mb-2 flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-slate-900 text-xs font-bold text-white">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-900">{user.name}</p>
              <p className="truncate text-xs uppercase tracking-wide text-slate-500">{user.role}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex w-full items-center justify-start gap-2 rounded-md px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500"
          >
            <LogOut size={14} aria-hidden="true" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="md:pl-64">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur md:hidden">
          <nav aria-label="Accesos rápidos" className="overflow-x-auto px-2 py-2">
            <ul className="flex min-w-max gap-2">
              {NAV.map((item) => {
                const active = item.children
                  ? item.children.some((c) => isActive(c.href)) || isActive(item.href)
                  : isActive(item.href)
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={`block rounded-full px-3 py-1.5 text-xs font-medium ${
                        active ? 'bg-fuchsia-600 text-white' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>
        </header>

        <main id="admin-main" className="mx-auto w-full max-w-[1600px] p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
