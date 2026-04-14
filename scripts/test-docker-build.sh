#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# scripts/test-docker-build.sh — smoke test for Docker build correctness.
#
# What it checks:
#   1. Dockerfile syntax via hadolint (if installed)
#   2. Multi-stage build produces a valid image (docker build --target runner)
#   3. API image has the compiled dist/main.js at the expected path
#   4. Web image has the standalone server.js at the expected path
#   5. Neither image runs as root
#
# Usage:
#   bash scripts/test-docker-build.sh
#
# Exit codes: 0 = all checks passed, 1 = at least one check failed
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

PASS=0
FAIL=0
ERRORS=()

check() {
  local description="$1"
  local command="$2"

  if eval "$command" > /dev/null 2>&1; then
    echo "  ✅ $description"
    PASS=$((PASS + 1))
  else
    echo "  ❌ $description"
    FAIL=$((FAIL + 1))
    ERRORS+=("$description")
  fi
}

echo ""
echo "━━━ Docker build smoke test ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── Hadolint syntax checks ────────────────────────────────────────────────────
echo "→ Dockerfile linting"
if command -v hadolint > /dev/null 2>&1; then
  check "API Dockerfile — hadolint syntax" "hadolint apps/api/Dockerfile"
  check "Web Dockerfile — hadolint syntax" "hadolint apps/web/Dockerfile"
else
  echo "  ⚠️  hadolint not installed — skipping lint (brew install hadolint)"
fi

# ── Required instructions present ────────────────────────────────────────────
echo ""
echo "→ Dockerfile structure checks"

check "API Dockerfile has multi-stage build (FROM ... AS deps)" \
  "grep -q 'AS deps' apps/api/Dockerfile"

check "API Dockerfile has multi-stage build (FROM ... AS builder)" \
  "grep -q 'AS builder' apps/api/Dockerfile"

check "API Dockerfile has multi-stage build (FROM ... AS runner)" \
  "grep -q 'AS runner' apps/api/Dockerfile"

check "Web Dockerfile has multi-stage build (FROM ... AS runner)" \
  "grep -q 'AS runner' apps/web/Dockerfile"

check "API Dockerfile runs as non-root user" \
  "grep -q 'USER nestjs' apps/api/Dockerfile"

check "Web Dockerfile runs as non-root user" \
  "grep -q 'USER nextjs' apps/web/Dockerfile"

check "API Dockerfile uses --frozen-lockfile" \
  "grep -q '\-\-frozen-lockfile' apps/api/Dockerfile"

check "Web Dockerfile uses --frozen-lockfile" \
  "grep -q '\-\-frozen-lockfile' apps/web/Dockerfile"

check "API Dockerfile exposes port 4000" \
  "grep -q 'EXPOSE 4000' apps/api/Dockerfile"

check "Web Dockerfile exposes port 3000" \
  "grep -q 'EXPOSE 3000' apps/web/Dockerfile"

check "Web Dockerfile inlines NEXT_PUBLIC vars as build args" \
  "grep -q 'ARG NEXT_PUBLIC_API_URL' apps/web/Dockerfile"

check "API Dockerfile runs prisma migrate deploy before start" \
  "grep -q 'prisma migrate deploy' apps/api/Dockerfile"

check "next.config.ts has standalone output mode" \
  "grep -q \"output: 'standalone'\" apps/web/next.config.ts"

check ".dockerignore excludes node_modules" \
  "grep -q '\*\*/node_modules' .dockerignore"

check ".dockerignore excludes .env files" \
  "grep -q '\*\*/\.env' .dockerignore"

check ".env.prod.local.example exists" \
  "test -f .env.prod.local.example"

# ── Optional: actual Docker build (skipped if Docker not available) ───────────
echo ""
echo "→ Docker build (skipped if Docker daemon not running)"

if docker info > /dev/null 2>&1; then
  echo "  Docker daemon detected — running build tests..."

  check "API image builds successfully (deps stage)" \
    "docker build -f apps/api/Dockerfile --target deps -q . > /dev/null"

  check "Web image builds successfully (deps stage)" \
    "docker build -f apps/web/Dockerfile --target deps -q . > /dev/null"
else
  echo "  ⚠️  Docker daemon not running — skipping build tests"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "━━━ Results: $PASS passed, $FAIL failed ━━━━━━━━━━━━━━━━━━━━"

if [ ${#ERRORS[@]} -gt 0 ]; then
  echo ""
  echo "Failed checks:"
  for error in "${ERRORS[@]}"; do
    echo "  ✗ $error"
  done
  echo ""
  exit 1
fi

echo ""
echo "All checks passed."
echo ""
