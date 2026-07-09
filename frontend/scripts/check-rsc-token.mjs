#!/usr/bin/env node
/**
 * Guard the access token against ever reaching the browser.
 *
 * Why this exists
 * ---------------
 * Under React Server Components, anything a Server Component passes as a prop to
 * a Client Component is serialized into the Flight payload and shipped to the
 * browser. So is anything a Server Action returns. There is no type error, no
 * warning, and no runtime complaint — the token simply appears in view-source,
 * in the RSC stream, in proxy logs, and in the browser's back/forward cache.
 *
 * This is strictly worse than the equivalent leak in a classic SSR framework,
 * because the boundary that leaks is invisible: a prop.
 *
 * Rather than chase every shape a leak could take, this enforces a boundary.
 * The token lives in HttpOnly cookies and may only be read inside the BFF —
 * the same-origin route handlers that talk to Django. Nothing else may even
 * import the module that reads it.
 *
 * Three rules, in decreasing order of strength:
 *
 *   1. Only the BFF may import `lib/auth/tokens`. This subsumes "a Server
 *      Component read the token", because it cannot.
 *   2. No `'use client'` file may so much as name a token identifier or cookie.
 *   3. No `NEXT_PUBLIC_*` variable may be named like a credential. Anything
 *      prefixed NEXT_PUBLIC_ is inlined into the client bundle by Next.
 *
 * Rules 2 and 3 are cheap defence in depth; rule 1 is the invariant.
 *
 * Usage: node scripts/check-rsc-token.mjs
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, posix, sep } from 'node:path'

const SOURCE_ROOT = 'src'

/** The BFF. These files, and only these, may read the token. */
const TOKEN_READERS = new Set([
  'src/app/api/auth/login/route.ts',
  'src/app/api/auth/logout/route.ts',
  'src/app/api/django/[...path]/route.ts',
  'src/lib/auth/refresh.ts',
])

/** Modules that must declare themselves server-only, so a client import throws at build time. */
const MUST_BE_SERVER_ONLY = ['src/lib/auth/tokens.ts', 'src/lib/auth/refresh.ts']

/**
 * NEXT_PUBLIC_ names that look like credentials but are publishable by design.
 * Each needs a reason. An entry without one is a hole, not an exemption.
 */
const PUBLISHABLE = new Map([
  // Supabase's anon key. Designed to ship to browsers; row-level security, not
  // secrecy, is what protects the data behind it.
  ['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'Supabase anon key — public by design, guarded by RLS'],
  // The public half of a VAPID keypair. The private half never leaves the server.
  ['NEXT_PUBLIC_VAPID_PUBLIC_KEY', 'public half of the web-push VAPID keypair'],
])

// `from '@/lib/auth/tokens'` or, from inside lib/auth, `from './tokens'`.
const IMPORTS_TOKENS = /from\s+['"](?:@\/lib\/auth\/tokens|\.{1,2}\/tokens)['"]/
const IS_CLIENT = /^\s*['"]use client['"]/m
const TOKEN_NAMES =
  /\b(getToken|getRefreshToken|setToken|setRefreshToken|deleteTokens|accessToken|access_token)\b|['"]auth-(?:refresh-)?token['"]/
const PUBLIC_ENV = /\bNEXT_PUBLIC_[A-Z0-9_]+\b/g
const CREDENTIAL_SHAPED = /(TOKEN|SECRET|KEY)$/

function sourceFiles(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      out.push(...sourceFiles(full))
    } else if (/\.(ts|tsx)$/.test(entry)) {
      out.push(full.split(sep).join(posix.sep))
    }
  }
  return out
}

const failures = []

for (const file of sourceFiles(SOURCE_ROOT)) {
  const source = readFileSync(file, 'utf8')
  const isTokensModule = file === 'src/lib/auth/tokens.ts'

  // 1. Confined import.
  if (IMPORTS_TOKENS.test(source) && !TOKEN_READERS.has(file)) {
    failures.push(
      `${file}\n` +
        `    imports lib/auth/tokens, but only the BFF may read the token.\n` +
        `    If a Server Component needs authenticated data, call /api/django/* — do not read the cookie.`
    )
  }

  // 2. No client file may name a token.
  if (IS_CLIENT.test(source) && TOKEN_NAMES.test(source)) {
    const hit = source.match(TOKEN_NAMES)?.[0]
    failures.push(
      `${file}\n` +
        `    a 'use client' file names ${hit}.\n` +
        `    Client code never sees the token; it calls the same-origin BFF, which attaches it.`
    )
  }

  // 3. No credential-shaped public env var.
  for (const name of source.match(PUBLIC_ENV) ?? []) {
    if (!CREDENTIAL_SHAPED.test(name) || PUBLISHABLE.has(name)) continue
    failures.push(
      `${file}\n` +
        `    ${name} is inlined into the client bundle by Next.\n` +
        `    If it is genuinely publishable, add it to PUBLISHABLE in this script with a reason.`
    )
  }

  // The token module itself must be unimportable from a client component.
  if (isTokensModule && !source.includes("import 'server-only'")) {
    failures.push(`${file}\n    lost its \`import 'server-only'\` guard.`)
  }
}

for (const file of MUST_BE_SERVER_ONLY) {
  if (!readFileSync(file, 'utf8').includes("import 'server-only'")) {
    failures.push(
      `${file}\n    must \`import 'server-only'\` so a client import fails at build time.`
    )
  }
}

if (failures.length > 0) {
  console.error('Access token may leak to the browser:\n')
  for (const failure of failures) console.error(`  ${failure}\n`)
  console.error(
    'Under RSC, a value passed from a Server Component to a Client Component is\n' +
      'serialized into the Flight payload. Nothing warns you. The token stays in the\n' +
      'BFF route handlers, in HttpOnly cookies, and nowhere else.'
  )
  process.exit(1)
}

console.log('OK: the access token is confined to the BFF')
