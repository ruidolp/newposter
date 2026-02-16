'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  Copy,
  Eye,
  EyeOff,
  ImagePlus,
  MoveDown,
  MoveUp,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Type,
  X,
} from 'lucide-react'

type BlockType = 'hero' | 'featured' | 'collections' | 'testimonials' | 'newsletter' | 'lookbook'

interface ThemeColors {
  background: string
  surface: string
  primary: string
  accent: string
  text: string
  mutedText: string
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

interface BlockContent {
  heading?: string
  body?: string
  ctaLabel?: string
  items?: string[]
}

interface CanvasBlock {
  id: string
  type: BlockType
  title: string
  enabled: boolean
  content?: BlockContent
}

interface ThemePreset {
  id: string
  name: string
  description: string
  colors: ThemeColors
  typography: ThemeTypography
  promoBar: ThemePromoBar
  blocks: BlockType[]
}

const FONT_OPTIONS = [
  { label: 'Playfair Display', value: `'Playfair Display', Georgia, serif` },
  { label: 'Cormorant Garamond', value: `'Cormorant Garamond', Georgia, serif` },
  { label: 'Manrope', value: `'Manrope', 'Segoe UI', sans-serif` },
  { label: 'Space Grotesk', value: `'Space Grotesk', 'Segoe UI', sans-serif` },
  { label: 'DM Sans', value: `'DM Sans', 'Segoe UI', sans-serif` },
  { label: 'Poppins', value: `'Poppins', 'Segoe UI', sans-serif` },
]

const BLOCK_LIBRARY: { type: BlockType; label: string; description: string }[] = [
  { type: 'hero', label: 'Hero principal', description: 'Banner principal con CTA fuerte' },
  { type: 'featured', label: 'Productos destacados', description: 'Grid de productos con foco comercial' },
  { type: 'collections', label: 'Colecciones', description: 'Accesos rápidos por categoría' },
  { type: 'lookbook', label: 'Shop the look', description: 'Bloque editorial con imagen protagonista' },
  { type: 'testimonials', label: 'Testimonios', description: 'Prueba social para mejorar conversión' },
  { type: 'newsletter', label: 'Newsletter', description: 'Captura de emails y ofertas' },
]

const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'dawn-classic',
    name: 'Dawn Classic',
    description: 'Inspirado en Dawn: minimal, limpio y centrado en producto.',
    colors: {
      background: '#F3F3F3',
      surface: '#FFFFFF',
      primary: '#111111',
      accent: '#E5E5E5',
      text: '#1C1B1B',
      mutedText: '#4A4A4A',
    },
    typography: {
      headingFont: `'Playfair Display', Georgia, serif`,
      bodyFont: `'Manrope', 'Segoe UI', sans-serif`,
    },
    promoBar: {
      enabled: true,
      text: 'Envio gratis + cambios sin costo en 30 dias',
      ctaLabel: 'Ver ofertas',
      ctaHref: '#productos',
      background: '#111111',
      textColor: '#FFFFFF',
    },
    blocks: ['hero', 'collections', 'featured', 'lookbook', 'newsletter'],
  },
  {
    id: 'dawn-contrast',
    name: 'Dawn Contrast',
    description: 'Misma estructura con mayor contraste para campañas.',
    colors: {
      background: '#F8FAFC',
      surface: '#FFFFFF',
      primary: '#0F172A',
      accent: '#CBD5E1',
      text: '#0F172A',
      mutedText: '#475569',
    },
    typography: {
      headingFont: `'Space Grotesk', 'Segoe UI', sans-serif`,
      bodyFont: `'DM Sans', 'Segoe UI', sans-serif`,
    },
    promoBar: {
      enabled: true,
      text: 'Lanzamiento de temporada con precios exclusivos',
      ctaLabel: 'Comprar',
      ctaHref: '#productos',
      background: '#0F172A',
      textColor: '#FFFFFF',
    },
    blocks: ['hero', 'featured', 'lookbook', 'testimonials', 'newsletter'],
  },
]

function findBlockLabel(type: BlockType): string {
  return BLOCK_LIBRARY.find((item) => item.type === type)?.label ?? type
}

