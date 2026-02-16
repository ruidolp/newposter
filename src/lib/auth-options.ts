import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { authenticateUser } from '@/lib/auth'
import { db } from '@/database/db'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        tenantId: { label: 'Tenant ID', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password || !credentials?.tenantId) {
          return null
        }
        const user = await authenticateUser(
          credentials.email,
          credentials.password,
          credentials.tenantId
        )
        if (!user) return null

        // Fetch tenant slug to store in JWT for middleware resolution
        const tenant = await db
          .selectFrom('tenants')
          .select('slug')
          .where('id', '=', credentials.tenantId)
          .executeTakeFirst()

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId,
          tenantSlug: tenant?.slug ?? '',
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.tenantId = (user as any).tenantId
        token.tenantSlug = (user as any).tenantSlug
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as any).id = token.id
        ;(session.user as any).role = token.role
        ;(session.user as any).tenantId = token.tenantId
      }
      return session
    },
  },
  pages: { signIn: '/login' },
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
}
