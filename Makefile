.DEFAULT_GOAL := help

PORT = 8822

# ── Help ──────────────────────────────────────────────────────────────────────
.PHONY: help
help:
	@echo ""
	@echo "  make serve    Start dev server → http://localhost:$(PORT)"
	@echo "  make kill     Kill this project's HTTP server"
	@echo "  make test     Node tests (round-trips, importers, migration)"
	@echo "  make validate Lint every example in library/ with validate.mjs"
	@echo "  make icons    Regenerate js/brand-icons.js from assets/icons/brands/"
	@echo "  make worker   Start Cloudflare Worker dev server"
	@echo ""

# ── Dev server ────────────────────────────────────────────────────────────────
.PHONY: serve
serve:
	@echo "Serving → http://localhost:$(PORT)"
	@python3 -m http.server $(PORT)

# ── Kill ──────────────────────────────────────────────────────────────────────
.PHONY: kill
kill:
	@lsof -ti :$(PORT) | xargs kill 2>/dev/null && echo "Stopped server on port $(PORT)" || echo "No server running on port $(PORT)"

# ── Worker dev ────────────────────────────────────────────────────────────────
.PHONY: worker
worker:
	@cd worker && wrangler dev

# ── Tests and tools ───────────────────────────────────────────────────────────
.PHONY: test validate icons
test:
	@node --test tests/*.test.mjs

validate:
	@node validate.mjs library

icons:
	@node tools/build-icons.mjs
