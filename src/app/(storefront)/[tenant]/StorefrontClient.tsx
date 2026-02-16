'use client'

import { useEffect, useMemo, useState } from 'react'
import { X, ShoppingBag, Truck, ShieldCheck, BadgePercent } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import type { StorefrontBlock, StorefrontColors } from '@/lib/storefront-editor'

interface CategoryItem {
  id: string
  name: string
}

interface ProductItem {
  id: string
  name: string
  description: string | null
  base_price: string | number
  stock: number | null
}

interface VariantItem {
  id: string
  product_id: string | null
  price: string | number | null
  stock: number | null
  sku: string
  attributes: unknown
}

interface CartLine {
  key: string
  productId: string
  variantId: string | null
  name: string
  variantLabel: string | null
  unitPrice: number
  quantity: number
}

interface ThemeTypography {
  headingFont: string
  bodyFont: string
}

interface ThemePromoBar {
  enabled: boolean
  text: string
  ctaLabel: string
  ctaHref: string
  background: string
  textColor: string
}

interface StorefrontClientProps {
  tenantSlug: string
  tenantName: string
  logo: string
  colors: StorefrontColors
  blocks: StorefrontBlock[]
  categories: CategoryItem[]
  products: ProductItem[]
  variants: VariantItem[]
  currency: string
  heroImageUrl: string
  lookbookImageUrl: string
  typography: ThemeTypography
  promoBar: ThemePromoBar
}

function toRgba(hex: string, alpha: number) {
  const clean = hex.replace('#', '')
  const normalized = clean.length === 3
    ? clean.split('').map((char) => `${char}${char}`).join('')
    : clean

  const r = Number.parseInt(normalized.slice(0, 2), 16)
  const g = Number.parseInt(normalized.slice(2, 4), 16)
  const b = Number.parseInt(normalized.slice(4, 6), 16)

  if ([r, g, b].some((value) => Number.isNaN(value))) {
    return `rgba(0,0,0,${alpha})`
  }

  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function SectionTitle({ title, colors, fontFamily }: { title: string; colors: StorefrontColors; fontFamily: string }) {
  return (
    <h3 className="text-3xl font-semibold tracking-tight md:text-4xl" style={{ color: colors.text, fontFamily }}>
      {title}
    </h3>
  )
}

function BlockShell({
  id,
  children,
  colors,
}: {
  id?: string
  children: React.ReactNode
  colors: StorefrontColors
}) {
  return (
    <section
      id={id}
      className="relative overflow-hidden rounded-3xl border p-5 md:p-8"
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.accent,
        boxShadow: `0 20px 55px ${toRgba(colors.text, 0.08)}`,
      }}
    >
      {children}
    </section>
  )
}

function variantLabel(variant: VariantItem): string {
  if (typeof variant.attributes === 'string') {
    return variant.attributes
  }

  if (variant.attributes && typeof variant.attributes === 'object' && !Array.isArray(variant.attributes)) {
    const values = Object.values(variant.attributes as Record<string, unknown>)
      .map((value) => String(value))
      .filter(Boolean)
    if (values.length > 0) return values.join(' / ')
  }

  return variant.sku || `Variante ${variant.id.slice(0, 6)}`
}

