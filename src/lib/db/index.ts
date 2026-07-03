import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined
}

// DATABASE_URL must be the Supabase transaction pooler (…pooler.supabase.com:6543),
// not session mode (:5432): session mode pins a server connection per client and
// caps at pool_size 15, which serverless fan-out on Vercel exhausts. The
// transaction pooler multiplexes many clients over few connections but cannot
// cache prepared statements, so postgres.js must disable them (prepare: false).
// max is kept small so a single instance can't monopolise the pool.
const conn =
  globalForDb.conn ??
  postgres(process.env.DATABASE_URL!, {
    prepare: false,
    max: 1,
  })
if (process.env.NODE_ENV !== 'production') globalForDb.conn = conn

export const db = drizzle(conn, { schema })
