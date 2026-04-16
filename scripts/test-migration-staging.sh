#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# scripts/test-migration-staging.sh — test Prisma migrations on Neon staging
# branch before applying to production.
#
# Usage:
#   NEON_PROJECT_ID=<id> bash scripts/test-migration-staging.sh
#
# Prerequisites:
#   - neonctl installed: npm install -g neonctl
#   - neonctl auth completed: neonctl auth
#   - Staging branch exists: neonctl branches create --name staging
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

NEON_PROJECT_ID="${NEON_PROJECT_ID:-}"

if [[ -z "$NEON_PROJECT_ID" ]]; then
  echo "❌ NEON_PROJECT_ID is not set"
  echo "   Get it from: neonctl projects list"
  exit 1
fi

echo ""
echo "━━━ Migration staging test ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── Step 1: Reset staging branch to match current prod ───────────────────────
echo "→ Resetting staging branch to match production..."
neonctl branches reset staging --parent --project-id "$NEON_PROJECT_ID"
echo "  ✅ Staging branch reset"

# ── Step 2: Get staging connection string ────────────────────────────────────
echo "→ Getting staging connection string..."
STAGING_DB_URL=$(neonctl connection-string --branch staging --project-id "$NEON_PROJECT_ID")
echo "  ✅ Connection string obtained"

# ── Step 3: Run migration on staging ─────────────────────────────────────────
echo "→ Running Prisma migrate deploy on staging..."
DATABASE_URL="$STAGING_DB_URL" pnpm --filter api prisma migrate deploy
echo "  ✅ Migration applied to staging"

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo "━━━ Staging migration succeeded ━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo "  1. Verify data: DATABASE_URL=\"$STAGING_DB_URL\" pnpm --filter api prisma studio"
echo "  2. If everything looks good, apply to production:"
echo "     DATABASE_URL=<prod-url> pnpm --filter api prisma migrate deploy"
echo ""
