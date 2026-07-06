import { readFileSync } from 'fs'
import postgres from 'postgres'

const sql = postgres(process.env.DATABASE_URL)
const rlsSql = readFileSync('./supabase/policies/rls.sql', 'utf-8')

try {
  await sql.unsafe(rlsSql)
  console.log('✓ RLS policies applied successfully')
} finally {
  await sql.end()
}
