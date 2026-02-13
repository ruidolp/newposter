import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-24 bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="text-center max-w-4xl">
        <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          VentaFácil
        </h1>
        <p className="text-xl md:text-2xl text-gray-600 mb-8">
          Sistema POS + Ecommerce Multi-Tenant
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <Link
            href="/login"
            className="p-6 bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow border border-gray-200"
          >
            <div className="text-4xl mb-4">🔐</div>
            <h2 className="text-xl font-semibold mb-2">Iniciar Sesión</h2>
            <p className="text-gray-600 text-sm">
              Accede con tus credenciales
            </p>
          </Link>

          <Link
            href="/pos"
            className="p-6 bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow border border-gray-200"
          >
            <div className="text-4xl mb-4">🏪</div>
            <h2 className="text-xl font-semibold mb-2">Punto de Venta</h2>
            <p className="text-gray-600 text-sm">
              Interfaz POS responsive
            </p>
          </Link>

          <Link
            href="/demo-store"
            className="p-6 bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow border border-gray-200"
          >
            <div className="text-4xl mb-4">🛒</div>
            <h2 className="text-xl font-semibold mb-2">Tienda Online</h2>
            <p className="text-gray-600 text-sm">
              Catálogo de productos
            </p>
          </Link>
        </div>

        <div className="mt-12 p-6 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">Credenciales Demo</h3>
          <div className="text-sm space-y-1">
            <p className="font-mono">admin@demo.com / admin123</p>
            <p className="font-mono">cashier@demo.com / cashier123</p>
          </div>
        </div>

        <div className="mt-8 text-sm text-gray-500">
          <p>✅ Multi-tenant • ✅ Extensiones • ✅ TypeScript • ✅ PostgreSQL</p>
        </div>
      </div>
    </main>
  )
}
