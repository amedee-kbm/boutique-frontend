# The Makefile is the contract. CI runs exactly what you run locally.
#
#   make check    everything that must be true before a commit
#   make test     the unit suite
#   make fix      auto-fix formatting and lint, then verify
#
# Nothing here is aspirational: every target works today. A target that no
# longer runs teaches people to ignore the Makefile, and then the Makefile
# stops being the contract. Delete it or fix it.

SHELL := /usr/bin/bash
.SHELLFLAGS := -eu -o pipefail -c

.DEFAULT_GOAL := help

# ─── Quality gate ────────────────────────────────────────────────────────────

.PHONY: check
check: format-check lint types file-length rsc-token audit-images theme-contrast  ## Every gate. Must pass before committing.
	@echo ""
	@echo "✓ all checks passed"

.PHONY: fix
fix:  ## Auto-fix formatting and lint, then verify.
	npm run format
	npx eslint --fix .
	@$(MAKE) --no-print-directory check

.PHONY: format-check
format-check:  ## Verify Prettier formatting without rewriting (CI-safe).
	npm run format:check

.PHONY: lint
lint:  ## ESLint. Warnings are errors.
	npx eslint --max-warnings 0 .

.PHONY: types
types:  ## tsc --noEmit. Next generates route types; tsc checks them.
	npm run types

.PHONY: file-length
file-length:  ## No source file past its ceiling.
	@./scripts/check-file-length.sh

.PHONY: rsc-token
rsc-token:  ## The access token never crosses into client-serialized output.
	@node scripts/check-rsc-token.mjs

.PHONY: audit-images
audit-images:  ## Every raw <img> carries alt text.
	@node scripts/audit-image-alt.mjs

.PHONY: theme-contrast
theme-contrast:  ## Theme tokens meet WCAG AA in light and dark.
	@node scripts/audit-theme-contrast.mjs

# ─── Tests ───────────────────────────────────────────────────────────────────

.PHONY: test
test:  ## Unit suite (Vitest).
	npm run test

.PHONY: test-coverage
test-coverage:  ## Unit suite with coverage.
	npm run test:coverage

# End-to-end tests are deliberately absent. They need a seeded, disposable
# Supabase project (per CLAUDE.md, e2e must not mock Supabase), and there isn't
# one. A `test-e2e` target that cannot run is worse than none: it would be the
# first thing anyone stops believing.

# ─── Security & supply chain ─────────────────────────────────────────────────

.PHONY: licensecheck
licensecheck:  ## Refuse copyleft / source-available licences in the dependency tree.
	@node scripts/check-licenses.mjs

.PHONY: audit
audit:  ## Known vulnerabilities in production dependencies.
	npm audit --omit=dev --audit-level=high

.PHONY: deps-check
deps-check: licensecheck audit  ## Both supply-chain gates.

# ─── Development ─────────────────────────────────────────────────────────────

.PHONY: dev
dev:  ## Next dev server on :3000.
	npm run dev

.PHONY: build
build:  ## Production build. The real check for server/client boundary violations.
	npm run build

.PHONY: start
start:  ## Serve the production build.
	npm run start

.PHONY: count-lines
count-lines:  ## Source lines.
	@find src \( -name '*.ts' -o -name '*.tsx' \) -exec wc -l {} + | tail -1

.PHONY: help
help:  ## This list.
	@grep -hE '^[a-z][a-zA-Z0-9_-]*:.*?## ' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'
