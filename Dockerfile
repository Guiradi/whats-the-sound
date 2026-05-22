# ===================================================================
# BASE — Node 20 (Alpine) + pnpm + bash
# ===================================================================
FROM node:20-alpine AS base
# bash is required by apps/web build script ("bash -c 'next build'")
RUN apk add --no-cache bash
RUN corepack enable && corepack prepare pnpm@10.26.2 --activate
WORKDIR /app

# ===================================================================
# DEPS — Install all workspace dependencies (cached layer)
# ===================================================================
FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/
COPY apps/server/package.json ./apps/server/
RUN pnpm install --frozen-lockfile

# ===================================================================
# SHARED BUILD
# ===================================================================
FROM deps AS shared-build
COPY packages/shared ./packages/shared
RUN pnpm --filter @wts/shared build

# ===================================================================
# SERVER BUILD — TypeScript compile + standalone deploy
# ===================================================================
FROM shared-build AS server-build
COPY apps/server ./apps/server
RUN pnpm --filter @wts/server build
# pnpm deploy: copies package + resolves workspace:* deps + prod-only node_modules
RUN pnpm --filter @wts/server deploy --prod /deploy/server

# ===================================================================
# WEB BUILD — Next.js with standalone output
# NEXT_PUBLIC_* vars are baked at build time; pass via docker-compose args
# ===================================================================
FROM shared-build AS web-build
COPY apps/web ./apps/web
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ARG NEXT_PUBLIC_SERVER_URL=http://localhost:3001
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_SERVER_URL=$NEXT_PUBLIC_SERVER_URL \
    NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY \
    NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @wts/web build

# ===================================================================
# DEV — Server with hot reload (tsx watch)
# Mount ./apps/server/src for live source changes
# ===================================================================
FROM deps AS server-dev
COPY packages/shared ./packages/shared
RUN pnpm --filter @wts/shared build
COPY apps/server ./apps/server
EXPOSE 3001
CMD ["pnpm", "--filter", "@wts/server", "exec", "tsx", "watch", "src/index.ts"]

# ===================================================================
# DEV — Web with hot reload (next dev)
# Mount ./apps/web/src for live source changes
# ===================================================================
FROM deps AS web-dev
COPY packages/shared ./packages/shared
RUN pnpm --filter @wts/shared build
COPY apps/web ./apps/web
ENV NEXT_TELEMETRY_DISABLED=1
EXPOSE 3000
CMD ["pnpm", "--filter", "@wts/web", "exec", "next", "dev", "-p", "3000"]

# ===================================================================
# RUNNER — Server (production)
# ===================================================================
FROM node:20-alpine AS server
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nodejs
COPY --from=server-build --chown=nodejs:nodejs /deploy/server ./
USER nodejs
EXPOSE 3001
CMD ["node", "dist/index.js"]

# ===================================================================
# RUNNER — Web (production, Next.js standalone)
# outputFileTracingRoot=monorepo root → server.js lives at apps/web/server.js
# ===================================================================
FROM node:20-alpine AS web
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=web-build --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=web-build --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=web-build --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public
USER nextjs
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
