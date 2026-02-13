'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  ShoppingCart,
  Truck,
  LogOut,
  FileText,
  BarChart3,
} from 'lucide-react'

interface AdminShellProps {
  user: { name: string; role: string }
  children: React.ReactNode
}

const NAV = [
  { label: 'Compras',     href: '/admin/compras',    icon: ShoppingCart },
  { label: 'Proveedores', href: '/admin/proveedores', icon: Truck },
  { label: 'Log Operaciones', href: '/admin/logs',   icon: FileText },
]

export default function AdminShell({ user, children }: AdminShellProps) {
  const pathname = usePathname()
  const router = useRouter()

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  // Determine breadcrumb
  const currentNav = NAV.find((n) => pathname.startsWith(n.href))
  const section = currentNav?.label ?? 'Admin'

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
            const active = pathname.startsWith(item.href)
            return (
              <button
                key={item.href}
                className={`admin-nav-item${active ? ' active' : ''}`}
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
