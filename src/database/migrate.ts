import { Pool } from 'pg'
import { promises as fs } from 'fs'
import path from 'path'

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://ventafacil_user:ventafacil_password@localhost:5432/ventafacil_dev'

interface Migration {
  filename: string
  content: string
  version: number
}

async function runMigrations() {
  const pool = new Pool({ connectionString: DATABASE_URL })

  try {
    console.log('🚀 Starting migrations...\n')

    // Create migrations tracking table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        version INTEGER UNIQUE NOT NULL,
        filename VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT NOW()
      )
    `)

    // Get all migration files
    const migrationsDir = path.join(process.cwd(), 'src/database/migrations')
    const files = await fs.readdir(migrationsDir)
    const sqlFiles = files
      .filter(f => f.endsWith('.sql'))
      .sort()

    // Read migration files
    const migrations: Migration[] = await Promise.all(
      sqlFiles.map(async (filename) => {
        const content = await fs.readFile(
          path.join(migrationsDir, filename),
          'utf-8'
        )
        const version = parseInt(filename.split('_')[0])
        return { filename, content, version }
      })
    )

    // Get executed migrations
    const { rows: executed } = await pool.query(
      'SELECT version FROM migrations ORDER BY version'
    )
    const executedVersions = new Set(executed.map(r => r.version))

    // Run pending migrations
    for (const migration of migrations) {
      if (executedVersions.has(migration.version)) {
        console.log(`⏭️  Skipping ${migration.filename} (already executed)`)
        continue
      }

      console.log(`▶️  Running ${migration.filename}...`)

      try {
        await pool.query('BEGIN')
        await pool.query(migration.content)
        await pool.query(
          'INSERT INTO migrations (version, filename) VALUES ($1, $2)',
          [migration.version, migration.filename]
        )
        await pool.query('COMMIT')
        console.log(`✅ ${migration.filename} completed\n`)
      } catch (error) {
        await pool.query('ROLLBACK')
        console.error(`❌ Error in ${migration.filename}:`, error)
        throw error
      }
    }

    console.log('🎉 All migrations completed successfully!')

  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

runMigrations()
