#!/usr/bin/env bash
# CloudFront cache invalidation helper.
#
# When to use: rarely. Most product images use UUID filenames so a "new" image
# is a different URL — no invalidation needed. Invalidation is for branding
# files (/logo.svg, /favicon.ico) that change at the same path.
#
# Usage:
#   AWS_CLOUDFRONT_DISTRIBUTION_ID=E1ABCXYZ ./infra/aws/invalidate-cache.sh "/logo.svg" "/favicon.ico"
#   AWS_CLOUDFRONT_DISTRIBUTION_ID=E1ABCXYZ ./infra/aws/invalidate-cache.sh "/branding/*"
#
# Cost: first 1000 paths/month free, $0.005 per path after that. Don't spam.

set -euo pipefail

if [ -z "${AWS_CLOUDFRONT_DISTRIBUTION_ID:-}" ]; then
  echo "ERROR: set AWS_CLOUDFRONT_DISTRIBUTION_ID env variable" >&2
  exit 1
fi

if [ "$#" -eq 0 ]; then
  echo "Usage: $0 <path1> [path2 ...]" >&2
  echo "Example: $0 \"/logo.svg\" \"/favicon.ico\"" >&2
  exit 1
fi

CALLER_REF="invalidation-$(date +%s)"

# Build the JSON payload
PATHS_JSON=$(printf '"%s",' "$@" | sed 's/,$//')
INVALIDATION_BATCH=$(cat <<EOF
{
  "Paths": {
    "Quantity": $#,
    "Items": [$PATHS_JSON]
  },
  "CallerReference": "$CALLER_REF"
}
EOF
)

echo "Invalidating $# path(s) on distribution $AWS_CLOUDFRONT_DISTRIBUTION_ID..."
INVALIDATION_ID=$(aws cloudfront create-invalidation \
  --distribution-id "$AWS_CLOUDFRONT_DISTRIBUTION_ID" \
  --invalidation-batch "$INVALIDATION_BATCH" \
  --query 'Invalidation.Id' --output text)

echo "✓ Invalidation $INVALIDATION_ID created (takes 5–15 minutes to complete globally)"
echo "  Check status: aws cloudfront get-invalidation --distribution-id $AWS_CLOUDFRONT_DISTRIBUTION_ID --id $INVALIDATION_ID"
