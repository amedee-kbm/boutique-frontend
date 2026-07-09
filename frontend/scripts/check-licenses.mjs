#!/usr/bin/env node
/**
 * Refuse copyleft and source-available licences in the dependency tree.
 *
 * The subtlety is in SPDX expressions, which are easy to get wrong:
 *
 *   "MIT OR GPL-3.0"   -> allowed. We may choose MIT.
 *   "MIT AND GPL-3.0"  -> forbidden. Both obligations apply.
 *
 * So an OR is forbidden only when *every* operand is forbidden, and an AND is
 * forbidden when *any* operand is. Treating them the same either lets GPL in or
 * rejects half of npm.
 *
 * Usage: node scripts/check-licenses.mjs
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const FORBIDDEN = [
  /^GPL-2\.0/i,
  /^GPL-3\.0/i,
  /^AGPL/i,
  /^SSPL/i,
  /^BUSL/i,
  /business source license/i,
  /commons[- ]clause/i,
]

/**
 * Reviewed exceptions. Each needs a reason; an entry without one is a hole.
 * Note LGPL is deliberately absent from FORBIDDEN: we link these libraries,
 * never modify them, and never ship a redistributable binary.
 */
const ALLOW = new Map()

const isForbidden = (id) => FORBIDDEN.some((re) => re.test(id.trim()))

/** Evaluate an SPDX expression. Parentheses are not used by npm metadata in practice. */
function expressionForbidden(expression) {
  const normalized = expression.replace(/[()]/g, ' ').trim()

  if (/\sOR\s/i.test(normalized)) {
    // Permissive if any single operand is acceptable.
    return normalized.split(/\sOR\s/i).every((operand) => expressionForbidden(operand))
  }
  if (/\sAND\s/i.test(normalized)) {
    // Every obligation applies, so one bad operand poisons the whole.
    return normalized.split(/\sAND\s/i).some((operand) => expressionForbidden(operand))
  }
  return isForbidden(normalized)
}

const licenseOf = (manifest) =>
  typeof manifest.license === 'string' ? manifest.license : (manifest.license?.type ?? null)

/**
 * Walk node_modules directly rather than shelling out to `npm query`.
 * npm is a shell script, node 26 refuses to spawn a .cmd without a shell, and
 * `shell: true` is deprecated for argument-injection reasons. Reading the
 * manifests is faster, deterministic, and has no moving parts.
 */
function installedPackages(root, found = []) {
  if (!existsSync(root)) return found

  for (const entry of readdirSync(root)) {
    if (entry.startsWith('.')) continue

    const dir = join(root, entry)
    if (entry.startsWith('@')) {
      installedPackages(dir, found)
      continue
    }

    const manifest = join(dir, 'package.json')
    if (existsSync(manifest)) {
      try {
        found.push(JSON.parse(readFileSync(manifest, 'utf8')))
      } catch {
        // A malformed manifest is npm's problem, not this gate's.
      }
    }
    // Nested trees exist wherever npm could not dedupe a version.
    installedPackages(join(dir, 'node_modules'), found)
  }
  return found
}

const violations = []
const unknown = []

const seen = new Set()

for (const manifest of installedPackages('node_modules')) {
  const id = `${manifest.name}@${manifest.version}`
  if (!manifest.name || ALLOW.has(manifest.name) || seen.has(id)) continue
  seen.add(id)

  const license = licenseOf(manifest)
  if (!license) {
    unknown.push(id)
    continue
  }
  if (expressionForbidden(license)) {
    violations.push(`${id}  ${license}`)
  }
}

if (unknown.length > 0) {
  console.warn(
    `warning: no licence declared by ${unknown.length} package(s): ${unknown.join(', ')}\n`
  )
}

if (violations.length > 0) {
  console.error('Forbidden licence in the dependency tree:\n')
  for (const violation of violations) console.error(`  ${violation}`)
  console.error(
    '\nRemove the dependency, or — if the obligation genuinely does not bind us —\n' +
      'add it to ALLOW in this script with a written reason.'
  )
  process.exit(1)
}

console.log('OK: no forbidden licence in the dependency tree')
