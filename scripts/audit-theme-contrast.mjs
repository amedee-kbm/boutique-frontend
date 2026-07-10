#!/usr/bin/env node
/**
 * WCAG contrast audit for the theme tokens, in both light and dark mode.
 *
 * Colour is decided once, in globals.css, and every component reads a token. So
 * this is the one place a contrast failure can be caught before it is rendered
 * a hundred times. A `*-foreground` token that fails against its surface is a
 * bug in the theme, not in the component that used it correctly.
 *
 * Tokens are `oklch(L C H)`. Getting a contrast ratio out of that means going
 * oklch -> oklab -> linear sRGB -> sRGB -> relative luminance. The script this
 * replaces parsed HSL, and would have found zero tokens and passed.
 *
 * Colour-blind separation is deliberately not checked yet: the palette is
 * currently near-achromatic (`--primary` is chroma 0), so there are no hues to
 * confuse. Revisit when the brand colours land.
 *
 * Usage: node scripts/audit-theme-contrast.mjs
 */

import { readFileSync } from 'node:fs'

const CSS = 'src/app/globals.css'

/** Pairs that must be legible, and the WCAG minimum for each. */
const PAIRS = [
  ['--foreground', '--background', 4.5, 'body text'],
  ['--card-foreground', '--card', 4.5, 'text on cards'],
  ['--popover-foreground', '--popover', 4.5, 'text in popovers'],
  ['--primary-foreground', '--primary', 4.5, 'text on primary buttons'],
  ['--secondary-foreground', '--secondary', 4.5, 'text on secondary buttons'],
  ['--accent-foreground', '--accent', 4.5, 'text on accents'],
  ['--destructive-foreground', '--destructive', 4.5, 'text on destructive actions'],
  ['--muted-foreground', '--muted', 4.5, 'muted text'],
  // 3:1 is the WCAG minimum for non-text UI: focus rings, borders, icons.
  ['--primary', '--background', 3, 'primary as a UI colour (links, focus rings)'],
]

// ─── oklch -> sRGB ───────────────────────────────────────────────────────────

const OKLCH = /oklch\(\s*([\d.]+%?)\s+([\d.]+%?)\s+([\d.]+)(?:deg)?\s*\)/i

function parseOklch(value) {
  const m = value.match(OKLCH)
  if (!m) return null
  const pct = (s) => (s.endsWith('%') ? parseFloat(s) / 100 : parseFloat(s))
  return { L: pct(m[1]), C: pct(m[2]), h: parseFloat(m[3]) }
}

/** Oklab -> linear sRGB, per Björn Ottosson's matrices. */
function oklchToLinearRgb({ L, C, h }) {
  const hr = (h * Math.PI) / 180
  const a = C * Math.cos(hr)
  const b = C * Math.sin(hr)

  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3

  return [
    +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
}

/** WCAG relative luminance works on linear-light channels, which is what we have. */
function relativeLuminance(linear) {
  const [r, g, b] = linear.map((c) => Math.min(Math.max(c, 0), 1))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrastRatio(a, b) {
  const la = relativeLuminance(oklchToLinearRgb(a))
  const lb = relativeLuminance(oklchToLinearRgb(b))
  const [hi, lo] = la > lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

// ─── Token extraction ────────────────────────────────────────────────────────

/**
 * Tokens declared inside a `:root { … }` or `.dark { … }` block.
 *
 * The selector is matched as a rule opener, not by substring: `.dark` also
 * appears inside `@custom-variant dark (&:is(.dark *))`, and matching that
 * instead silently yields zero tokens — a gate that passes while checking
 * nothing.
 */
function tokensIn(css, selector) {
  const opener = new RegExp(`(^|\\n)\\s*${selector.replace('.', '\\.')}\\s*\\{`)
  const match = css.match(opener)
  if (!match) return null

  const start = match.index
  const open = css.indexOf('{', start)
  let depth = 0
  let end = open
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++
    else if (css[i] === '}' && --depth === 0) {
      end = i
      break
    }
  }

  const tokens = {}
  for (const [, name, value] of css.slice(open, end).matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    const colour = parseOklch(value)
    if (colour) tokens[name] = colour
  }
  return tokens
}

// ─── Audit ───────────────────────────────────────────────────────────────────

const css = readFileSync(CSS, 'utf8')
const themes = { light: tokensIn(css, ':root'), dark: tokensIn(css, '.dark') }

const failures = []

for (const [theme, tokens] of Object.entries(themes)) {
  if (!tokens) {
    failures.push(`${theme}: no token block found in ${CSS}`)
    continue
  }
  for (const [fg, bg, minimum, what] of PAIRS) {
    // A missing token is a failure, never a skip. Skipping is how a gate ends
    // up passing while checking nothing — which is the whole reason this
    // project writes its gates from scratch. `--destructive-foreground` was
    // undefined here while a component used `text-destructive-foreground`, so
    // the class resolved to nothing and the icon kept its inherited colour.
    if (!tokens[fg] || !tokens[bg]) {
      const missing = [fg, bg].filter((token) => !tokens[token]).join(', ')
      failures.push(`${theme}: cannot check ${fg} on ${bg} — ${missing} is not defined`)
      continue
    }
    const ratio = contrastRatio(tokens[fg], tokens[bg])
    if (ratio < minimum) {
      failures.push(
        `${theme}: ${fg} on ${bg} is ${ratio.toFixed(2)}:1, needs ${minimum}:1 — ${what}`
      )
    }
  }
}

if (failures.length > 0) {
  console.error('Theme fails WCAG contrast:\n')
  for (const failure of failures) console.error(`  ${failure}`)
  console.error(
    `\nAdjust the token in ${CSS}. Every component reads it, so fixing it here fixes it everywhere.`
  )
  process.exit(1)
}

console.log('OK: theme tokens meet WCAG contrast in light and dark')
