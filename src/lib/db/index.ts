import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined
}

// DATABASE_URL must be the Supabase transaction pooler (…pooler.supabase.com:6543),
// not session mode (:5432): session mode pins a server connection per client and
// caps at pool_size 15, which serverless fan-out on Vercel exhausts. The
// transaction pooler multiplexes many clients over few connections, so it both
// survives fan-out AND lets each instance keep a normal pool — a max of 1 would
// serialise every query and make pages crawl. It cannot cache prepared
// statements, so postgres.js must disable them (prepare: false).
const conn =
  globalForDb.conn ??
  postgres(process.env.DATABASE_URL!, {
    prepare: false,
  })
if (process.env.NODE_ENV !== 'production') globalForDb.conn = conn

export const db = drizzle(conn, { schema })
