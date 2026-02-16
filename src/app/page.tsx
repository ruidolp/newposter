import Link from 'next/link'
import { Store, ArrowRight, CheckCircle2, Package, BarChart3, Users, ShoppingCart, Zap, Shield } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased">
      {/* ── Skip link ───────────────────────────────────────────────────── */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-fuchsia-600 focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:outline-none"
      >
        Saltar al contenido
      </a>

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 border-b border-slate-100 bg-white/90 backdrop-blur-md" aria-label="Navegación principal">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500 rounded-md">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-tr from-fuchsia-600 to-rose-500 shadow-sm">
              <Store size={16} className="text-white" aria-hidden="true" />
            </div>
            <span className="text-lg font-black tracking-tight">
              <span className="bg-gradient-to-r from-fuchsia-600 to-rose-600 bg-clip-text text-transparent">POSFER</span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden rounded-md px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500 sm:block"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500 focus-visible:ring-offset-2"
            >
              Empezar gratis
            </Link>
          </div>
        </div>
      </nav>

      <main id="main">
        {/* ── Hero ────────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden py-24 sm:py-32" aria-labelledby="hero-heading">
          {/* Background glow */}
          <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
            <div className="absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 -translate-y-1/4 rounded-full bg-gradient-to-b from-fuchsia-100 to-transparent opacity-60 blur-3xl motion-safe:animate-pulse" style={{ animationDuration: '4s' }} />
          </div>

          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-fuchsia-100 bg-fuchsia-50 px-3.5 py-1.5 text-xs font-semibold text-fuchsia-700">
              <Zap size={12} aria-hidden="true" />
              Sistema de gestión para negocios modernos
            </div>

            <h1 id="hero-heading" className="text-5xl font-black tracking-tight text-slate-900 [text-wrap:balance] sm:text-7xl">
              Vende más.{' '}
              <span className="bg-gradient-to-r from-fuchsia-600 to-rose-500 bg-clip-text text-transparent">
                Gestiona menos.
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-slate-500 [text-wrap:pretty]">
              POSFER unifica tu inventario, compras y clientes en un solo panel. Sin complicaciones, sin planillas, sin excusas.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/register"
                className="flex items-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-600 to-rose-500 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-fuchsia-200 transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-xl hover:shadow-fuchsia-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500 focus-visible:ring-offset-2"
              >
                Crear cuenta gratis
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <Link
                href="#features"
                className="scroll-margin rounded-full border border-slate-200 bg-white px-7 py-3.5 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500 focus-visible:ring-offset-2"
              >
                Ver funciones
              </Link>
            </div>

            <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-slate-400" aria-label="Garantías">
              {['Sin tarjeta de crédito', 'Configuración en&nbsp;2 min', 'Cancela cuando quieras'].map((item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-fuchsia-500 shrink-0" aria-hidden="true" />
                  <span dangerouslySetInnerHTML={{ __html: item }} />
                </li>
              ))}
            </ul>
          </div>

          {/* Dashboard preview card */}
          <div className="mx-auto mt-16 max-w-3xl px-4 sm:px-6">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-200">
              {/* Fake browser bar */}
              <div className="flex items-center gap-1.5 border-b border-slate-100 bg-slate-50 px-4 py-3">
                <span className="h-3 w-3 rounded-full bg-rose-400" aria-hidden="true" />
                <span className="h-3 w-3 rounded-full bg-fuchsia-300" aria-hidden="true" />
                <span className="h-3 w-3 rounded-full bg-slate-200" aria-hidden="true" />
                <div className="ml-3 h-5 flex-1 rounded bg-slate-200" aria-hidden="true" />
              </div>
              {/* Mock dashboard content */}
              <div className="grid grid-cols-3 gap-3 p-5 sm:grid-cols-4" aria-hidden="true">
                {[
                  { label: 'Productos', val: '248', color: 'bg-fuchsia-50 text-fuchsia-600' },
                  { label: 'Ventas hoy', val: '$84.200', color: 'bg-rose-50 text-rose-600' },
                  { label: 'Stock bajo', val: '3', color: 'bg-slate-100 text-slate-500' },
                  { label: 'Este mes', val: '$1.2M', color: 'bg-fuchsia-50 text-fuchsia-600' },
                ].map((k) => (
                  <div key={k.label} className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                    <div className={`mb-2 inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${k.color}`}>{k.label}</div>
                    <p className="font-black text-slate-900 tabular-nums">{k.val}</p>
                  </div>
                ))}
                <div className="col-span-3 rounded-xl border border-slate-100 bg-white p-3 shadow-sm sm:col-span-4">
                  <p className="mb-2 text-xs font-semibold text-slate-400">ACTIVIDAD RECIENTE</p>
                  <div className="space-y-2">
                    {[
                      'Compra registrada · Proveedor ABC · $32.400',
                      'Producto actualizado · Cafetera Oster Pro',
                      'Cliente nuevo · Juan Pérez',
                    ].map((log) => (
                      <div key={log} className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-fuchsia-400" />
                        <p className="truncate text-xs text-slate-500">{log}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Features ────────────────────────────────────────────────────── */}
        <section id="features" className="border-t border-slate-100 bg-slate-50 py-24 scroll-mt-16" aria-labelledby="features-heading">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto mb-16 max-w-2xl text-center">
              <h2 id="features-heading" className="text-3xl font-black tracking-tight text-slate-900 [text-wrap:balance] sm:text-4xl">
                Todo lo que necesitas,{' '}
                <span className="bg-gradient-to-r from-fuchsia-600 to-rose-500 bg-clip-text text-transparent">nada de lo que no</span>
              </h2>
              <p className="mt-4 text-slate-500 [text-wrap:pretty]">
                Un panel central para gestionar tu negocio de principio a fin.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  icon: Package,
                  title: 'Inventario en tiempo real',
                  desc: 'Control de stock preciso. Alertas automáticas cuando un producto llega a mínimos. Nunca más vendas lo que no tienes.',
                },
                {
                  icon: ShoppingCart,
                  title: 'Gestión de compras',
                  desc: 'Registra compras a proveedores, actualiza costos y stock en un solo flujo. Con historial completo y fotos de facturas.',
                },
                {
                  icon: Users,
                  title: 'Clientes y empleados',
                  desc: 'Base de clientes integrada y control de acceso por roles. Cada empleado ve lo que necesita y nada más.',
                },
                {
                  icon: BarChart3,
                  title: 'Métricas que importan',
                  desc: 'Dashboard con ventas del día, del mes y productos con stock bajo. Sin ruido, solo lo que te ayuda a decidir.',
                },
                {
                  icon: Shield,
                  title: 'Multi-empresa, aislado',
                  desc: 'Cada empresa tiene su propio entorno completamente aislado. URL directa, acceso propio y datos separados.',
                },
                {
                  icon: Zap,
                  title: 'Rápido desde el día 1',
                  desc: 'Sin instalaciones ni configuraciones complejas. Crea tu cuenta, agrega tus productos y empieza a operar hoy.',
                },
              ].map(({ icon: Icon, title, desc }) => (
                <article key={title} className="group rounded-2xl border border-slate-200 bg-white p-6 transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-100">
                  <div className="mb-4 inline-flex rounded-xl bg-gradient-to-tr from-fuchsia-50 to-rose-50 p-2.5">
                    <Icon size={20} className="text-fuchsia-600" aria-hidden="true" />
                  </div>
                  <h3 className="mb-2 font-bold text-slate-900">{title}</h3>
                  <p className="text-sm leading-relaxed text-slate-500">{desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ─────────────────────────────────────────────────────────── */}
        <section className="py-24" aria-labelledby="cta-heading">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <div className="rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 px-8 py-16 shadow-2xl">
              <h2 id="cta-heading" className="text-3xl font-black tracking-tight text-white [text-wrap:balance] sm:text-4xl">
                Tu negocio merece mejores herramientas
              </h2>
              <p className="mx-auto mt-4 max-w-md text-slate-400 [text-wrap:pretty]">
                Únete a los negocios que ya gestionan con POSFER. Empieza gratis, sin límite de tiempo.
              </p>
              <Link
                href="/register"
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-rose-500 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-fuchsia-900/40 transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
              >
                Empezar gratis ahora
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-100 bg-white py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-tr from-fuchsia-600 to-rose-500">
              <Store size={14} className="text-white" aria-hidden="true" />
            </div>
            <span className="font-black tracking-tight">
              <span className="bg-gradient-to-r from-fuchsia-600 to-rose-600 bg-clip-text text-transparent">POSFER</span>
            </span>
          </div>
          <p className="text-sm text-slate-400">
            &copy; {new Date().getFullYear()} POSFER. Hecho para emprendedores.
          </p>
          <Link
            href="/login"
            className="text-sm font-medium text-slate-500 transition-colors hover:text-fuchsia-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500 rounded"
          >
            Iniciar sesión →
          </Link>
        </div>
      </footer>
    </div>
  )
}
