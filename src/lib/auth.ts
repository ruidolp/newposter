import { compare, hash } from 'bcryptjs'
import { db } from '@/database/db'
import type { Users } from '@/database/schema'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: string
  tenantId: string
}

/**
 * Authenticate user with email and password
 */
export async function authenticateUser(
  email: string,
  password: string,
  tenantId: string
): Promise<AuthUser | null> {
  const user = await db
    .selectFrom('users')
    .selectAll()
    .where('email', '=', email)
    .where('tenant_id', '=', tenantId)
    .where('active', '=', true)
    .executeTakeFirst()

  if (!user) {
    return null
  }

  const isValid = await compare(password, user.password_hash)

  if (!isValid) {
    return null
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role || 'STAFF',
    tenantId: user.tenant_id || '',
  }
}

/**
 * Hash password
 */
export async function hashPassword(password: string): Promise<string> {
  return hash(password, 10)
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string) {
  const user = await db
    .selectFrom('users')
    .selectAll()
    .where('id', '=', userId)
    .executeTakeFirst()

  return user || null
}

/**
 * Check if user has permission
 */
export function hasPermission(userRole: string, requiredRole: string): boolean {
  const roleHierarchy = ['CASHIER', 'STAFF', 'ADMIN', 'OWNER']
  const userLevel = roleHierarchy.indexOf(userRole)
  const requiredLevel = roleHierarchy.indexOf(requiredRole)

  return userLevel >= requiredLevel
}
