import { Pool } from 'pg'
import { Kysely, PostgresDialect } from 'kysely'
import type { DB } from './schema'

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set')
}

const dialect = new PostgresDialect({
  pool: new Pool({
    connectionString: DATABASE_URL,
    max: 10,
  }),
})

export const db = new Kysely<DB>({
  dialect,
})

// Helper type for transactions
export type Transaction = Kysely<DB>