function defaultBlockContent(type: BlockType): BlockContent {
  if (type === 'hero') {
    return {
      heading: 'Descubre lo nuevo de la semana',
      body: 'Layout limpio, navegación clara y foco en producto.',
      ctaLabel: 'Comprar ahora',
    }
  }
  if (type === 'featured') {
    return {
      body: 'Productos destacados de la semana.',
    }
  }
  if (type === 'collections') {
    return {
      body: 'Explora por categoría',
      items: ['Hombre', 'Mujer', 'Accesorios', 'Deportes'],
    }
  }
  if (type === 'lookbook') {
    return {
      body: 'Shop the look editorial.',
    }
  }
  if (type === 'testimonials') {
    return {
      body: 'Clientes felices.',
    }
  }
  return {
    body: 'Suscripción y ofertas.',
    ctaLabel: 'Suscribirme',
  }
}

function newBlock(type: BlockType): CanvasBlock {
  const uid = Math.random().toString(36).slice(2, 9)
  return {
    id: `${type}-${Date.now()}-${uid}`,
    type,
    title: findBlockLabel(type),
    enabled: true,
    content: defaultBlockContent(type),
  }
}

function buildPresetBlocks(presetId: string): CanvasBlock[] {
  const preset = THEME_PRESETS.find((item) => item.id === presetId) ?? THEME_PRESETS[0]
  return preset.blocks.map((type) => newBlock(type))
}

function ensureBlockContent(block: CanvasBlock): CanvasBlock {
  return {
    ...block,
    content: {
      ...defaultBlockContent(block.type),
      ...(block.content ?? {}),
    },
  }
}

function blockHtml(block: CanvasBlock): string {
  const content = {
    ...defaultBlockContent(block.type),
    ...(block.content ?? {}),
  }

  if (block.type === 'hero') {
    return `<section><h2>${content.heading ?? block.title}</h2><p>${content.body ?? ''}</p><button>${content.ctaLabel ?? 'Comprar ahora'}</button></section>`
  }
  if (block.type === 'featured') {
    return `<section><h2>${block.title}</h2><p>${content.body ?? ''}</p></section>`
  }
  if (block.type === 'collections') {
    const items = (content.items ?? []).filter(Boolean)
    return `<section><h2>${block.title}</h2><p>${content.body ?? ''}</p><p>${items.join(' • ')}</p></section>`
  }
  if (block.type === 'lookbook') {
    return `<section><h2>${block.title}</h2><p>${content.body ?? ''}</p></section>`
  }
  if (block.type === 'testimonials') {
    return `<section><h2>${block.title}</h2><p>${content.body ?? ''}</p></section>`
  }
  return `<section><h2>${block.title}</h2><p>${content.body ?? ''}</p><button>${content.ctaLabel ?? 'Suscribirme'}</button></section>`
}

