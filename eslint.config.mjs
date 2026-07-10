import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
  {
    rules: {
      // Human-facing dates must never be ambiguous. A bare toLocaleDateString()
      // renders a numeric month in the *browser's* locale, so the same string
      // reads as 3 July in Kigali and 7 March in New York. Route every date
      // through date-fns `format` with a textual month.
      //
      // Machine formats are unaffected: ISO 8601 in <input> values, datetime
      // attributes and API payloads never call these methods.
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'CallExpression > MemberExpression[property.name=/^(toLocaleDateString|toLocaleTimeString|toLocaleString)$/]',
          message:
            'Ambiguous date formatting. Use date-fns `format` with a textual month (see CLAUDE.md).',
        },
      ],
    },
  },
])

export default eslintConfig
