# Changelog

All notable changes to the Zita Boutique storefront and seller admin are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Entries describe **customer- and seller-facing impact**, not implementation detail. Breaking changes
are prefixed **Breaking**. Section order: Added, Changed, Fixed, Deprecated, Removed, Security.

## [Unreleased]

### Added

- Quality gate: `make check` runs Prettier, ESLint, `tsc --noEmit`, a file-length ceiling, the RSC
  token guard, an image-alt audit, and a WCAG contrast audit of the theme tokens. `make test` runs
  Vitest.
- First test suite: 13 unit tests covering slug generation and the error helpers.
- ESLint now rejects `toLocaleDateString` / `toLocaleTimeString` / `toLocaleString`. A bare call
  renders a numeric month in the browser's locale, so the same string reads as 3 July in Kigali and
  7 March in New York.
- Backend-for-frontend proxy at `/api/django/*`: attaches the access token from an HttpOnly cookie
  as a Bearer header, forwards to the Django API, and transparently refreshes once on a 401. The
  token never reaches the browser.
- `/api/auth/login` and `/api/auth/logout` exchange credentials for tokens at the Django API and keep
  both tokens in HttpOnly, SameSite cookies, returning only the user object to the browser.
- MIT `LICENSE`.

### Fixed

- **`--destructive-foreground` was never defined**, while `SortableImageGrid` used
  `hover:text-destructive-foreground`. The class resolved to nothing, so the delete icon kept its
  inherited colour — near-white on red in dark mode, a contrast ratio of 2.77:1, below even the 3:1
  minimum for UI elements. The token is now defined in both themes and exposed via `@theme`.
- **`--muted-foreground` failed WCAG AA in light mode**: 4.34:1 against `--muted`, where 4.5:1 is
  required. Darkened from `oklch(0.556 0 0)` to `oklch(0.545 0 0)`.

### Removed

- Engineering scaffolding inherited from [the upstream project](https://github.com/upstream)'s SvelteKit frontend:
  their release and publish workflows, funding config, Playwright specs for polls and subscriptions,
  and one-off translation-migration scripts. What Zita keeps of that methodology is rewritten from
  intent, not copied (`ADR-0010`).

### Notes

- The storefront and seller admin continue to run on Supabase (auth, Postgres via Drizzle, Realtime
  for Tubaze chat, Storage for product images). The Django API is being built alongside it and does
  not yet serve the catalog. No cutover is scheduled.

[Unreleased]: https://github.com/amedee-kbm/boutique/commits/main
