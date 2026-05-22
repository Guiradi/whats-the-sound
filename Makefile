.PHONY: up dev down logs reset clean

# ─── Production ────────────────────────────────────────────────────────────────

## make up — start Supabase + build + run (detached)
up:
	@echo "→ Starting Supabase local..."
	pnpm exec supabase start
	@echo "→ Building and starting Docker services..."
	docker compose up -d --build
	@echo ""
	@echo "✓  App is running:"
	@echo "     Frontend  →  http://localhost:3000"
	@echo "     Backend   →  http://localhost:3001"
	@echo "     Supabase  →  http://localhost:54321"
	@echo ""
	@echo "   make logs   — follow logs"
	@echo "   make down   — stop everything"

# ─── Development (hot reload) ──────────────────────────────────────────────────

## make dev — start Supabase + dev servers with hot reload (attached)
dev:
	@echo "→ Starting Supabase local..."
	pnpm exec supabase start
	@echo "→ Starting dev servers (Ctrl+C to stop)..."
	docker compose -f docker-compose.dev.yml up --build

# ─── Teardown ──────────────────────────────────────────────────────────────────

## make down — stop Docker services + Supabase
down:
	docker compose down
	pnpm exec supabase stop

# ─── Utilities ─────────────────────────────────────────────────────────────────

## make logs — follow live logs from all services
logs:
	docker compose logs -f

## make reset — wipe DB, re-run migrations, restart app
reset:
	docker compose down
	pnpm exec supabase db reset --local
	docker compose up -d --build

## make clean — remove all Docker images + volumes + stop Supabase
clean:
	docker compose down --volumes --rmi local
	pnpm exec supabase stop