export default function StorefrontClient({
  tenantSlug,
  tenantName,
  logo,
  colors,
  blocks,
  categories,
  products,
  variants,
  currency,
  heroImageUrl,
  lookbookImageUrl,
  typography,
  promoBar,
}: StorefrontClientProps) {
  const [cartOpen, setCartOpen] = useState(false)
  const [cartLines, setCartLines] = useState<CartLine[]>([])
  const [selectedVariantByProduct, setSelectedVariantByProduct] = useState<Record<string, string>>({})
  const [checkingOut, setCheckingOut] = useState(false)
  const [checkoutMsg, setCheckoutMsg] = useState<string | null>(null)

  const storageKey = useMemo(() => `vf_store_cart_${tenantSlug}`, [tenantSlug])

  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const raw = window.localStorage.getItem(storageKey)
      if (!raw) return
      const parsed = JSON.parse(raw) as CartLine[]
      if (Array.isArray(parsed)) {
        const sanitized = parsed.filter((line) => line && typeof line.key === 'string' && line.quantity > 0)
        setCartLines(sanitized)
      }
    } catch {
      // ignore corrupted local state
    }
  }, [storageKey])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(storageKey, JSON.stringify(cartLines))
  }, [cartLines, storageKey])

  const variantsByProduct = useMemo(() => {
    const map = new Map<string, VariantItem[]>()
    for (const variant of variants) {
      if (!variant.product_id) continue
      const current = map.get(variant.product_id) ?? []
      current.push(variant)
      map.set(variant.product_id, current)
    }
    return map
  }, [variants])

  function getSelectedVariant(productId: string): VariantItem | null {
    const list = variantsByProduct.get(productId) ?? []
    if (!list.length) return null
    const selectedId = selectedVariantByProduct[productId]
    if (!selectedId) return list[0]
    return list.find((variant) => variant.id === selectedId) ?? list[0]
  }

  function addToCart(product: ProductItem) {
    const selectedVariant = getSelectedVariant(product.id)
    const unitPrice = selectedVariant?.price !== null && selectedVariant?.price !== undefined
      ? Number(selectedVariant.price)
      : Number(product.base_price)

    const key = selectedVariant ? `${product.id}::${selectedVariant.id}` : product.id

    setCartLines((prev) => {
      const idx = prev.findIndex((line) => line.key === key)
      if (idx < 0) {
        return [
          ...prev,
          {
            key,
            productId: product.id,
            variantId: selectedVariant?.id ?? null,
            name: product.name,
            variantLabel: selectedVariant ? variantLabel(selectedVariant) : null,
            unitPrice,
            quantity: 1,
          },
        ]
      }

      const next = [...prev]
      next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 }
      return next
    })

    setCheckoutMsg(null)
    setCartOpen(true)
  }

  function updateQty(lineKey: string, delta: number) {
    setCartLines((prev) =>
      prev
        .map((line) => (line.key === lineKey ? { ...line, quantity: line.quantity + delta } : line))
        .filter((line) => line.quantity > 0)
    )
  }

  async function checkout() {
    try {
      setCheckingOut(true)
      setCheckoutMsg(null)

      const response = await fetch('/api/storefront/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_slug: tenantSlug,
          items: cartLines.map((line) => ({
            product_id: line.productId,
            variant_id: line.variantId,
            quantity: line.quantity,
          })),
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(typeof data?.error === 'string' ? data.error : 'Error en checkout')
      }

      setCartLines([])
      setCheckoutMsg(`Orden ${data.order_number} creada correctamente.`)
    } catch (error) {
      setCheckoutMsg(error instanceof Error ? error.message : 'No se pudo finalizar compra')
    } finally {
      setCheckingOut(false)
    }
  }

  const cartCount = useMemo(() => cartLines.reduce((acc, line) => acc + line.quantity, 0), [cartLines])
  const cartSubtotal = useMemo(() => cartLines.reduce((acc, line) => acc + line.unitPrice * line.quantity, 0), [cartLines])

  const headingStyle = { fontFamily: typography.headingFont, color: colors.text }
  const textStyle = { fontFamily: typography.bodyFont, color: colors.mutedText }

  const renderedBlocks = blocks.map((block) => {
    if (block.type === 'hero') {
      return (
        <BlockShell key={block.id} colors={colors}>
          <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full blur-3xl" style={{ backgroundColor: toRgba(colors.primary, 0.16) }} />
          <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:items-center">
            <div className="relative z-10">
              <p
                className="inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]"
                style={{ borderColor: colors.accent, color: colors.mutedText }}
              >
                {block.title}
              </p>
              <h2 className="mt-4 max-w-[14ch] text-4xl font-semibold leading-tight md:text-6xl" style={headingStyle}>
                Viste, equipa y vende con estilo
              </h2>
              <p className="mt-4 max-w-2xl text-base md:text-lg" style={textStyle}>
                {tenantName} combina una experiencia premium con checkout simple. Explora productos nuevos y ofertas limitadas.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <a
                  href="#productos"
                  className="inline-flex rounded-xl border px-5 py-3 text-sm font-semibold"
                  style={{ borderColor: colors.primary, backgroundColor: colors.primary, color: '#ffffff' }}
                >
                  Comprar ahora
                </a>
                <a
                  href="#colecciones"
                  className="inline-flex rounded-xl border px-5 py-3 text-sm font-semibold"
                  style={{ borderColor: colors.accent, color: colors.text }}
                >
                  Ver colecciones
                </a>
              </div>
              <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {[
                  { icon: Truck, label: 'Envio 24/48h' },
                  { icon: ShieldCheck, label: 'Pago protegido' },
                  { icon: BadgePercent, label: 'Ofertas semanales' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2 rounded-xl border px-3 py-2 text-xs" style={{ borderColor: colors.accent, backgroundColor: toRgba(colors.background, 0.7), ...textStyle }}>
                    <item.icon size={14} />
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div
                className="aspect-[4/5] rounded-2xl border"
                style={{
                  borderColor: colors.accent,
                  backgroundColor: colors.background,
                  backgroundImage: heroImageUrl
                    ? `linear-gradient(${toRgba(colors.text, 0.08)}, ${toRgba(colors.text, 0.08)}), url(${heroImageUrl})`
                    : `linear-gradient(135deg, ${toRgba(colors.primary, 0.14)}, ${toRgba(colors.text, 0.08)})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
              <div className="absolute -bottom-4 -left-4 rounded-xl border px-3 py-2 text-xs font-semibold" style={{ borderColor: colors.accent, backgroundColor: colors.surface, color: colors.text }}>
                Nuevo drop disponible
              </div>
            </div>
          </div>
        </BlockShell>
      )
    }

    if (block.type === 'collections') {
      return (
        <BlockShell key={block.id} id="colecciones" colors={colors}>
          <div className="flex items-end justify-between gap-4">
            <SectionTitle title={block.title} colors={colors} fontFamily={typography.headingFont} />
            <span className="text-sm" style={textStyle}>Curadas para convertir</span>
          </div>

          {categories.length === 0 ? (
            <p className="mt-4 text-sm" style={textStyle}>
              No hay colecciones para mostrar.
            </p>
          ) : (
            <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {categories.map((category, index) => (
                <button
                  key={category.id}
                  type="button"
                  className="group relative overflow-hidden rounded-2xl border px-4 py-6 text-left transition duration-200 hover:-translate-y-0.5"
                  style={{ borderColor: colors.accent, backgroundColor: colors.background, fontFamily: typography.bodyFont }}
                >
                  <div className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: index % 2 ? colors.primary : colors.mutedText }} />
                  <p className="text-sm font-semibold md:text-base" style={{ color: colors.text }}>{category.name}</p>
                  <p className="mt-1 text-xs" style={textStyle}>Ver categoria</p>
                </button>
              ))}
            </div>
          )}
        </BlockShell>
      )
    }

    if (block.type === 'lookbook') {
      return (
        <BlockShell key={block.id} id="lookbook" colors={colors}>
          <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
            <div
              className="min-h-[320px] rounded-2xl border"
              style={{
                borderColor: colors.accent,
                backgroundColor: colors.background,
                backgroundImage: lookbookImageUrl
                  ? `linear-gradient(${toRgba(colors.text, 0.15)}, ${toRgba(colors.text, 0.1)}), url(${lookbookImageUrl})`
                  : `linear-gradient(135deg, ${toRgba(colors.primary, 0.22)}, ${toRgba(colors.text, 0.1)})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
            <div className="rounded-2xl border p-5" style={{ borderColor: colors.accent, backgroundColor: colors.surface }}>
              <h4 className="text-2xl font-semibold" style={headingStyle}>{block.title}</h4>
              <p className="mt-2 text-sm" style={textStyle}>Combinaciones listas para comprar. Selecciona un look y agrega productos con un click.</p>
              <div className="mt-4 space-y-2">
                {products.slice(0, 3).map((product) => (
                  <div key={product.id} className="flex items-center justify-between rounded-lg border px-3 py-2" style={{ borderColor: colors.accent }}>
                    <span className="text-sm" style={{ color: colors.text, fontFamily: typography.bodyFont }}>{product.name}</span>
                    <button
                      type="button"
                      onClick={() => addToCart(product)}
                      className="rounded-md border px-2 py-1 text-xs font-semibold"
                      style={{ borderColor: colors.primary, color: colors.primary, fontFamily: typography.bodyFont }}
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </BlockShell>
      )
    }

    if (block.type === 'featured') {
      return (
        <BlockShell key={block.id} id="productos" colors={colors}>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <SectionTitle title={block.title} colors={colors} fontFamily={typography.headingFont} />
            <a href="#" className="text-sm font-medium" style={{ color: colors.mutedText }}>
              Ver catalogo completo
            </a>
          </div>

          {products.length === 0 ? (
            <p className="py-10 text-center text-sm" style={{ color: colors.mutedText }}>
              No hay productos disponibles en este momento.
            </p>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {products.map((product) => {
                const productVariants = variantsByProduct.get(product.id) ?? []
                const selectedVariant = getSelectedVariant(product.id)
                const price = selectedVariant?.price !== null && selectedVariant?.price !== undefined
                  ? Number(selectedVariant.price)
                  : Number(product.base_price)
                const stock = selectedVariant?.stock ?? product.stock

                return (
                  <Card
                    key={product.id}
                    className="group overflow-hidden rounded-2xl border shadow-none transition duration-200 hover:-translate-y-1"
                    style={{ borderColor: colors.accent, backgroundColor: colors.surface, boxShadow: `0 16px 35px ${toRgba(colors.text, 0.08)}` }}
                  >
                    <CardContent className="p-0">
                      <div
                        className="relative flex aspect-square items-center justify-center overflow-hidden"
                        style={{ background: `linear-gradient(135deg, ${toRgba(colors.primary, 0.12)}, ${toRgba(colors.background, 0.95)})` }}
                      >
                        <span className="text-4xl">📦</span>
                        <span className="absolute right-3 top-3 rounded-full px-2 py-1 text-[10px] font-semibold uppercase" style={{ backgroundColor: colors.surface, color: colors.mutedText }}>
                          {stock && stock > 0 ? 'Disponible' : 'Sin stock'}
                        </span>
                      </div>
                      <div className="p-4">
                        <h4 className="mb-1 line-clamp-2 text-base font-semibold" style={{ color: colors.text }}>
                          {product.name}
                        </h4>
                        {product.description && (
                          <p className="mb-3 line-clamp-2 text-sm" style={{ color: colors.mutedText }}>
                            {product.description}
                          </p>
                        )}

                        {productVariants.length > 0 && (
                          <select
                            value={selectedVariant?.id ?? productVariants[0].id}
                            onChange={(event) =>
                              setSelectedVariantByProduct((prev) => ({
                                ...prev,
                                [product.id]: event.target.value,
                              }))
                            }
                            className="mb-3 h-9 w-full rounded-lg border px-2 text-sm"
                            style={{ borderColor: colors.accent, color: colors.text, backgroundColor: colors.surface }}
                          >
                            {productVariants.map((variant) => (
                              <option key={variant.id} value={variant.id}>
                                {variantLabel(variant)}
                              </option>
                            ))}
                          </select>
                        )}

                        <div className="flex items-center justify-between gap-2">
                          <span className="text-lg font-semibold" style={{ color: colors.text }}>
                            {formatCurrency(price, currency)}
                          </span>
                          <Button
                            size="sm"
                            onClick={() => addToCart(product)}
                            style={{ backgroundColor: colors.primary, color: '#ffffff' }}
                            className="rounded-lg border-0"
                          >
                            Quick add
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </BlockShell>
      )
    }

    if (block.type === 'testimonials') {
      return (
        <BlockShell key={block.id} colors={colors}>
          <SectionTitle title={block.title} colors={colors} fontFamily={typography.headingFont} />
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            {[
              { who: 'Camila R.', text: 'Subimos este theme y la conversion mejoro en 2 semanas.' },
              { who: 'Martin V.', text: 'El sitio se siente premium y el checkout es muy rapido.' },
            ].map((item) => (
              <blockquote
                key={item.who}
                className="rounded-2xl border p-5 text-sm"
                style={{ borderColor: colors.accent, color: colors.mutedText, backgroundColor: colors.background }}
              >
                <p>"{item.text}"</p>
                <footer className="mt-3 text-xs font-semibold" style={{ color: colors.text }}>
                  {item.who}
                </footer>
              </blockquote>
            ))}
          </div>
        </BlockShell>
      )
    }

    return (
      <BlockShell key={block.id} id="contacto" colors={colors}>
        <div className="rounded-2xl border p-6" style={{ borderColor: colors.accent, backgroundColor: toRgba(colors.primary, 0.96), color: '#ffffff' }}>
          <SectionTitle title={block.title} colors={{ ...colors, text: '#ffffff' }} fontFamily={typography.headingFont} />
          <p className="mt-3 text-sm" style={{ color: toRgba('#ffffff', 0.86), fontFamily: typography.bodyFont }}>
            Recibe noticias de lanzamiento y descuentos exclusivos.
          </p>
          <form className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              type="email"
              placeholder="tu@email.com"
              className="h-11 flex-1 rounded-lg border px-3 text-sm"
              style={{ borderColor: toRgba('#ffffff', 0.35), backgroundColor: toRgba('#ffffff', 0.08), color: '#ffffff', fontFamily: typography.bodyFont }}
            />
            <button
              type="submit"
              className="rounded-lg border px-5 py-3 text-sm font-semibold"
              style={{ borderColor: '#ffffff', backgroundColor: '#ffffff', color: colors.primary }}
            >
              Suscribirme
            </button>
          </form>
        </div>
      </BlockShell>
    )
  })

  return (
    <>
      {promoBar.enabled && (
        <div className="border-b px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.2em]" style={{ backgroundColor: promoBar.background, borderColor: promoBar.background, color: promoBar.textColor, fontFamily: typography.bodyFont }}>
          {promoBar.text} {promoBar.ctaLabel ? `• ${promoBar.ctaLabel}` : ''}
        </div>
      )}

      <header
        className="sticky top-0 z-20 border-b backdrop-blur"
        style={{ backgroundColor: toRgba(colors.surface, 0.95), borderColor: colors.accent }}
      >
        <div className="mx-auto flex min-h-[78px] max-w-7xl items-center justify-between gap-4 px-4">
          <div className="min-w-0">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt={`Logo ${tenantName}`} className="h-9 w-auto max-w-[200px] object-contain" />
            ) : (
              <h1 className="text-2xl font-semibold tracking-tight" style={{ color: colors.text, fontFamily: typography.headingFont }}>
                {tenantName}
              </h1>
            )}
          </div>

          <nav className="hidden items-center gap-6 text-sm md:flex" style={{ color: colors.mutedText, fontFamily: typography.bodyFont }}>
            <a href="#" className="font-medium hover:opacity-70">Inicio</a>
            <div className="group relative">
              <button type="button" className="font-medium hover:opacity-70">Colecciones</button>
              <div
                className="invisible absolute left-1/2 top-full z-30 mt-4 w-[760px] -translate-x-1/2 rounded-2xl border bg-white p-6 opacity-0 shadow-2xl transition group-hover:visible group-hover:opacity-100"
                style={{ borderColor: colors.accent }}
              >
                <div className="grid grid-cols-[1.3fr_1fr] gap-4">
                  <div className="grid grid-cols-3 gap-3">
                    {categories.slice(0, 9).map((category) => (
                      <a
                        key={category.id}
                        href="#colecciones"
                        className="rounded-xl border px-3 py-3 text-sm font-medium transition hover:-translate-y-0.5"
                        style={{ borderColor: colors.accent, color: colors.text, backgroundColor: colors.background }}
                      >
                        {category.name}
                      </a>
                    ))}
                  </div>
                  <div className="rounded-2xl border p-4" style={{ borderColor: colors.accent, backgroundColor: colors.background }}>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ ...textStyle }}>Trending</p>
                    <p className="mt-2 text-sm font-semibold" style={{ color: colors.text, fontFamily: typography.headingFont }}>Nuevos ingresos de temporada</p>
                    <p className="mt-1 text-xs" style={{ ...textStyle }}>Explora los productos mas buscados de la semana.</p>
                  </div>
                </div>
              </div>
            </div>
            <a href="#productos" className="font-medium hover:opacity-70">Productos</a>
            <a href="#contacto" className="font-medium hover:opacity-70">Contacto</a>
          </nav>

          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium"
            style={{ borderColor: colors.accent, color: colors.text, backgroundColor: colors.surface }}
          >
            <ShoppingBag size={16} />
            Carro ({cartCount})
          </button>
        </div>
      </header>

      <main className="relative">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-24 top-16 h-80 w-80 rounded-full blur-3xl" style={{ backgroundColor: toRgba(colors.primary, 0.12) }} />
          <div className="absolute -right-20 top-[420px] h-72 w-72 rounded-full blur-3xl" style={{ backgroundColor: toRgba(colors.text, 0.08) }} />
        </div>
        <div className="relative mx-auto grid max-w-7xl gap-6 px-4 py-6 md:py-8">{renderedBlocks}</div>
      </main>

      {cartOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/40"
          aria-label="Cerrar carrito"
          onClick={() => setCartOpen(false)}
        />
      )}

      <aside
        className={`fixed right-0 top-0 z-40 h-full w-full max-w-md border-l bg-white p-5 shadow-2xl transition-transform ${
          cartOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ borderColor: colors.accent }}
        aria-hidden={!cartOpen}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold" style={{ color: colors.text, fontFamily: typography.headingFont }}>Tu carrito</h2>
          <button
            type="button"
            onClick={() => setCartOpen(false)}
            className="rounded-lg border p-2"
            style={{ borderColor: colors.accent }}
          >
            <X size={16} />
          </button>
        </div>

        {cartLines.length === 0 ? (
          <p className="text-sm" style={{ ...textStyle }}>Aun no agregas productos.</p>
        ) : (
          <div className="space-y-3">
            {cartLines.map((line) => (
              <article key={line.key} className="rounded-xl border p-3" style={{ borderColor: colors.accent }}>
                <p className="text-sm font-medium" style={{ color: colors.text, fontFamily: typography.bodyFont }}>{line.name}</p>
                {line.variantLabel && (
                  <p className="mt-0.5 text-xs" style={{ ...textStyle }}>
                    {line.variantLabel}
                  </p>
                )}
                <p className="mt-1 text-sm" style={{ ...textStyle }}>
                  {formatCurrency(line.unitPrice, currency)}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateQty(line.key, -1)}
                    className="rounded-md border px-2 py-1 text-sm"
                    style={{ borderColor: colors.accent }}
                  >
                    -
                  </button>
                  <span className="text-sm" style={{ color: colors.text, fontFamily: typography.bodyFont }}>{line.quantity}</span>
                  <button
                    type="button"
                    onClick={() => updateQty(line.key, 1)}
                    className="rounded-md border px-2 py-1 text-sm"
                    style={{ borderColor: colors.accent }}
                  >
                    +
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        {checkoutMsg && (
          <p className="mt-3 text-sm" style={{ ...textStyle }}>
            {checkoutMsg}
          </p>
        )}

        <div className="mt-5 border-t pt-4" style={{ borderColor: colors.accent }}>
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ ...textStyle }}>Subtotal</span>
            <strong style={{ color: colors.text, fontFamily: typography.headingFont }}>{formatCurrency(cartSubtotal, currency)}</strong>
          </div>
          <button
            type="button"
            disabled={!cartLines.length || checkingOut}
            onClick={checkout}
            className="mt-4 w-full rounded-xl border px-4 py-3 text-sm font-semibold disabled:opacity-50"
            style={{ borderColor: colors.primary, backgroundColor: colors.primary, color: '#ffffff' }}
          >
            {checkingOut ? 'Procesando...' : 'Finalizar compra'}
          </button>
        </div>
      </aside>
    </>
  )
}
