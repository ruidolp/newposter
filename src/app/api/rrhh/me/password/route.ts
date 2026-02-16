import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import bcrypt from 'bcryptjs'
import { db } from '@/database/db'
import { hashPassword } from '@/lib/auth'

/**
 * PATCH /api/rrhh/me/password
 * Cambia la contraseña del usuario autenticado.
 * Requiere la contraseña actual para verificar identidad.
 */
export async function PATCH(request: NextRequest) {
  try {
    const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await request.json()
    const { current_password, new_password } = body

    if (!current_password || !new_password) {
      return NextResponse.json({ error: 'Se requieren la contraseña actual y la nueva' }, { status: 400 })
    }
    if (new_password.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 })
    }

    // Obtener hash actual
    const user = await db
      .selectFrom('users')
      .select(['id', 'password_hash'])
      .where('id', '=', token.id as string)
      .executeTakeFirst()

    if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

    const valid = await bcrypt.compare(current_password, user.password_hash ?? '')
    if (!valid) {
      return NextResponse.json({ error: 'La contraseña actual es incorrecta' }, { status: 400 })
    }

    const newHash = await hashPassword(new_password)

    await db
      .updateTable('users')
      .set({ password_hash: newHash } as any)
      .where('id', '=', token.id as string)
      .execute()

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[rrhh/me/password:PATCH]', error)
    return NextResponse.json({ error: 'Error al cambiar contraseña' }, { status: 500 })
  }
}
