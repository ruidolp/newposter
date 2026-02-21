'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { signOut } from 'next-auth/react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import {
  Store, Search, Plus, Minus, X, ShoppingCart, LogOut, Package, ClipboardList, EllipsisVertical,
} from 'lucide-react'
import CheckoutModal, { type PaymentMethod } from './CheckoutModal'
import SuccessScreen from './SuccessScreen'
import SalesSheet from '@/components/SalesSheet'
import CustomerSelector, { type CustomerSnap } from './CustomerSelector'
import SessionOpenModal, { type LocationOption, type OpenedSession } from './SessionOpenModal'
import SessionCloseModal from './SessionCloseModal'

interface Product {
  id: string
  name: string
  sku: string
  barcode: string | null
  base_price: number
  stock: number
  track_stock: boolean
  savings_percent?: number | null
}

interface CartItem {
  product_id: string
  name: string
  unit_price: number
  quantity: number
  stock: number
  track_stock: boolean
}

interface SaleResult {
  order_number: string
  total: number
  payment_method: PaymentMethod
  amount_paid: number
  change: number
  items_count: number
  created_at: string
  customer_name?: string | null
  items: { name: string; quantity: number; unit_price: number }[]
}

interface Props {
  storeName: string
  userName: string
  userId: string
  userRole: string
  printEnabled: boolean
  locations: LocationOption[]
}

// Simple currency formatter — will be enhanced when settings are loaded
function fmt(n: number) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency', currency: 'CLP', maximumFractionDigits: 0,
  }).format(n)
}

