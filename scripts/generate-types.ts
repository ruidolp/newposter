#!/usr/bin/env tsx
import { execSync } from 'child_process'

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://ventafacil_user:ventafacil_password@localhost:5432/ventafacil_dev'

console.log('🔧 Generating Kysely types from database schema...\n')

try {
  execSync(
    `kysely-codegen --dialect postgres --out-file src/database/schema.ts --url "${DATABASE_URL}"`,
    { stdio: 'inherit' }
  )
  console.log('\n✅ Types generated successfully!')
  console.log('📄 File: src/database/schema.ts')
} catch (error) {
  console.error('❌ Failed to generate types:', error)
  process.exit(1)
}
