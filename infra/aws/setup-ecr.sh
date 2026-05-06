#!/usr/bin/env bash
# AWS ECR — repository for the NestJS API Docker image + IAM user for GitHub Actions
#
# Issue #81. Runs end-to-end OR copy blocks by hand.
#
# Prerequisites:
#   - AWS CLI v2 + jq installed
#   - aws configure (us-east-1)
#   - IAM permissions: ecr:CreateRepository, ecr:PutLifecyclePolicy,
#     iam:CreateUser, iam:PutUserPolicy, iam:CreateAccessKey
#
# Cost (us-east-1, May 2026):
#   - ECR storage: $0.10/GB/month — typical $1-3/mo for ~30 retained images
#   - Data transfer: $0 within same region (ECR → ECS in us-east-1)
#   - Total: ~$2/mo

set -euo pipefail

# ─── Config ──────────────────────────────────────────────────────────────────
PROJECT_NAME="handmade-jewelry-store"
AWS_REGION="${AWS_REGION:-us-east-1}"
ECR_REPO_NAME="handmade-jewelry-api"
GITHUB_ACTIONS_USER="${PROJECT_NAME}-github-actions"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ECR_DIR="$SCRIPT_DIR/ecr"

log() { printf '\n\033[1;36m▶ %s\033[0m\n' "$*"; }
done_msg() { printf '  \033[1;32m✓ %s\033[0m\n' "$*"; }
warn_msg() { printf '  \033[1;33m⚠ %s\033[0m\n' "$*"; }

# ─── 1. ECR repository ───────────────────────────────────────────────────────
log "Creating ECR repository: $ECR_REPO_NAME..."
ECR_URI=$(aws ecr create-repository \
  --repository-name "$ECR_REPO_NAME" \
  --region "$AWS_REGION" \
  --image-scanning-configuration "scanOnPush=true" \
  --image-tag-mutability "IMMUTABLE" \
  --encryption-configuration "encryptionType=AES256" \
  --query 'repository.repositoryUri' --output text)
done_msg "Repository: $ECR_URI"

# ─── 2. Lifecycle policy — keep last 30 SHA images, expire untagged after 7d ─
log "Applying lifecycle policy..."
aws ecr put-lifecycle-policy \
  --repository-name "$ECR_REPO_NAME" \
  --lifecycle-policy-text "file://$ECR_DIR/lifecycle-policy.json" \
  --region "$AWS_REGION" >/dev/null
done_msg "Lifecycle: keep last 30 SHA images, expire untagged after 7 days"

# ─── 3. IAM user for GitHub Actions ──────────────────────────────────────────
log "Creating IAM user for GitHub Actions: $GITHUB_ACTIONS_USER..."
aws iam create-user --user-name "$GITHUB_ACTIONS_USER" >/dev/null
done_msg "User: $GITHUB_ACTIONS_USER"

# ─── 4. Inline policy — minimal ECR push + ECS deploy permissions ────────────
log "Attaching inline policy (ECR push + ECS deploy permissions)..."
aws iam put-user-policy \
  --user-name "$GITHUB_ACTIONS_USER" \
  --policy-name "${GITHUB_ACTIONS_USER}-policy" \
  --policy-document "file://$ECR_DIR/github-actions-policy.json"
done_msg "Inline policy attached"

# ─── 5. Access key for GitHub Actions ────────────────────────────────────────
log "Creating access key (only shown once — save NOW into GitHub Secrets)..."
ACCESS_KEY_JSON=$(aws iam create-access-key --user-name "$GITHUB_ACTIONS_USER")
ACCESS_KEY_ID=$(echo "$ACCESS_KEY_JSON" | jq -r '.AccessKey.AccessKeyId')
SECRET_ACCESS_KEY=$(echo "$ACCESS_KEY_JSON" | jq -r '.AccessKey.SecretAccessKey')
done_msg "Access key created"

# ─── 6. Output summary ───────────────────────────────────────────────────────
cat <<EOF

═══════════════════════════════════════════════════════════════════════
✓ ECR + GitHub Actions IAM provisioned

ECR repository:  $ECR_URI
ECR repo name:   $ECR_REPO_NAME

Add to GitHub repo Secrets (Settings → Secrets and variables → Actions):
  AWS_ACCESS_KEY_ID:     $ACCESS_KEY_ID
  AWS_SECRET_ACCESS_KEY: $SECRET_ACCESS_KEY
  AWS_REGION:            $AWS_REGION
  ECR_REPOSITORY:        $ECR_REPO_NAME
  ECS_CLUSTER:           handmade-jewelry-store-cluster      (will create in #82)
  ECS_SERVICE:           handmade-jewelry-api                (will create in #82)
  ECS_TASK_DEFINITION:   handmade-jewelry-api                (will create in #82)

⚠ SECURITY: SecretAccessKey is shown only once. Save it NOW. If lost, you
  must rotate (delete + create a new access key).

To rotate access key (recommended every 90 days):
  aws iam list-access-keys --user-name $GITHUB_ACTIONS_USER
  aws iam create-access-key --user-name $GITHUB_ACTIONS_USER
  # Update GitHub Secret with new key, verify a deploy works,
  # then delete the old:
  aws iam delete-access-key --user-name $GITHUB_ACTIONS_USER --access-key-id <OLD_KEY_ID>
═══════════════════════════════════════════════════════════════════════
EOF
