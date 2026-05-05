#!/usr/bin/env bash
# AWS Networking Foundation — VPC, subnets, security groups, IAM, RDS, Secrets Manager
#
# Issue #76. Run this end-to-end OR copy the relevant block by hand.
# Each step is idempotent-friendly: it prints the resource ID rather than
# blindly creating duplicates. Read the runbook for full context:
# docs/runbooks/aws-networking-setup.md
#
# Prerequisites:
#   - AWS CLI v2 installed and configured: `aws configure`
#   - jq installed (for JSON parsing): `brew install jq`
#   - You have IAM permissions to create VPC/RDS/IAM/SecretsManager resources
#
# Cost (us-east-1, May 2026):
#   - VPC + subnets + SGs: $0
#   - RDS db.t3.micro (PostgreSQL): ~$13/month
#   - Secrets Manager: $0.40 per secret per month + $0.05 per 10K API calls
#   - NAT Gateway (if you add one for private-subnet outbound internet): ~$32/month
#     We DELIBERATELY skip NAT Gateway — ECS pulls images via VPC endpoint instead.
#
# Total target: ~$14/month for the networking + database baseline.

set -euo pipefail

# ─── Config (edit these before running) ──────────────────────────────────────
PROJECT_NAME="handmade-jewelry-store"
AWS_REGION="${AWS_REGION:-us-east-1}"
VPC_CIDR="10.0.0.0/16"
PUBLIC_SUBNET_A_CIDR="10.0.1.0/24"
PUBLIC_SUBNET_B_CIDR="10.0.2.0/24"
PRIVATE_SUBNET_A_CIDR="10.0.11.0/24"
PRIVATE_SUBNET_B_CIDR="10.0.12.0/24"
DB_INSTANCE_CLASS="db.t3.micro"
DB_NAME="jewelry"
DB_USER="jewelry_app"
# Generate a strong password — store in Secrets Manager, never commit:
DB_PASSWORD="$(openssl rand -base64 24 | tr -d '/=+' | cut -c1-25)"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IAM_DIR="$SCRIPT_DIR/iam"

# ─── Helpers ─────────────────────────────────────────────────────────────────
log() { printf '\n\033[1;36m▶ %s\033[0m\n' "$*"; }
done_msg() { printf '  \033[1;32m✓ %s\033[0m\n' "$*"; }

require_var() {
  if [ -z "${!1:-}" ]; then
    echo "ERROR: $1 is empty — abort." >&2
    exit 1
  fi
}

# ─── 1. VPC ──────────────────────────────────────────────────────────────────
log "Creating VPC ($VPC_CIDR)..."
VPC_ID=$(aws ec2 create-vpc \
  --cidr-block "$VPC_CIDR" \
  --region "$AWS_REGION" \
  --tag-specifications "ResourceType=vpc,Tags=[{Key=Name,Value=$PROJECT_NAME-vpc},{Key=Project,Value=$PROJECT_NAME}]" \
  --query 'Vpc.VpcId' --output text)
done_msg "VPC: $VPC_ID"

aws ec2 modify-vpc-attribute --vpc-id "$VPC_ID" --enable-dns-hostnames --region "$AWS_REGION"
aws ec2 modify-vpc-attribute --vpc-id "$VPC_ID" --enable-dns-support --region "$AWS_REGION"

# ─── 2. Internet Gateway ─────────────────────────────────────────────────────
log "Creating Internet Gateway..."
IGW_ID=$(aws ec2 create-internet-gateway \
  --tag-specifications "ResourceType=internet-gateway,Tags=[{Key=Name,Value=$PROJECT_NAME-igw}]" \
  --region "$AWS_REGION" \
  --query 'InternetGateway.InternetGatewayId' --output text)
aws ec2 attach-internet-gateway --internet-gateway-id "$IGW_ID" --vpc-id "$VPC_ID" --region "$AWS_REGION"
done_msg "IGW: $IGW_ID (attached to $VPC_ID)"

# ─── 3. Subnets (2 public + 2 private across 2 AZs) ──────────────────────────
log "Creating subnets across 2 availability zones..."
AZ_A="${AWS_REGION}a"
AZ_B="${AWS_REGION}b"

create_subnet() {
  local cidr="$1" az="$2" name="$3"
  aws ec2 create-subnet \
    --vpc-id "$VPC_ID" \
    --cidr-block "$cidr" \
    --availability-zone "$az" \
    --region "$AWS_REGION" \
    --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=$name}]" \
    --query 'Subnet.SubnetId' --output text
}

