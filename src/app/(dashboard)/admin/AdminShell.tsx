'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  ShoppingCart,
  Truck,
  LogOut,
  FileText,
  Package,
  Tags,
  PenLine,
  ClipboardList,
  ChevronDown,
  Settings,
  Users,
  UserCircle2,
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

const NAV: NavItem[] = [
  { label: 'Productos',       href: '/admin/productos',   icon: Package },
  { label: 'Categorías',      href: '/admin/categorias',  icon: Tags },
  {
    label: 'Compras',
    href: '/admin/compras',
    icon: ShoppingCart,
    children: [
      { label: 'Nueva Compra', href: '/admin/compras/nueva',     icon: PenLine },
      { label: 'Historial',    href: '/admin/compras/historial', icon: ClipboardList },
    ],
  },
  { label: 'Proveedores',     href: '/admin/proveedores', icon: Truck },
  { label: 'Clientes',        href: '/admin/clientes',    icon: UserCircle2 },
  { label: 'Usuarios',        href: '/admin/usuarios',    icon: Users },
  { label: 'Log Operaciones', href: '/admin/logs',        icon: FileText },
  { label: 'Configuración',   href: '/admin/configuracion', icon: Settings },
]

export default function AdminShell({ user, children }: AdminShellProps) {
  const pathname = usePathname()
  const router = useRouter()

  // Auto-expand parent if a child route is active
  const [expanded, setExpanded] = useState<string[]>(() =>
    NAV.filter(n => n.children?.some(c => pathname.startsWith(c.href)))
       .map(n => n.href)
  )

  function toggleExpand(href: string) {
    setExpanded(prev =>
      prev.includes(href) ? prev.filter(h => h !== href) : [...prev, href]
    )
  }

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  // Breadcrumb: find active child or parent
  let section = 'Admin'
  for (const item of NAV) {
    if (item.children) {
      const child = item.children.find(c => pathname.startsWith(c.href))
      if (child) { section = `${item.label} · ${child.label}`; break }
    } else if (pathname.startsWith(item.href)) {
      section = item.label; break
    }
  }

  return (
    <div className="admin-layout">
      {/* ── Sidebar ── */}
      <aside className="admin-sidebar">
        {/* Logo */}
        <div className="admin-sidebar-logo">
          <div className="admin-sidebar-logo-mark">
            <div className="admin-logo-icon">V</div>
            <span className="admin-sidebar-logo-title">
              Venta<span>Fácil</span>
            </span>
          </div>
          <div className="admin-sidebar-logo-sub">Panel Administrativo</div>
        </div>

        {/* Nav */}
        <div className="admin-sidebar-section">
          <div className="admin-sidebar-section-label">Módulos</div>
          {NAV.map((item) => {
            const Icon = item.icon
            const isParentActive = item.children
              ? item.children.some(c => pathname.startsWith(c.href))
              : pathname.startsWith(item.href)
            const isExpanded = expanded.includes(item.href)

            if (item.children) {
              return (
                <div key={item.href}>
                  <button
                    className={`admin-nav-item${isParentActive ? ' active' : ''}`}
                    onClick={() => toggleExpand(item.href)}
                  >
                    <Icon className="admin-nav-icon" size={15} />
                    {item.label}
                    <ChevronDown
                      size={13}
                      className="admin-nav-chevron"
                      style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                    />
                  </button>
                  {isExpanded && (
                    <div className="admin-nav-subitems">
                      {item.children.map(child => {
                        const ChildIcon = child.icon
                        const childActive = pathname.startsWith(child.href)
                        return (
                          <button
                            key={child.href}
                            className={`admin-nav-subitem${childActive ? ' active' : ''}`}
                            onClick={() => router.push(child.href)}
                          >
                            <ChildIcon size={13} />
                            {child.label}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            }

            return (
              <button
                key={item.href}
                className={`admin-nav-item${isParentActive ? ' active' : ''}`}
                onClick={() => router.push(item.href)}
              >
                <Icon className="admin-nav-icon" size={15} />
                {item.label}
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <div className="admin-sidebar-footer">
          <div className="admin-user-badge" style={{ marginBottom: 8 }}>
            <div className="admin-user-avatar">{initials}</div>
            <div className="admin-user-info">
              <div className="admin-user-name">{user.name}</div>
              <div className="admin-user-role">{user.role}</div>
            </div>
          </div>
          <button
            className="admin-btn admin-btn-ghost admin-btn-sm"
            style={{ width: '100%', justifyContent: 'flex-start', gap: 8, color: 'var(--a-text-3)' }}
            onClick={() => signOut({ callbackUrl: '/login' })}
          >
            <LogOut size={13} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="admin-main">
        {/* Topbar */}
        <div className="admin-topbar">
          <div className="admin-breadcrumb">
            <span>Admin</span>
            <span className="admin-breadcrumb-sep">/</span>
            <span className="admin-breadcrumb-current">{section}</span>
          </div>
          <div className="admin-topbar-actions" style={{ fontSize: 11, fontFamily: 'var(--a-font-mono)', color: 'var(--a-text-3)' }}>
            DEMO-STORE
          </div>
        </div>

        {/* Content */}
        <div className="admin-content">{children}</div>
      </main>
    </div>
  )
}
