import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/database/db'
import { createSuperadminToken, SA_COOKIE, SA_TTL_SECONDS } from '@/lib/superadmin-auth'

// POST /api/superadmin/auth — login
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email y contraseña requeridos' }, { status: 400 })
    }

    const admin = await db
      .selectFrom('superadmins')
      .selectAll()
      .where('email', '=', email.trim().toLowerCase())
      .executeTakeFirst()

    if (!admin) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, admin.password_hash)
    if (!valid) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })
    }

    const token = await createSuperadminToken(admin.id)

    const res = NextResponse.json({ ok: true, name: admin.name })
    res.cookies.set(SA_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: SA_TTL_SECONDS,
      secure: process.env.NODE_ENV === 'production',
    })
    return res
  } catch (error) {
    console.error('[superadmin/auth:POST]', error)
    return NextResponse.json({ error: 'Error al iniciar sesión' }, { status: 500 })
  }
}

// DELETE /api/superadmin/auth — logout
export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(SA_COOKIE, '', { maxAge: 0, path: '/' })
  return res
}
