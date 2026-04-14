# ─────────────────────────────────────────────────────────────────────────────
# Build context: monorepo root (docker build -f apps/api/Dockerfile .)
# This is required because pnpm-lock.yaml and packages/shared live at root.
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: dependency installer ────────────────────────────────────────────
FROM node:20-alpine AS deps

# Install pnpm via corepack (matches packageManager field in root package.json)
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

WORKDIR /app

# Copy manifests first — Docker layer cache: reinstall only when lockfile changes
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

# --frozen-lockfile: fail if lockfile is out of date (prevents silent dep drift)
RUN pnpm install --frozen-lockfile

# ── Stage 2: builder ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

WORKDIR /app

# Copy installed node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules 2>/dev/null || true

# Copy source
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
COPY package.json pnpm-workspace.yaml ./

# Generate Prisma client before TypeScript compilation
# The generated client is output into node_modules/@prisma/client
RUN pnpm --filter api db:generate

# Compile TypeScript → dist/
RUN pnpm --filter api build

# ── Stage 3: production runner ────────────────────────────────────────────────
FROM node:20-alpine AS runner

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

WORKDIR /app

ENV NODE_ENV=production

# Copy manifests (needed by pnpm to install prod-only deps)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

# Install production dependencies only (no devDependencies)
RUN pnpm install --frozen-lockfile --prod

# Copy compiled output from builder
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Copy Prisma schema and migrations — needed for prisma migrate deploy at startup
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma

# Copy generated Prisma client into the correct node_modules location
COPY --from=builder /app/node_modules/.pnpm ./node_modules/.pnpm
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/apps/api/node_modules/.prisma ./apps/api/node_modules/.prisma 2>/dev/null || true

# Non-root user for security (principle of least privilege)
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs && \
    chown -R nestjs:nodejs /app
USER nestjs

EXPOSE 4000

# Run migrations then start the server.
# Using sh -c so migrations run before the main process starts.
# If migrate deploy fails (e.g. DB not ready), the container exits — orchestrator retries.
CMD ["sh", "-c", "node apps/api/node_modules/.bin/prisma migrate deploy --schema apps/api/prisma/schema.prisma && node apps/api/dist/main"]
