# AWS Infrastructure

Source-controlled artifacts for provisioning the AWS networking, storage, CDN,
and IAM foundation that ECS Fargate (#82) and the production deploy pipeline
depend on.

## Layout

```
infra/aws/
├── README.md                       # this file
├── setup-networking.sh             # one-shot provisioner — VPC + RDS + IAM (#76)
├── setup-cloudfront-s3.sh          # one-shot provisioner — S3 + CloudFront (#77)
├── setup-ecr.sh                    # one-shot provisioner — ECR + GitHub Actions IAM (#81)
├── invalidate-cache.sh             # CloudFront cache invalidation helper (#77)
├── iam/
│   ├── ecs-task-execution-role-trust-policy.json
│   ├── ecs-task-execution-role-policy.json
│   ├── ecs-task-role-trust-policy.json
│   └── ecs-task-role-policy.json
├── s3/
│   ├── bucket-policy.json          # OAC read-only access for CloudFront
│   ├── cors-config.json            # presigned PUT from app origins
│   └── lifecycle-config.json       # auto-cleanup of uploads/ temp files
├── cloudfront/
│   └── distribution-config.json    # template for CloudFront distribution
└── ecr/
    ├── lifecycle-policy.json       # keep last 30 SHA images, expire untagged after 7d
    └── github-actions-policy.json  # ECR push + ECS deploy IAM policy for CI
```

## How to use

Two paths — pick whichever you're more comfortable with.

### Path A — Manual via AWS Console

Step-by-step click-through walkthrough:
[`docs/runbooks/aws-networking-setup.md`](../../docs/runbooks/aws-networking-setup.md)

Best for: first-time setup, learning what each resource does, debugging.

### Path B — Scripted via AWS CLI

```bash
# 1. Configure AWS CLI once
aws configure   # provide IAM access key, secret, region (us-east-1)

# 2. Run the provisioners — order matters
./infra/aws/setup-networking.sh        # #76: VPC + RDS + IAM
./infra/aws/setup-cloudfront-s3.sh     # #77: S3 + CloudFront
./infra/aws/setup-ecr.sh               # #81: ECR repo + GitHub Actions IAM user

# 3. Save the printed resource IDs into your password manager / .env.prod
#    for later use in #82 (ECS) and the production deploy workflow.
#    The setup-ecr.sh script also prints AWS access keys — save them as
#    GitHub Secrets immediately.
```

Best for: re-runs in fresh AWS accounts (e.g. company sandbox → prod).

### Path C — Terraform / OpenTofu (recommended for new accounts)

```bash
cd infrastructure/
cp terraform.tfvars.example terraform.tfvars
$EDITOR terraform.tfvars
tofu init
tofu plan -out=tf.plan
tofu apply tf.plan
```

Same resource shape as Paths A and B; full instructions in
[`infrastructure/README.md`](../../infrastructure/README.md). Delivered in
#102.

Best for: reproducible, reviewable infra. Skip the bash scripts entirely
on greenfield accounts.

## What this **does not** do

- ❌ ECS Fargate cluster + task definitions (#82 — separate; Terraform module
  is included in `infrastructure/modules/compute/`)
- ❌ ALB / target groups (#82 — depends on networking + ECS; same Terraform module)
- ❌ Custom domain on CloudFront (`cdn.senichka.com`) — Phase 2 in #77 runbook, requires #43 (domain setup)
- ❌ OIDC federation for GitHub Actions (uses access keys for now) — post-MVP improvement, see #81 runbook

## Cost summary

| Resource                         | Class / Type                         | Monthly cost (us-east-1, May 2026) |
| -------------------------------- | ------------------------------------ | ---------------------------------- |
| VPC + subnets + SGs + IGW        | n/a                                  | $0                                 |
| RDS PostgreSQL                   | db.t3.micro, 20 GB gp2, 7-day backup | ~$13                               |
| Secrets Manager                  | 1 secret + light API calls           | ~$0.40                             |
| S3 storage                       | ~50 MB product images at launch      | ~$0                                |
| CloudFront egress                | ~10 GB/month at launch traffic       | ~$1                                |
| CloudFront requests              | ~100K/month at launch                | ~$0.50                             |
| ECR storage                      | ~30 retained API images, ~1.5 GB     | ~$2                                |
| **NOT provisioned:** NAT Gateway | —                                    | **$0** (saves ~$32/mo)             |

**Baseline networking + DB + CDN + registry:** ~$17/month before adding ECS/ALB.

## Production cutover prerequisites

Before running `setup-networking.sh` against production AWS:

- [ ] AWS account exists and billing is set up
- [ ] IAM user (or role) with `AdministratorAccess` for the initial bootstrap
  - Strip down to least-privilege after the first run
- [ ] AWS CLI v2 installed locally (`aws --version` → 2.x)
- [ ] `jq` installed (`brew install jq`)
- [ ] Region decision made (default: `us-east-1` — closest to US East customers, cheapest)
- [ ] Cost alerts configured in AWS Billing (set $50/month threshold initially)
