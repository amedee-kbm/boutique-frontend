#!/usr/bin/env node
/**
 * Every image needs alt text. WCAG 2.1 AA, non-negotiable.
 *
 * Next's `<Image>` requires `alt` in its type, so the compiler already covers
 * that path. This catches the one it cannot: a raw `<img>`, where `alt` is
 * optional in JSX and its absence is silent.
 *
 * A decorative image is not exempt — it is `alt=""`, which tells a screen
 * reader to skip it. Omitting the attribute instead makes the reader announce
 * the file name.
 *
 * Usage: node scripts/audit-image-alt.mjs
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, posix, sep } from 'node:path'

const RAW_IMG = /<img\b[^>]*>/gs
const HAS_ALT = /\balt\s*=/

function sourceFiles(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full))
    else if (entry.endsWith('.tsx')) out.push(full.split(sep).join(posix.sep))
  }
  return out
}

const failures = []

for (const file of sourceFiles('src')) {
  const source = readFileSync(file, 'utf8')
  for (const match of source.matchAll(RAW_IMG)) {
    if (HAS_ALT.test(match[0])) continue
    const line = source.slice(0, match.index).split('\n').length
    failures.push(`${file}:${line}  <img> without alt`)
  }
}

if (failures.length > 0) {
  console.error('Images without alt text:\n')
  for (const failure of failures) console.error(`  ${failure}`)
  console.error('\nDecorative? Use alt="" — omitting it makes screen readers read the file name.')
  process.exit(1)
}

console.log('OK: every raw <img> has alt text')