export default function PosClient({ storeName, userName, userId, userRole, printEnabled, locations }: Props) {
  // ── Session state ────────────────────────────────────────────────────────────
  const [session, setSession] = useState<OpenedSession | null>(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [showCloseSession, setShowCloseSession] = useState(false)

  // Check for existing open session on mount
  useEffect(() => {
    fetch('/api/pos/sessions')
      .then((r) => r.json())
      .then((d) => {
        if (d.active) {
          setSession({
            id: d.active.id,
            location_id: d.active.location_id,
            location_name: d.active.location_name ?? 'Principal',
            opening_amount: Number(d.active.opening_amount),
            opened_at: d.active.opened_at,
          })
        }
      })
      .finally(() => setSessionLoading(false))
  }, [])

  const [query, setQuery] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [searching, setSearching] = useState(false)
  const [cart, setCart] = useState<CartItem[]>([])
  const [customer, setCustomer] = useState<CustomerSnap | null>(null)
  const [checkout, setCheckout] = useState(false)
  const [showSales, setShowSales] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')
  const [result, setResult] = useState<SaleResult | null>(null)
  const [now, setNow] = useState(() => new Date())

  const searchRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat('es-CL', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }),
    []
  )
  const timeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat('es-CL', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }),
    []
  )
  const formattedNow = `${dateFormatter.format(now)} - ${timeFormatter.format(now)}`

  useEffect(() => {
    const intervalId = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(intervalId)
  }, [])

  // Focus search once session is ready; do not preload full catalog.
  useEffect(() => {
    if (!session) return
    searchRef.current?.focus()
  }, [session])

  async function fetchProducts(q: string) {
    setSearching(true)
    try {
      const res = await fetch(`/api/pos/products?q=${encodeURIComponent(q)}`)
      if (res.ok) setProducts(await res.json())
    } finally {
      setSearching(false)
    }
  }

  function handleQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setQuery(val)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!val.trim()) {
      setProducts([])
      return
    }
    timerRef.current = setTimeout(() => fetchProducts(val), 200)
  }

  // Barcode scanner: rapid input ends with Enter
  function handleSearchKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      const exact = products.find(
        (p) => p.barcode === query || p.sku.toLowerCase() === query.toLowerCase()
      ) ?? (products.length === 1 ? products[0] : null)
      if (exact) {
        addToCart(exact)
        setQuery('')
        setProducts([])
        searchRef.current?.focus()
      }
    }
  }

  function addToCart(product: Product) {
    if (product.track_stock && product.stock <= 0) return

    setCart((prev) => {
      const existing = prev.find((i) => i.product_id === product.id)
      if (existing) {
        // Check max stock
        if (product.track_stock && existing.quantity >= product.stock) return prev
        return prev.map((i) =>
          i.product_id === product.id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        )
      }
      return [
        ...prev,
        {
          product_id: product.id,
          name: product.name,
          unit_price: product.base_price,
          quantity: 1,
          stock: product.stock,
          track_stock: product.track_stock,
        },
      ]
    })
  }

  function updateQty(product_id: string, delta: number) {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.product_id !== product_id) return i
          const next = i.quantity + delta
          if (next <= 0) return null as unknown as CartItem
          if (i.track_stock && next > i.stock) return i
          return { ...i, quantity: next }
        })
        .filter(Boolean)
    )
  }

  function setQty(product_id: string, rawValue: string) {
    const parsed = Number.parseInt(rawValue, 10)
    if (Number.isNaN(parsed)) return

    setCart((prev) =>
      prev.map((i) => {
        if (i.product_id !== product_id) return i
        const max = i.track_stock ? Math.max(i.stock, 1) : Number.MAX_SAFE_INTEGER
        const next = Math.min(Math.max(parsed, 1), max)
        return { ...i, quantity: next }
      })
    )
  }

  function removeFromCart(product_id: string) {
    setCart((prev) => prev.filter((i) => i.product_id !== product_id))
  }

  const total = cart.reduce((s, i) => s + i.unit_price * i.quantity, 0)
  const totalItems = cart.reduce((s, i) => s + i.quantity, 0)

  async function handleConfirmSale(method: PaymentMethod, amountPaid: number) {
    setCheckoutError('')
    setCheckoutLoading(true)
    try {
      const res = await fetch('/api/pos/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map((i) => ({
            product_id: i.product_id,
            name: i.name,
            quantity: i.quantity,
            unit_price: i.unit_price,
          })),
          customer_id: customer?.id ?? null,
          payment_method: method,
          amount_paid: amountPaid,
          pos_session_id: session?.id ?? null,
          location_id: session?.location_id ?? null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al registrar la venta')
      setCheckout(false)
      setResult({
        ...data,
        created_at: new Date().toISOString(),
        customer_name: customer?.name ?? null,
        items: cart.map((i) => ({ name: i.name, quantity: i.quantity, unit_price: i.unit_price })),
      })
    } catch (e: unknown) {
      setCheckoutError((e as Error).message)
    } finally {
      setCheckoutLoading(false)
    }
  }

  function handleNewSale() {
    setCart([])
    setCustomer(null)
    setResult(null)
    setQuery('')
    setProducts([])
    setTimeout(() => searchRef.current?.focus(), 100)
  }

  // ── Session loading ─────────────────────────────────────────────────────────
  if (sessionLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-fuchsia-200 border-t-fuchsia-600" />
      </div>
    )
  }

  // ── Session opening modal ────────────────────────────────────────────────────
  if (!session) {
    return (
      <SessionOpenModal
        locations={locations}
        userName={userName}
        onOpened={(s) => setSession(s)}
      />
    )
  }

  // ── Success screen ─────────────────────────────────────────────────────────
  if (result) {
    return (
      <SuccessScreen
        result={result}
        storeName={storeName}
        printEnabled={printEnabled}
        formatCurrency={fmt}
        onNewSale={handleNewSale}
      />
    )
  }

  // ── POS layout ─────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen flex-col bg-slate-50 overflow-hidden">
      {/* Top bar */}
      <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-tr from-fuchsia-600 to-rose-500 shadow-sm">
              <Store size={16} className="text-white" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black tracking-tight">
                <span className="bg-gradient-to-r from-fuchsia-600 to-rose-600 bg-clip-text text-transparent">POSFER</span>
              </p>
              <p className="truncate text-[10px] text-slate-400">{storeName}</p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden min-w-0 items-center gap-2 md:flex">
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
                Sucursal: <span className="ml-1 font-semibold text-slate-700">{session.location_name}</span>
              </span>
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
                Hola <span className="ml-1 max-w-40 truncate font-semibold text-slate-700">{userName}</span>, lindo día
              </span>
              <span className="inline-flex min-w-0 items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 tabular-nums">
                <time dateTime={now.toISOString()} className="truncate font-semibold text-slate-700">
                  {formattedNow}
                </time>
              </span>
            </div>

            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  aria-label="Abrir menú de acciones"
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-gradient-to-r from-fuchsia-600 to-rose-500 px-3 text-xs font-semibold text-white shadow-sm shadow-fuchsia-200 transition hover:brightness-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500"
                >
                  <EllipsisVertical size={15} aria-hidden="true" />
                  <span className="hidden sm:inline">Menú</span>
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={8}
                  className="z-50 min-w-48 rounded-xl border border-slate-200 bg-white p-1 shadow-lg shadow-slate-200/70"
                >
                  <DropdownMenu.Item
                    onSelect={() => setShowSales(true)}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none transition hover:bg-slate-50 focus:bg-slate-50"
                  >
                    <ClipboardList size={14} aria-hidden="true" />
                    Mis Ventas
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator className="my-1 h-px bg-slate-100" />
                  <DropdownMenu.Item
                    onSelect={() => setShowCloseSession(true)}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-600 outline-none transition hover:bg-rose-50 focus:bg-rose-50"
                  >
                    <LogOut size={14} aria-hidden="true" />
                    Cierre de Caja
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </div>

      </header>

      {/* Body: split layout */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left: products */}
        <section
          aria-label="Catálogo de productos"
          className="flex flex-1 flex-col overflow-hidden border-r border-slate-200"
        >
          {/* Search */}
          <div className="border-b border-slate-100 bg-white p-3">
            <div className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                ref={searchRef}
                id="pos-search"
                name="pos-search"
                type="search"
                autoComplete="off"
                spellCheck={false}
                value={query}
                onChange={handleQueryChange}
                onKeyDown={handleSearchKey}
                placeholder="Buscar por nombre, SKU o escanear código…"
                className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-4 text-sm outline-none transition focus:border-fuchsia-500 focus:bg-white focus:ring-2 focus:ring-fuchsia-200"
              />
            </div>
          </div>

          {/* Product grid */}
          <div className="flex-1 overflow-y-auto p-3">
            {searching ? (
              <div className="flex h-32 items-center justify-center text-sm text-slate-400">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-fuchsia-500 mr-2" aria-hidden="true" />
                Buscando…
              </div>
            ) : products.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center gap-2 text-slate-400">
                <Package size={28} aria-hidden="true" />
                <p className="text-sm">{query.trim() ? 'Sin resultados' : 'Agrega productos'}</p>
              </div>
            ) : (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" role="list">
                {products.map((product) => {
                  const outOfStock = product.track_stock && product.stock <= 0
                  const inCart = cart.find((i) => i.product_id === product.id)
                  return (
                    <li key={product.id}>
                      <button
                        type="button"
                        onClick={() => addToCart(product)}
                        disabled={outOfStock}
                        aria-label={`Agregar ${product.name}${outOfStock ? ' — sin stock' : ''}`}
                        className={`group relative flex w-full flex-col rounded-xl border bg-white p-3 text-left transition-[transform,box-shadow,border-color] focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500 ${
                          outOfStock
                            ? 'cursor-not-allowed border-slate-100 opacity-50'
                            : inCart
                            ? 'border-fuchsia-300 shadow-sm shadow-fuchsia-100 hover:-translate-y-0.5 hover:shadow-md'
                            : 'border-slate-200 hover:border-fuchsia-200 hover:-translate-y-0.5 hover:shadow-sm'
                        }`}
                      >
                        {inCart && (
                          <span className="absolute right-2 top-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-fuchsia-600 px-1 text-[10px] font-bold text-white tabular-nums">
                            {inCart.quantity}
                          </span>
                        )}
                        <div className="pr-6">
                          <p className="line-clamp-2 text-base font-bold leading-tight text-slate-800">
                            {product.name}
                            {typeof product.savings_percent === 'number' && product.savings_percent > 0 && (
                              <span className="ml-1 text-[11px] font-semibold text-emerald-700">
                                (Ahorro {Math.round(product.savings_percent)}%)
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <p className="text-lg font-black tabular-nums text-slate-900">{fmt(product.base_price)}</p>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-xs font-medium">
                          {product.track_stock && (
                            <p className={product.stock <= 0 ? 'text-rose-500' : product.stock <= 5 ? 'text-amber-500' : 'text-slate-400'}>
                              {product.stock <= 0 ? 'Sin stock' : `${product.stock} en stock`}
                            </p>
                          )}
                          {inCart && (
                            <p className="text-fuchsia-600">
                              En carro: {inCart.quantity}
                            </p>
                          )}
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </section>

        {/* Right: cart */}
        <aside
          aria-label="Carro de venta"
          className="flex w-80 shrink-0 flex-col bg-white lg:w-96"
        >
          {/* Cart header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <ShoppingCart size={16} className="text-fuchsia-600" aria-hidden="true" />
              <h2 className="text-base font-bold text-slate-800">Carro</h2>
            </div>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={() => setCart([])}
                aria-label="Vaciar carro"
                className="text-sm text-rose-500 transition hover:text-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500 rounded"
              >
                Vaciar
              </button>
            )}
          </div>

          {/* Items */}
          <div className="flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-slate-300">
                <ShoppingCart size={36} aria-hidden="true" />
                <p className="text-sm text-center [text-wrap:balance]">Agrega productos desde el catálogo</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-50 px-3 py-2" role="list">
                {cart.map((item) => (
                  <li key={item.product_id} className="flex flex-nowrap items-center gap-2.5 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">{item.name}</p>
                      <p className="text-sm text-slate-400 tabular-nums">{fmt(item.unit_price)} c/u</p>
                    </div>
                    {/* Qty controls */}
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => updateQty(item.product_id, -1)}
                        aria-label={`Reducir cantidad de ${item.name}`}
                        className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 text-slate-500 transition hover:border-fuchsia-300 hover:text-fuchsia-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500"
                      >
                        <Minus size={14} aria-hidden="true" />
                      </button>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={item.track_stock ? Math.max(item.stock, 1) : undefined}
                        value={item.quantity}
                        onChange={(e) => setQty(item.product_id, e.target.value)}
                        onFocus={(e) => e.target.select()}
                        aria-label={`Cantidad de ${item.name}`}
                        className="h-8 w-14 rounded-md border border-slate-200 text-center text-sm font-bold tabular-nums text-slate-800 outline-none focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-200"
                      />
                      <button
                        type="button"
                        onClick={() => updateQty(item.product_id, 1)}
                        disabled={item.track_stock && item.quantity >= item.stock}
                        aria-label={`Aumentar cantidad de ${item.name}`}
                        className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 text-slate-500 transition hover:border-fuchsia-300 hover:text-fuchsia-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500 disabled:opacity-40"
                      >
                        <Plus size={14} aria-hidden="true" />
                      </button>
                    </div>
                    {/* Subtotal + delete */}
                    <div className="flex shrink-0 items-center gap-1">
                      <span className="text-sm font-black tabular-nums text-slate-900">{fmt(item.unit_price * item.quantity)}</span>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.product_id)}
                        aria-label={`Quitar ${item.name} del carro`}
                        className="grid h-8 w-8 place-items-center rounded text-rose-400 transition hover:text-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500"
                      >
                        <X size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer: total + checkout */}
          <div className="border-t border-slate-100 p-4 space-y-3">
            <CustomerSelector selected={customer} onSelect={setCustomer} />
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-600">
                Total{totalItems > 0 ? ` · ${totalItems} ítem${totalItems !== 1 ? 's' : ''}` : ''}
              </span>
              <span className="text-2xl font-black tabular-nums text-slate-900">{fmt(total)}</span>
            </div>
            <button
              type="button"
              onClick={() => { setCheckoutError(''); setCheckout(true) }}
              disabled={cart.length === 0}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-rose-500 py-3.5 text-sm font-bold text-white shadow-md shadow-fuchsia-200 transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500 focus-visible:ring-offset-2 disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none"
            >
              <ShoppingCart size={15} aria-hidden="true" />
              Cobrar
            </button>
            {checkoutError && (
              <p role="alert" aria-live="assertive" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 border border-rose-200">
                {checkoutError}
              </p>
            )}
          </div>
        </aside>
      </div>

      {/* Checkout modal */}
      {showSales && (
        <SalesSheet
          mine={true}
          canVoid={true}
          printEnabled={printEnabled}
          storeName={storeName}
          formatCurrency={fmt}
          onClose={() => setShowSales(false)}
        />
      )}

      {checkout && (
        <CheckoutModal
          total={total}
          customer={customer}
          onCustomerChange={setCustomer}
          onConfirm={handleConfirmSale}
          onClose={() => setCheckout(false)}
          loading={checkoutLoading}
          formatCurrency={fmt}
        />
      )}

      {showCloseSession && (
        <SessionCloseModal
          session={session}
          onClose={() => setShowCloseSession(false)}
          onClosed={() => {
            setShowCloseSession(false)
            setSession(null)
            setCart([])
            setCustomer(null)
            signOut({ callbackUrl: '/login' })
          }}
        />
      )}
    </div>
  )
}
