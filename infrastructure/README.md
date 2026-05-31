# Terraform / OpenTofu — AWS Infrastructure

Codifies every AWS resource the production stack needs: VPC, RDS, ECS Fargate,
ALB, ECR, S3 + CloudFront, IAM, Secrets Manager, optional Route53 + ACM, and
CloudWatch alarms. Issue [#102](https://github.com/dmitry-malykhin/handmade-jewelry-store/issues/102).

## When to use

- **Fresh AWS account** — `terraform apply` from scratch.
- **Disaster recovery** — destroy and re-create the whole stack from this code.
- **New environment** — copy `terraform.tfvars` to `staging.tfvars`, change
  `environment` and resource names, point a new tfstate key at it.

For the manual click-through or bash-script paths, see [`infra/aws/`](../infra/aws/).
This Terraform setup produces the same resource shape — pick whichever you're
more comfortable maintaining.

## Layout

```
infrastructure/
├── README.md                 # this file
├── versions.tf               # required providers (aws ~> 5.60, random ~> 3.6)
├── providers.tf              # aws + aliased aws.us_east_1 (CloudFront/ACM)
├── backend.tf                # commented S3 backend — uncomment after bootstrap
├── variables.tf              # all inputs with sensible defaults
├── outputs.tf                # IDs/ARNs the deploy pipeline reads
├── main.tf                   # wires modules together
├── terraform.tfvars.example  # copy → terraform.tfvars and customize
└── modules/
    ├── networking/           # VPC, subnets, IGW, route tables, SGs
    ├── database/             # RDS PostgreSQL + Secrets Manager
    ├── compute/              # ECR + ECS cluster/task/service + ALB
    ├── cdn/                  # S3 + CloudFront + OAC + bucket policy
    ├── dns/                  # Route53 zone + ACM cert (optional)
    ├── observability/        # CloudWatch alarms + SNS (optional, #89)
    └── deploy-iam/           # GitHub Actions IAM user + access keys
```

## Tooling

Tested with **OpenTofu 1.12+** (drop-in compatible with Terraform 1.5+).
Install either:

```bash
brew install opentofu      # FOSS, default for new projects
# or
brew install terraform     # HashiCorp BSL; same HCL syntax
```

Commands below use `tofu`; replace with `terraform` if you prefer.

## First-time bootstrap

The remote state backend (`backend.tf`) is commented out by design — you
need the S3 bucket and DynamoDB lock table to exist before `tofu init`
can use them. Run once per AWS account:

```bash
# Set your account region first
export AWS_REGION=us-east-1
aws s3api create-bucket \
  --bucket handmade-jewelry-store-tfstate \
  --region "$AWS_REGION"
aws s3api put-bucket-versioning \
  --bucket handmade-jewelry-store-tfstate \
  --versioning-configuration Status=Enabled
aws s3api put-bucket-encryption \
  --bucket handmade-jewelry-store-tfstate \
  --server-side-encryption-configuration \
    '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
aws dynamodb create-table \
  --table-name handmade-jewelry-store-tflock \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region "$AWS_REGION"
```

Then uncomment the `backend "s3"` block in `backend.tf` and run
`tofu init -reconfigure`.

## Per-environment apply

```bash
cd infrastructure/

# 1. Configure your AWS credentials
aws configure   # or: export AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=...

# 2. Provide variables
cp terraform.tfvars.example terraform.tfvars
$EDITOR terraform.tfvars

# 3. Initialise (downloads providers + reads backend config)
tofu init

# 4. Preview every resource that will be created/changed/destroyed
tofu plan -out=tf.plan

# 5. Read the diff, then apply
tofu apply tf.plan

# 6. Save outputs for the deploy pipeline / GitHub Secrets
tofu output                                      # human-readable
tofu output -raw github_actions_access_key_id    # single value
tofu output -raw github_actions_secret_access_key   # sensitive
```

## Topology

```
Internet
   │
   ▼
ALB (public subnets, HTTPS via ACM)
   │
   ▼
ECS Fargate tasks (private subnets, NestJS container)
   │
   ├──► RDS PostgreSQL (private subnets)
   ├──► Secrets Manager (DB creds, app secrets)
   ├──► S3 product-images bucket
   └──► CloudWatch logs

S3 product-images ──OAC──► CloudFront ──► public
```

## Module dependencies (apply order)

`networking → database → (dns) → compute → cdn → observability → deploy-iam`

The `count = ...` guard on `dns` and `observability` lets you bring the stack
up in two passes:

1. First apply: leave `domain_name = ""` and `alarm_email = ""`. ECS comes
   up on a non-HTTPS ALB; alarms aren't created. Validate end-to-end against
   the raw ALB DNS.
2. Second apply: set `domain_name`, `manage_dns_in_aws = true`, and
   `alarm_email`. Re-run `tofu apply` — Route53 + ACM + alarms are added,
   ALB listener flips to HTTPS.

This avoids the chicken-and-egg of needing a validated cert before the ALB
exists.

## Cost estimate (us-east-1, May 2026)

| Resource                       | Monthly  |
| ------------------------------ | -------- |
| RDS db.t3.micro (PostgreSQL)   | ~$13     |
| ECS Fargate 0.25 vCPU + 0.5 GB | ~$8      |
| ALB                            | ~$16     |
| Secrets Manager (2 secrets)    | ~$1      |
| S3 + CloudFront (low traffic)  | ~$1      |
| Route53 hosted zone            | $0.50    |
| ACM certificate                | $0       |
| CloudWatch logs + alarms       | ~$2      |
| **Subtotal**                   | **~$42** |

Pre-launch (no real traffic): use the documented Fly.io + Neon path in
[`docs/12_PLAN_PERSONAL.md`](../docs/12_PLAN_PERSONAL.md) instead — it's $0/month.
Only spin this up once you've crossed the revenue threshold.

## Verifying changes without applying

```bash
tofu fmt -recursive        # auto-format
tofu validate              # syntax + semantic check (no AWS calls)
tofu plan                  # full diff against current state
```

CI doesn't currently gate on these — if you change Terraform, run them
locally before opening the PR.

## Removing the whole stack

```bash
tofu destroy
```

RDS has `skip_final_snapshot = false`, so a final snapshot is taken before
the database disappears. The Secrets Manager entries are _not_ immediately
purged — they enter a 7-day recovery window. Use
`aws secretsmanager delete-secret --force-delete-without-recovery` if you
need to recycle the same secret name immediately.