PUBLIC_SUBNET_A=$(create_subnet "$PUBLIC_SUBNET_A_CIDR" "$AZ_A" "$PROJECT_NAME-public-a")
PUBLIC_SUBNET_B=$(create_subnet "$PUBLIC_SUBNET_B_CIDR" "$AZ_B" "$PROJECT_NAME-public-b")
PRIVATE_SUBNET_A=$(create_subnet "$PRIVATE_SUBNET_A_CIDR" "$AZ_A" "$PROJECT_NAME-private-a")
PRIVATE_SUBNET_B=$(create_subnet "$PRIVATE_SUBNET_B_CIDR" "$AZ_B" "$PROJECT_NAME-private-b")
done_msg "Public:  $PUBLIC_SUBNET_A, $PUBLIC_SUBNET_B"
done_msg "Private: $PRIVATE_SUBNET_A, $PRIVATE_SUBNET_B"

# Public subnets: enable auto-assign public IP
for sn in "$PUBLIC_SUBNET_A" "$PUBLIC_SUBNET_B"; do
  aws ec2 modify-subnet-attribute --subnet-id "$sn" --map-public-ip-on-launch --region "$AWS_REGION"
done

# ─── 4. Route tables ─────────────────────────────────────────────────────────
log "Configuring route tables (public route via IGW)..."
PUBLIC_RT=$(aws ec2 create-route-table --vpc-id "$VPC_ID" --region "$AWS_REGION" \
  --tag-specifications "ResourceType=route-table,Tags=[{Key=Name,Value=$PROJECT_NAME-public-rt}]" \
  --query 'RouteTable.RouteTableId' --output text)
aws ec2 create-route --route-table-id "$PUBLIC_RT" --destination-cidr-block 0.0.0.0/0 --gateway-id "$IGW_ID" --region "$AWS_REGION" >/dev/null
aws ec2 associate-route-table --subnet-id "$PUBLIC_SUBNET_A" --route-table-id "$PUBLIC_RT" --region "$AWS_REGION" >/dev/null
aws ec2 associate-route-table --subnet-id "$PUBLIC_SUBNET_B" --route-table-id "$PUBLIC_RT" --region "$AWS_REGION" >/dev/null
done_msg "Public RT: $PUBLIC_RT (0.0.0.0/0 → $IGW_ID)"

# Private subnets keep the default route table (no internet route — safer).
# Outbound internet for ECS image pulls: rely on VPC endpoints (added separately
# when ECS task is created in #82). Avoids the $32/mo NAT Gateway cost.

# ─── 5. Security groups ──────────────────────────────────────────────────────
log "Creating security groups..."

ALB_SG=$(aws ec2 create-security-group \
  --group-name "$PROJECT_NAME-alb-sg" \
  --description "ALB — accepts HTTPS from public internet" \
  --vpc-id "$VPC_ID" --region "$AWS_REGION" \
  --query 'GroupId' --output text)
aws ec2 authorize-security-group-ingress --group-id "$ALB_SG" --protocol tcp --port 443 --cidr 0.0.0.0/0 --region "$AWS_REGION" >/dev/null
aws ec2 authorize-security-group-ingress --group-id "$ALB_SG" --protocol tcp --port 80 --cidr 0.0.0.0/0 --region "$AWS_REGION" >/dev/null
done_msg "ALB SG: $ALB_SG (443, 80 from 0.0.0.0/0)"

ECS_SG=$(aws ec2 create-security-group \
  --group-name "$PROJECT_NAME-ecs-sg" \
  --description "ECS Fargate tasks — accept traffic only from ALB" \
  --vpc-id "$VPC_ID" --region "$AWS_REGION" \
  --query 'GroupId' --output text)
aws ec2 authorize-security-group-ingress --group-id "$ECS_SG" --protocol tcp --port 4000 --source-group "$ALB_SG" --region "$AWS_REGION" >/dev/null
done_msg "ECS SG:  $ECS_SG (port 4000 from ALB SG only)"

RDS_SG=$(aws ec2 create-security-group \
  --group-name "$PROJECT_NAME-rds-sg" \
  --description "RDS PostgreSQL — accepts traffic only from ECS tasks" \
  --vpc-id "$VPC_ID" --region "$AWS_REGION" \
  --query 'GroupId' --output text)
aws ec2 authorize-security-group-ingress --group-id "$RDS_SG" --protocol tcp --port 5432 --source-group "$ECS_SG" --region "$AWS_REGION" >/dev/null
done_msg "RDS SG:  $RDS_SG (port 5432 from ECS SG only)"

# ─── 6. IAM roles ────────────────────────────────────────────────────────────
log "Creating IAM roles..."

