import type { Config } from 'drizzle-kit'

export default {
  schema: './src/lib/db/schema.ts',
  out: './supabase/migrations',
  connectionString: process.env.DATABASE_URL!,
} satisfies Config
