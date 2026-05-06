#!/usr/bin/env bash
# AWS CloudFront + S3 — product images CDN
#
# Issue #77. Run this end-to-end OR copy blocks by hand. Each step prints the
# resource ID — save the printed values after you run the script.
#
# Phase 1 (this script): S3 bucket + CloudFront distribution with default
#   cloudfront.net domain. Works immediately, no domain dependency.
# Phase 2 (separate, after #43 domain): add custom alias cdn.senichka.com +
#   ACM certificate. Steps documented in the runbook, NOT in this script.
#
# Prerequisites:
#   - AWS CLI v2 + jq installed
#   - aws configure (us-east-1)
#   - IAM permissions: s3:CreateBucket, s3:PutBucketPolicy, s3:PutBucketCors,
#     s3:PutLifecycleConfiguration, cloudfront:CreateDistribution,
#     cloudfront:CreateOriginAccessControl
#
# Cost (us-east-1, May 2026):
#   - S3 storage: $0.023/GB/month (negligible at our scale)
#   - CloudFront egress: $0.085/GB (first 10 TB)  — typical $1-5/month
#   - CloudFront requests: $0.0075 per 10K  — typical $0.50/month
#   - ACM cert: $0 (free for CloudFront)
# Total target: ~$1-6/month for the CDN baseline

set -euo pipefail

# ─── Config ──────────────────────────────────────────────────────────────────
PROJECT_NAME="handmade-jewelry-store"
AWS_REGION="${AWS_REGION:-us-east-1}"
BUCKET_NAME="${PROJECT_NAME}-product-images"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
S3_DIR="$SCRIPT_DIR/s3"
CF_DIR="$SCRIPT_DIR/cloudfront"

log() { printf '\n\033[1;36m▶ %s\033[0m\n' "$*"; }
done_msg() { printf '  \033[1;32m✓ %s\033[0m\n' "$*"; }

# ─── 1. AWS account ID (needed for OAC bucket policy) ────────────────────────
log "Resolving AWS account ID..."
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query 'Account' --output text)
done_msg "Account: $AWS_ACCOUNT_ID"

# ─── 2. S3 bucket ────────────────────────────────────────────────────────────
log "Creating S3 bucket: $BUCKET_NAME ($AWS_REGION)..."
# us-east-1 doesn't accept LocationConstraint; other regions require it.
if [ "$AWS_REGION" = "us-east-1" ]; then
  aws s3api create-bucket \
    --bucket "$BUCKET_NAME" \
    --region "$AWS_REGION" >/dev/null
else
  aws s3api create-bucket \
    --bucket "$BUCKET_NAME" \
    --region "$AWS_REGION" \
    --create-bucket-configuration "LocationConstraint=$AWS_REGION" >/dev/null
fi

# Block all public access — CloudFront accesses via OAC, never direct.
aws s3api put-public-access-block \
  --bucket "$BUCKET_NAME" \
  --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# Versioning — defense against accidental delete during admin operations.
aws s3api put-bucket-versioning \
  --bucket "$BUCKET_NAME" \
  --versioning-configuration "Status=Enabled"

# Default encryption (SSE-S3, free).
aws s3api put-bucket-encryption \
  --bucket "$BUCKET_NAME" \
  --server-side-encryption-configuration '{
    "Rules": [
      {
        "ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"},
        "BucketKeyEnabled": true
      }
    ]
  }'
done_msg "Bucket: $BUCKET_NAME (private, versioned, encrypted)"

# ─── 3. CORS — allow browser PUT from app origins ────────────────────────────
log "Applying CORS (PUT from localhost / vercel / senichka.com)..."
aws s3api put-bucket-cors \
  --bucket "$BUCKET_NAME" \
  --cors-configuration "file://$S3_DIR/cors-config.json"
done_msg "CORS applied"

# ─── 4. Lifecycle — auto-cleanup uploads/ after 24h ──────────────────────────
log "Applying lifecycle (uploads/* expires in 1 day)..."
aws s3api put-bucket-lifecycle-configuration \
  --bucket "$BUCKET_NAME" \
  --lifecycle-configuration "file://$S3_DIR/lifecycle-config.json"
done_msg "Lifecycle applied"

# ─── 5. Origin Access Control (OAC) ──────────────────────────────────────────
log "Creating CloudFront Origin Access Control (OAC)..."
OAC_ID=$(aws cloudfront create-origin-access-control \
  --origin-access-control-config "
    Name=${PROJECT_NAME}-oac,
    Description=OAC for ${BUCKET_NAME},
    SigningBehavior=always,
    SigningProtocol=sigv4,
    OriginAccessControlOriginType=s3" \
  --query 'OriginAccessControl.Id' --output text)
done_msg "OAC: $OAC_ID"

# ─── 6. CloudFront distribution ──────────────────────────────────────────────
log "Creating CloudFront distribution (PriceClass_100, default cert)..."
# Replace placeholders in the distribution config.
DIST_CONFIG_TMP="$(mktemp)"
sed \
  -e "s|__CALLER_REFERENCE__|${PROJECT_NAME}-$(date +%s)|" \
  -e "s|__OAC_ID__|$OAC_ID|" \
  "$CF_DIR/distribution-config.json" > "$DIST_CONFIG_TMP"

DIST_RESPONSE=$(aws cloudfront create-distribution \
  --distribution-config "file://$DIST_CONFIG_TMP")
DIST_ID=$(echo "$DIST_RESPONSE" | jq -r '.Distribution.Id')
DIST_DOMAIN=$(echo "$DIST_RESPONSE" | jq -r '.Distribution.DomainName')
rm "$DIST_CONFIG_TMP"
done_msg "Distribution: $DIST_ID ($DIST_DOMAIN)"

# ─── 7. Bucket policy — allow CloudFront OAC read ────────────────────────────
log "Applying bucket policy (CloudFront OAC read-only access)..."
BUCKET_POLICY_TMP="$(mktemp)"
sed \
  -e "s|__ACCOUNT_ID__|$AWS_ACCOUNT_ID|" \
  -e "s|__DISTRIBUTION_ID__|$DIST_ID|" \
  "$S3_DIR/bucket-policy.json" > "$BUCKET_POLICY_TMP"

aws s3api put-bucket-policy \
  --bucket "$BUCKET_NAME" \
  --policy "file://$BUCKET_POLICY_TMP"
rm "$BUCKET_POLICY_TMP"
done_msg "Bucket policy applied"

# ─── 8. Output summary ───────────────────────────────────────────────────────
cat <<EOF

═══════════════════════════════════════════════════════════════════════
✓ CloudFront + S3 provisioned

S3 bucket:           $BUCKET_NAME
CloudFront dist ID:  $DIST_ID
CloudFront domain:   https://$DIST_DOMAIN

Distribution status: deploying (10–20 min until "Deployed").
Check with:
  aws cloudfront get-distribution --id $DIST_ID --query 'Distribution.Status'

Add to .env.prod.local:
  AWS_S3_BUCKET=$BUCKET_NAME
  AWS_S3_PUBLIC_URL_PREFIX=https://$DIST_DOMAIN
  AWS_CLOUDFRONT_DISTRIBUTION_ID=$DIST_ID

Phase 2 — add custom domain (cdn.senichka.com):
  Documented in docs/runbooks/aws-cloudfront-s3-setup.md → "Phase 2"
  Skip until #43 (domain purchase) is done.
═══════════════════════════════════════════════════════════════════════
EOF