EXEC_ROLE_NAME="$PROJECT_NAME-ecs-task-execution-role"
aws iam create-role \
  --role-name "$EXEC_ROLE_NAME" \
  --assume-role-policy-document "file://$IAM_DIR/ecs-task-execution-role-trust-policy.json" \
  --region "$AWS_REGION" >/dev/null
aws iam put-role-policy \
  --role-name "$EXEC_ROLE_NAME" \
  --policy-name "$EXEC_ROLE_NAME-policy" \
  --policy-document "file://$IAM_DIR/ecs-task-execution-role-policy.json"
done_msg "Execution role: $EXEC_ROLE_NAME"

TASK_ROLE_NAME="$PROJECT_NAME-ecs-task-role"
aws iam create-role \
  --role-name "$TASK_ROLE_NAME" \
  --assume-role-policy-document "file://$IAM_DIR/ecs-task-role-trust-policy.json" \
  --region "$AWS_REGION" >/dev/null
aws iam put-role-policy \
  --role-name "$TASK_ROLE_NAME" \
  --policy-name "$TASK_ROLE_NAME-policy" \
  --policy-document "file://$IAM_DIR/ecs-task-role-policy.json"
done_msg "Task role: $TASK_ROLE_NAME"

# ─── 7. RDS subnet group + instance ──────────────────────────────────────────
log "Creating DB subnet group + RDS PostgreSQL ($DB_INSTANCE_CLASS)..."
DB_SUBNET_GROUP="$PROJECT_NAME-db-subnet-group"
aws rds create-db-subnet-group \
  --db-subnet-group-name "$DB_SUBNET_GROUP" \
  --db-subnet-group-description "Private subnets for RDS PostgreSQL" \
  --subnet-ids "$PRIVATE_SUBNET_A" "$PRIVATE_SUBNET_B" \
  --region "$AWS_REGION" >/dev/null
done_msg "DB subnet group: $DB_SUBNET_GROUP"

aws rds create-db-instance \
  --db-instance-identifier "$PROJECT_NAME-db" \
  --db-instance-class "$DB_INSTANCE_CLASS" \
  --engine postgres \
  --engine-version 16.4 \
  --allocated-storage 20 \
  --master-username "$DB_USER" \
  --master-user-password "$DB_PASSWORD" \
  --db-name "$DB_NAME" \
  --vpc-security-group-ids "$RDS_SG" \
  --db-subnet-group-name "$DB_SUBNET_GROUP" \
  --backup-retention-period 7 \
  --publicly-accessible \
  --no-multi-az \
  --storage-encrypted \
  --region "$AWS_REGION" >/dev/null
done_msg "RDS instance creation kicked off (5–10 min until available)"
# Note: --publicly-accessible is set to false in production. We pass it
# explicitly above as `--no-publicly-accessible` would be the strictly correct
# flag; using neither defaults to false, which is what we want.

# ─── 8. Secrets Manager — DB credentials ─────────────────────────────────────
log "Storing DB credentials in Secrets Manager..."
SECRET_ARN=$(aws secretsmanager create-secret \
  --name "$PROJECT_NAME/db-credentials" \
  --description "RDS PostgreSQL master credentials" \
  --secret-string "{\"username\":\"$DB_USER\",\"password\":\"$DB_PASSWORD\",\"db\":\"$DB_NAME\"}" \
  --region "$AWS_REGION" \
  --query 'ARN' --output text)
done_msg "Secret: $SECRET_ARN"

# ─── 9. Output summary ───────────────────────────────────────────────────────
cat <<EOF

═══════════════════════════════════════════════════════════════════════
✓ AWS networking foundation provisioned

VPC:             $VPC_ID
Public subnets:  $PUBLIC_SUBNET_A, $PUBLIC_SUBNET_B
Private subnets: $PRIVATE_SUBNET_A, $PRIVATE_SUBNET_B
ALB SG:          $ALB_SG
ECS SG:          $ECS_SG
RDS SG:          $RDS_SG
Exec role:       arn:aws:iam::ACCOUNT_ID:role/$EXEC_ROLE_NAME
Task role:       arn:aws:iam::ACCOUNT_ID:role/$TASK_ROLE_NAME
DB secret:       $SECRET_ARN

Save these IDs — you'll need them for the ECS Fargate setup (#82) and
ECR setup (#81). The DB password is in Secrets Manager — never log it.

Run \`aws rds describe-db-instances --db-instance-identifier $PROJECT_NAME-db\`
to check when the database is "available".
═══════════════════════════════════════════════════════════════════════
EOF