function buildHtmlExport(
  colors: ThemeColors,
  blocks: CanvasBlock[],
  logoUrl: string,
  heroImageUrl: string,
  lookbookImageUrl: string,
  typography: ThemeTypography,
  promoBar: ThemePromoBar
) {
  const enabledBlocks = blocks.filter((item) => item.enabled).map((item) => blockHtml(item)).join('')
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Storefront exportado</title>
  <style>
    :root {
      --vf-background: ${colors.background};
      --vf-surface: ${colors.surface};
      --vf-primary: ${colors.primary};
      --vf-accent: ${colors.accent};
      --vf-text: ${colors.text};
      --vf-muted: ${colors.mutedText};
    }
    * { box-sizing: border-box; }
    body { margin:0; font-family:${typography.bodyFont}; background:var(--vf-background); color:var(--vf-text); }
    h1,h2,h3 { font-family:${typography.headingFont}; }
    section { background:var(--vf-surface); border:1px solid var(--vf-accent); padding:24px; margin:14px 0; }
    .vf-wrap { max-width: 1200px; margin:0 auto; padding: 0 20px; }
    .vf-head { min-height: 72px; display:flex; justify-content:space-between; align-items:center; }
    .vf-logo { height:36px; object-fit:contain; }
    .vf-media { margin-top: 16px; border: 1px solid var(--vf-accent); background-size: cover; background-position:center; }
  </style>
</head>
<body>
  ${promoBar.enabled ? `<div style="background:${promoBar.background};color:${promoBar.textColor};padding:10px;text-align:center;font-size:12px;letter-spacing:.1em;text-transform:uppercase;">${promoBar.text}${promoBar.ctaLabel ? ` • ${promoBar.ctaLabel}` : ''}</div>` : ''}
  <header style="background:var(--vf-surface);border-bottom:1px solid var(--vf-accent);">
    <div class="vf-wrap vf-head">
      ${logoUrl ? `<img class="vf-logo" src="${logoUrl}" alt="Logo" />` : '<strong>Mi Tienda</strong>'}
      <nav style="color:var(--vf-muted);font-size:14px;">Inicio • Colecciones • Contacto</nav>
    </div>
  </header>
  <main class="vf-wrap">
    ${enabledBlocks}
    ${heroImageUrl ? `<div class="vf-media" style="aspect-ratio:16/7;background-image:url('${heroImageUrl}')"></div>` : ''}
    ${lookbookImageUrl ? `<div class="vf-media" style="aspect-ratio:16/9;background-image:url('${lookbookImageUrl}')"></div>` : ''}
  </main>
</body>
</html>`
}

function renderPreviewBlock(
  block: CanvasBlock,
  colors: ThemeColors,
  typography: ThemeTypography,
  heroImageUrl: string,
  lookbookImageUrl: string
) {
  const content = {
    ...defaultBlockContent(block.type),
    ...(block.content ?? {}),
  }
  const headingStyle = { fontFamily: typography.headingFont, color: colors.text }
  const textStyle = { fontFamily: typography.bodyFont, color: colors.mutedText }

  if (block.type === 'hero') {
    return (
      <section className="border p-6 md:p-10" style={{ borderColor: colors.accent, backgroundColor: colors.surface }}>
        <h2 className="max-w-[14ch] text-4xl font-semibold leading-tight md:text-5xl" style={headingStyle}>
          {content.heading || block.title}
        </h2>
        <p className="mt-4 text-base" style={textStyle}>{content.body}</p>
        <div
          className="mt-6 aspect-[16/7] border"
          style={{
            borderColor: colors.accent,
            backgroundColor: colors.background,
            backgroundImage: heroImageUrl ? `url(${heroImageUrl})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <button
          type="button"
          className="mt-6 border px-5 py-3 text-sm font-semibold"
          style={{ borderColor: colors.primary, backgroundColor: colors.primary, color: '#ffffff', fontFamily: typography.bodyFont }}
        >
          {content.ctaLabel || 'Comprar ahora'}
        </button>
      </section>
    )
  }

  if (block.type === 'collections') {
    return (
      <section className="border p-6" style={{ borderColor: colors.accent, backgroundColor: colors.surface }}>
        <h3 className="text-2xl font-semibold" style={headingStyle}>{block.title}</h3>
        <p className="mt-2 text-sm" style={textStyle}>{content.body}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {(content.items ?? []).filter(Boolean).map((item) => (
            <span key={item} className="border px-4 py-2 text-sm" style={{ borderColor: colors.accent, color: colors.text, fontFamily: typography.bodyFont }}>
              {item}
            </span>
          ))}
        </div>
      </section>
    )
  }

  if (block.type === 'lookbook') {
    return (
      <section className="border p-6" style={{ borderColor: colors.accent, backgroundColor: colors.surface }}>
        <h3 className="text-2xl font-semibold" style={headingStyle}>{block.title}</h3>
        <p className="mt-2 text-sm" style={textStyle}>{content.body}</p>
        <div
          className="mt-4 aspect-[16/9] border"
          style={{
            borderColor: colors.accent,
            backgroundColor: colors.background,
            backgroundImage: lookbookImageUrl ? `url(${lookbookImageUrl})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      </section>
    )
  }

  return (
    <section className="border p-6" style={{ borderColor: colors.accent, backgroundColor: colors.surface }}>
      <h3 className="text-2xl font-semibold" style={headingStyle}>{block.title}</h3>
      <p className="mt-3 text-sm" style={textStyle}>{content.body ?? 'Bloque de ejemplo para el storefront.'}</p>
      {(block.type === 'newsletter' && content.ctaLabel) && (
        <button
          type="button"
          className="mt-4 border px-5 py-2.5 text-sm font-semibold"
          style={{ borderColor: colors.primary, backgroundColor: colors.primary, color: '#ffffff', fontFamily: typography.bodyFont }}
        >
          {content.ctaLabel}
        </button>
      )}
    </section>
  )
}

export default function EditorVisualClient() {
  const [presetId, setPresetId] = useState(THEME_PRESETS[0].id)
  const [colors, setColors] = useState<ThemeColors>(THEME_PRESETS[0].colors)
  const [typography, setTypography] = useState<ThemeTypography>(THEME_PRESETS[0].typography)
  const [promoBar, setPromoBar] = useState<ThemePromoBar>(THEME_PRESETS[0].promoBar)
  const [blocks, setBlocks] = useState<CanvasBlock[]>(() => buildPresetBlocks(THEME_PRESETS[0].id))
  const [logo, setLogo] = useState('')
  const [heroImageUrl, setHeroImageUrl] = useState('')
  const [lookbookImageUrl, setLookbookImageUrl] = useState('')
  const [selectedId, setSelectedId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const selectedBlock = useMemo(() => blocks.find((item) => item.id === selectedId) ?? null, [blocks, selectedId])

  function notify(type: 'success' | 'error', message: string) {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const response = await fetch('/api/storefront-theme')
        if (!response.ok) throw new Error()
        const data = await response.json()
        const editor = data.editor as {
          presetId?: string
          colors?: ThemeColors
          blocks?: CanvasBlock[]
          heroImageUrl?: string
          lookbookImageUrl?: string
          typography?: ThemeTypography
          promoBar?: ThemePromoBar
        } | null

        if (typeof data.logo === 'string') setLogo(data.logo)
        if (!editor) return

        const nextPresetId =
          typeof editor.presetId === 'string' && THEME_PRESETS.some((item) => item.id === editor.presetId)
            ? editor.presetId
            : THEME_PRESETS[0].id

        setPresetId(nextPresetId)
        if (editor.colors) setColors(editor.colors)
        if (editor.typography) setTypography(editor.typography)
        if (editor.promoBar) setPromoBar(editor.promoBar)
        if (typeof editor.heroImageUrl === 'string') setHeroImageUrl(editor.heroImageUrl)
        if (typeof editor.lookbookImageUrl === 'string') setLookbookImageUrl(editor.lookbookImageUrl)
        if (Array.isArray(editor.blocks) && editor.blocks.length > 0) {
          const hydrated = editor.blocks.map((block) => ensureBlockContent(block))
          setBlocks(hydrated)
          setSelectedId(hydrated[0].id)
        }
      } catch {
        notify('error', 'No se pudo cargar el editor visual')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function applyPreset(nextPresetId: string) {
    const preset = THEME_PRESETS.find((item) => item.id === nextPresetId) ?? THEME_PRESETS[0]
    const nextBlocks = buildPresetBlocks(preset.id)
    setPresetId(preset.id)
    setColors(preset.colors)
    setTypography(preset.typography)
    setPromoBar(preset.promoBar)
    setBlocks(nextBlocks)
    setSelectedId(nextBlocks[0]?.id ?? '')
  }

  function updateSelectedBlock(next: Partial<CanvasBlock>) {
    if (!selectedBlock) return
    setBlocks((prev) => prev.map((item) => (
      item.id === selectedBlock.id ? { ...item, ...next } : item
    )))
  }

  function updateSelectedContent(next: Partial<BlockContent>) {
    if (!selectedBlock) return
    setBlocks((prev) => prev.map((item) => (
      item.id === selectedBlock.id
        ? { ...item, content: { ...defaultBlockContent(item.type), ...(item.content ?? {}), ...next } }
        : item
    )))
  }

  function moveBlock(blockId: string, direction: 'up' | 'down') {
    setBlocks((prev) => {
      const index = prev.findIndex((item) => item.id === blockId)
      if (index < 0) return prev
      if (direction === 'up' && index === 0) return prev
      if (direction === 'down' && index === prev.length - 1) return prev
      const next = [...prev]
      const swapIndex = direction === 'up' ? index - 1 : index + 1
      ;[next[index], next[swapIndex]] = [next[swapIndex], next[index]]
      return next
    })
  }

  function onImageFileChange(file: File | null, cb: (value: string) => void, maxMb: number, label: string) {
    if (!file) return
    if (file.size > maxMb * 1024 * 1024) {
      notify('error', `${label} no puede superar ${maxMb}MB`)
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      if (!result.startsWith('data:image/')) {
        notify('error', `Archivo ${label} inválido`)
        return
      }
      cb(result)
      notify('success', `${label} cargado. Guarda para publicar`)
    }
    reader.readAsDataURL(file)
  }

  async function saveEditor() {
    try {
      setSaving(true)
      const response = await fetch('/api/storefront-theme', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          presetId,
          colors,
          blocks,
          heroImageUrl,
          lookbookImageUrl,
          typography,
          promoBar,
          logo,
        }),
      })
      if (!response.ok) throw new Error()
      notify('success', 'Theme guardado correctamente')
    } catch {
      notify('error', 'No se pudo guardar el theme')
    } finally {
      setSaving(false)
    }
  }

  async function copyHtml() {
    try {
      const html = buildHtmlExport(colors, blocks, logo, heroImageUrl, lookbookImageUrl, typography, promoBar)
      await navigator.clipboard.writeText(html)
      notify('success', 'HTML copiado al portapapeles')
    } catch {
      notify('error', 'No se pudo copiar el HTML')
    }
  }

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Editor Visual Ecommerce</h1>
            <p className="mt-1 text-sm text-slate-600">
              Theme builder con identidad de marca: tipografía, campañas y bloque lookbook.
            </p>
          </div>
          <Link href="/admin/dashboard" className="inline-flex items-center gap-2 border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <ArrowLeft size={14} />
            Volver al dashboard
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => applyPreset(presetId)} className="inline-flex items-center gap-2 border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <RefreshCw size={14} />
            Reset preset
          </button>
          <button type="button" onClick={copyHtml} className="inline-flex items-center gap-2 border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <Copy size={14} />
            Copiar HTML
          </button>
          <button type="button" onClick={saveEditor} disabled={saving || loading} className="inline-flex items-center gap-2 bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-60">
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Guardando...' : 'Guardar theme'}
          </button>
        </div>
      </header>

      {toast && (
        <div role="status" aria-live="polite" className={`inline-flex items-center gap-2 border px-3 py-2 text-sm ${toast.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
          <Sparkles size={14} />
          {toast.message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[320px_1fr_340px]">
        <aside className="space-y-4 border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Theme base</p>
            <select value={presetId} onChange={(event) => applyPreset(event.target.value)} className="h-10 w-full border border-slate-300 px-3 text-sm">
              {THEME_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>{preset.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2 border-t border-slate-200 pt-4">
            <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500"><Type size={12} /> Tipografia</p>
            <select value={typography.headingFont} onChange={(event) => setTypography((prev) => ({ ...prev, headingFont: event.target.value }))} className="h-10 w-full border border-slate-300 px-3 text-xs">
              {FONT_OPTIONS.map((font) => <option key={font.label} value={font.value}>{font.label} (Titulos)</option>)}
            </select>
            <select value={typography.bodyFont} onChange={(event) => setTypography((prev) => ({ ...prev, bodyFont: event.target.value }))} className="h-10 w-full border border-slate-300 px-3 text-xs">
              {FONT_OPTIONS.map((font) => <option key={`${font.label}-body`} value={font.value}>{font.label} (Cuerpo)</option>)}
            </select>
          </div>

          <div className="space-y-2 border-t border-slate-200 pt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Logo de la tienda</p>
            <input value={logo} onChange={(event) => setLogo(event.target.value)} className="h-10 w-full border border-slate-300 px-3 text-xs" placeholder="URL del logo (https://...)" />
            <label className="inline-flex cursor-pointer items-center gap-2 border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
              <ImagePlus size={14} /> Cargar logo
              <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={(event) => onImageFileChange(event.target.files?.[0] ?? null, setLogo, 2, 'Logo')} />
            </label>
            {logo && <button type="button" onClick={() => setLogo('')} className="inline-flex items-center gap-1 border border-rose-300 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50"><X size={12} /> Quitar logo</button>}
          </div>

          <div className="space-y-2 border-t border-slate-200 pt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Imagen hero</p>
            <input value={heroImageUrl} onChange={(event) => setHeroImageUrl(event.target.value)} className="h-10 w-full border border-slate-300 px-3 text-xs" placeholder="URL imagen hero" />
          </div>

          <div className="space-y-2 border-t border-slate-200 pt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Imagen lookbook</p>
            <input value={lookbookImageUrl} onChange={(event) => setLookbookImageUrl(event.target.value)} className="h-10 w-full border border-slate-300 px-3 text-xs" placeholder="URL imagen lookbook" />
          </div>

          <div className="space-y-2 border-t border-slate-200 pt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Biblioteca de bloques</p>
            {BLOCK_LIBRARY.map((item) => (
              <button key={item.type} type="button" onClick={() => {
                const created = newBlock(item.type)
                setBlocks((prev) => [...prev, created])
                setSelectedId(created.id)
              }} className="w-full border border-slate-200 bg-slate-50 p-3 text-left hover:border-slate-400 hover:bg-white">
                <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                <p className="mt-1 text-xs text-slate-500">{item.description}</p>
                <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-slate-700"><Plus size={12} /> Agregar</p>
              </button>
            ))}
          </div>
        </aside>

        <div className="border border-slate-200 bg-white p-4 shadow-sm">
          <div className="space-y-3">
            {blocks.map((block) => {
              const isSelected = selectedId === block.id
              return (
                <div key={block.id} onClick={() => setSelectedId(block.id)} className={`border p-3 transition ${isSelected ? 'border-slate-900 bg-slate-100' : 'border-slate-200 bg-slate-50'}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 bg-slate-900 px-2 py-1 text-xs font-semibold text-white">{block.title}</span>
                    <span className="text-xs uppercase tracking-wide text-slate-500">{block.type}</span>
                    <div className="ml-auto flex items-center gap-1">
                      <button type="button" onClick={(event) => { event.stopPropagation(); setBlocks((prev) => prev.map((item) => item.id === block.id ? { ...item, enabled: !item.enabled } : item)) }} className="border border-slate-300 p-1.5 text-slate-600 hover:bg-white">{block.enabled ? <Eye size={14} /> : <EyeOff size={14} />}</button>
                      <button type="button" onClick={(event) => { event.stopPropagation(); moveBlock(block.id, 'up') }} className="border border-slate-300 p-1.5 text-slate-600 hover:bg-white"><MoveUp size={14} /></button>
                      <button type="button" onClick={(event) => { event.stopPropagation(); moveBlock(block.id, 'down') }} className="border border-slate-300 p-1.5 text-slate-600 hover:bg-white"><MoveDown size={14} /></button>
                      <button type="button" onClick={(event) => { event.stopPropagation(); setBlocks((prev) => prev.filter((item) => item.id !== block.id)) }} className="border border-rose-300 p-1.5 text-rose-600 hover:bg-rose-50">✕</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-5 border border-slate-200" style={{ backgroundColor: colors.background, fontFamily: typography.bodyFont }}>
            {promoBar.enabled && (
              <div className="border-b px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.16em]" style={{ backgroundColor: promoBar.background, color: promoBar.textColor, borderColor: colors.accent }}>
                {promoBar.text} {promoBar.ctaLabel ? `• ${promoBar.ctaLabel}` : ''}
              </div>
            )}
            <header className="sticky top-0 z-10 border-b px-4" style={{ borderColor: colors.accent, backgroundColor: colors.surface }}>
              <div className="mx-auto flex min-h-[68px] max-w-6xl items-center justify-between gap-4">
                <div className="min-w-0">
                  {logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logo} alt="Logo tienda" className="h-8 w-auto max-w-[180px] object-contain" />
                  ) : (
                    <p className="text-2xl font-semibold" style={{ color: colors.text, fontFamily: typography.headingFont }}>Mi Tienda</p>
                  )}
                </div>
                <nav className="hidden gap-4 text-sm md:flex" style={{ color: colors.mutedText }}>
                  <span>Inicio</span><span>Colecciones</span><span>Contacto</span>
                </nav>
              </div>
            </header>

            <div className="mx-auto max-w-6xl space-y-3 p-4 md:p-6">
              {blocks.filter((item) => item.enabled).map((item) => (
                <div key={item.id}>{renderPreviewBlock(item, colors, typography, heroImageUrl, lookbookImageUrl)}</div>
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-4 border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Colores del theme</p>
            <div className="space-y-2">
              {(Object.keys(colors) as (keyof ThemeColors)[]).map((key) => (
                <label key={key} className="flex items-center gap-2 border border-slate-200 p-2">
                  <input type="color" value={colors[key]} onChange={(event) => setColors((prev) => ({ ...prev, [key]: event.target.value }))} className="h-8 w-10 cursor-pointer border border-slate-200" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">{key}</p>
                    <p className="text-xs text-slate-500">{colors[key]}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Bloque seleccionado</p>
            {selectedBlock ? (
              <div className="mt-2 space-y-2">
                <input
                  value={selectedBlock.title}
                  onChange={(event) => updateSelectedBlock({ title: event.target.value })}
                  className="h-10 w-full border border-slate-300 px-3 text-sm"
                  placeholder="Título del bloque"
                />

                {(selectedBlock.type === 'hero') && (
                  <>
                    <input
                      value={selectedBlock.content?.heading ?? ''}
                      onChange={(event) => updateSelectedContent({ heading: event.target.value })}
                      className="h-10 w-full border border-slate-300 px-3 text-sm"
                      placeholder="Titular hero"
                    />
                    <textarea
                      value={selectedBlock.content?.body ?? ''}
                      onChange={(event) => updateSelectedContent({ body: event.target.value })}
                      className="w-full border border-slate-300 px-3 py-2 text-sm"
                      rows={3}
                      placeholder="Bajada hero"
                    />
                    <input
                      value={selectedBlock.content?.ctaLabel ?? ''}
                      onChange={(event) => updateSelectedContent({ ctaLabel: event.target.value })}
                      className="h-10 w-full border border-slate-300 px-3 text-sm"
                      placeholder="Texto botón"
                    />
                  </>
                )}

                {(selectedBlock.type === 'collections') && (
                  <>
                    <textarea
                      value={selectedBlock.content?.body ?? ''}
                      onChange={(event) => updateSelectedContent({ body: event.target.value })}
                      className="w-full border border-slate-300 px-3 py-2 text-sm"
                      rows={2}
                      placeholder="Descripción de colecciones"
                    />
                    <textarea
                      value={(selectedBlock.content?.items ?? []).join('\n')}
                      onChange={(event) => updateSelectedContent({
                        items: event.target.value.split('\n').map((item) => item.trim()).filter(Boolean),
                      })}
                      className="w-full border border-slate-300 px-3 py-2 text-sm"
                      rows={4}
                      placeholder={'Ítems (uno por línea)\nHombre\nMujer'}
                    />
                  </>
                )}

                {(['featured', 'lookbook', 'testimonials', 'newsletter'] as BlockType[]).includes(selectedBlock.type) && (
                  <textarea
                    value={selectedBlock.content?.body ?? ''}
                    onChange={(event) => updateSelectedContent({ body: event.target.value })}
                    className="w-full border border-slate-300 px-3 py-2 text-sm"
                    rows={3}
                    placeholder="Texto del bloque"
                  />
                )}

                {(selectedBlock.type === 'newsletter') && (
                  <input
                    value={selectedBlock.content?.ctaLabel ?? ''}
                    onChange={(event) => updateSelectedContent({ ctaLabel: event.target.value })}
                    className="h-10 w-full border border-slate-300 px-3 text-sm"
                    placeholder="Texto botón newsletter"
                  />
                )}

                <p className="text-xs text-slate-500">Tipo: {selectedBlock.type}</p>
                <p className="text-xs text-slate-500">Estado: {selectedBlock.enabled ? 'Visible' : 'Oculto'}</p>
              </div>
            ) : (
              <p className="mt-2 text-xs text-slate-500">Selecciona un bloque para editar su título.</p>
            )}
          </div>
        </aside>
      </div>
    </section>
  )
}
