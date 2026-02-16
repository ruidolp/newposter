
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Building2, CheckCircle2, Eye, EyeOff, Store, Loader2, PartyPopper } from 'lucide-react'

export default function RegisterPage() {
    const router = useRouter()

    const [form, setForm] = useState({
        name: '', slug: '',
        owner_name: '', owner_email: '', owner_password: '',
    })
    const [showPass, setShowPass] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [slugManual, setSlugManual] = useState(false)

    function slugify(str: string) {
        return str
            .toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\s-]/g, '')
            .trim()
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
    }

    function setField(key: string, value: string) {
        setForm((prev) => {
            const next = { ...prev, [key]: value }
            if (key === 'name' && !slugManual) {
                next.slug = slugify(value)
            }
            return next
        })
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError('')

        if (!form.name.trim()) { setError('El nombre de la empresa es requerido'); return }
        if (!form.slug.trim()) { setError('La URL personalizada es requerida'); return }
        if (!/^[a-z0-9-]+$/.test(form.slug)) { setError('La URL solo puede tener letras minúsculas, números y guiones'); return }
        if (!form.owner_name.trim()) { setError('Tu nombre es requerido'); return }
        if (!form.owner_email.trim()) { setError('El email es requerido'); return }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.owner_email)) { setError('Ingresa un email válido'); return }
        if (!form.owner_password || form.owner_password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }

        setSaving(true)
        try {
            const res = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            })
            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Error al registrar la empresa')
            }

            router.push(`/login/${form.slug}`)
        } catch (e: unknown) {
            setError((e as Error).message)
            setSaving(false)
        }
    }

    const inputCls = 'h-11 w-full rounded-xl border border-gray-200 bg-white/50 px-4 text-gray-900 placeholder:text-gray-400 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/20 outline-none transition disabled:opacity-50 disabled:bg-gray-50'
    const labelCls = 'block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 ml-1'

    return (
        <div className="min-h-screen bg-white flex">
            {/* Left Panel - Hero */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-slate-900 items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-600 via-purple-600 to-indigo-900 opacity-90" />
                <div className="relative z-10 p-12 text-white max-w-lg">
                    <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 backdrop-blur-md">
                        <PartyPopper size={18} className="text-yellow-300" />
                        <span className="text-sm font-medium">Únete a +1000 empresas</span>
                    </div>
                    <h1 className="text-5xl font-bold mb-6 leading-tight">Tu negocio merece brillar.</h1>
                    <p className="text-lg text-fuchsia-100 leading-relaxed mb-8">
                        Crea tu entorno profesional en segundos. Sin costos ocultos, sin complicaciones técnicas.
                    </p>
                    <div className="space-y-4">
                        {[
                            'Tienda online automática',
                            'Control de inventario inteligente',
                            'Punto de venta rápido'
                        ].map(item => (
                            <div key={item} className="flex items-center gap-3">
                                <div className="bg-white/20 p-1 rounded-full"><CheckCircle2 size={16} /></div>
                                <span className="font-medium">{item}</span>
                            </div>
                        ))}
                    </div>
                </div>
                {/* Blobs */}
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[500px] h-[500px] bg-rose-500/30 rounded-full blur-[100px]" />
                <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-blue-500/30 rounded-full blur-[100px]" />
            </div>

            {/* Right Panel - Form */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-12 bg-gray-50/50">
                <div className="sm:mx-auto sm:w-full sm:max-w-md">
                    <Link href="/" className="flex items-center gap-2 mb-8 group w-fit">
                        <div className="bg-gradient-to-tr from-fuchsia-600 to-rose-500 text-white p-2 rounded-xl shadow-md group-hover:scale-110 transition-transform">
                            <Store size={22} />
                        </div>
                        <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-600 to-rose-600">
                            POSFER
                        </span>
                    </Link>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">
                        Crea tu cuenta gratis
                    </h2>
                    <p className="text-gray-500 mb-8">
                        Empieza a gestionar tu negocio de forma profesional.
                    </p>

                    <form className="space-y-5" onSubmit={handleSubmit}>

                        {error && (
                            <div className="rounded-xl bg-red-50 p-4 border border-red-100 animate-shake">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <CheckCircle2 size={20} className="text-red-400 rotate-45" />
                                    </div>
                                    <div className="ml-3">
                                        <h3 className="text-sm font-medium text-red-800">{error}</h3>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label htmlFor="company-name" className={labelCls}>Nombre de tu empresa</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                        <Building2 size={18} />
                                    </div>
                                    <input
                                        id="company-name"
                                        name="company-name"
                                        type="text"
                                        required
                                        className={`${inputCls} pl-10`}
                                        placeholder="Ej. Mi Tienda"
                                        value={form.name}
                                        onChange={(e) => setField('name', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="company-slug" className={labelCls}>URL de tu tienda</label>
                                <div className="relative flex rounded-xl shadow-sm">
                                    <span className="inline-flex items-center px-4 rounded-l-xl border border-r-0 border-gray-200 bg-gray-100 text-gray-500 text-sm font-medium">
                                        posfer.com/login/
                                    </span>
                                    <input
                                        id="company-slug"
                                        name="company-slug"
                                        type="text"
                                        required
                                        className={`${inputCls} rounded-l-none pl-3 font-medium text-fuchsia-700`}
                                        placeholder="mi-tienda"
                                        value={form.slug}
                                        onChange={(e) => { setSlugManual(true); setField('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')) }}
                                    />
                                </div>
                            </div>

                            <div className="relative py-4">
                                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                    <div className="w-full border-t border-gray-200" />
                                </div>
                                <div className="relative flex justify-center">
                                    <span className="bg-gray-50 px-2 text-xs uppercase text-gray-400 font-semibold tracking-wider">Administrador</span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="owner-name" className={labelCls}>Tu nombre completo</label>
                                    <input
                                        id="owner-name"
                                        name="owner-name"
                                        type="text"
                                        autoComplete="name"
                                        required
                                        className={inputCls}
                                        value={form.owner_name}
                                        onChange={(e) => setField('owner_name', e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label htmlFor="email" className={labelCls}>Correo electrónico</label>
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        required
                                        className={inputCls}
                                        value={form.owner_email}
                                        onChange={(e) => setField('owner_email', e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label htmlFor="password" className={labelCls}>Contraseña</label>
                                    <div className="relative">
                                        <input
                                            id="password"
                                            name="password"
                                            type={showPass ? 'text' : 'password'}
                                            autoComplete="new-password"
                                            required
                                            className={`${inputCls} pr-10`}
                                            value={form.owner_password}
                                            onChange={(e) => setField('owner_password', e.target.value)}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPass(!showPass)}
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                                        >
                                            {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-fuchsia-200 text-sm font-bold text-white bg-gradient-to-r from-fuchsia-600 to-rose-600 hover:from-fuchsia-500 hover:to-rose-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-fuchsia-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all hover:scale-[1.02] transform"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                                        Creando tu espacio...
                                    </>
                                ) : (
                                    <>
                                        Crear cuenta gratis
                                        <ArrowRight className="ml-2 -mr-1 h-5 w-5" />
                                    </>
                                )}
                            </button>
                        </div>

                        <div className="text-center text-sm text-gray-500">
                            ¿Ya tienes una cuenta?{' '}
                            <Link href="/login" className="font-semibold text-fuchsia-600 hover:text-fuchsia-500 transition-colors">
                                Inicia sesión aquí
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}
