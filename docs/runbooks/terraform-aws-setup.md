# Runbook — Terraform AWS infrastructure

Codified version of the existing AWS setup (see also
[`aws-networking-setup.md`](aws-networking-setup.md),
[`aws-cloudfront-s3-setup.md`](aws-cloudfront-s3-setup.md),
[`aws-ecr-setup.md`](aws-ecr-setup.md)) — but applied via Terraform/OpenTofu
instead of clicking through the console.

Delivered in [#102](https://github.com/dmitry-malykhin/handmade-jewelry-store/issues/102).
Closes the same scope as `infra/aws/setup-*.sh` but reproducibly.

## When to choose this path

- Greenfield AWS account — you want infra-as-code from day one.
- Disaster recovery rehearsal — `tofu destroy` + `tofu apply` to validate.
- Adding a second environment (staging) — copy tfvars, change names.

If you already have AWS infra running from the bash-script path, *do not*
import it into Terraform unless you're ready to run `tofu import` for
every resource manually. The two paths are mutually exclusive per account
on the same naming scheme.

## Prerequisites

- AWS account with Administrator-level credentials in your shell
  (`aws sts get-caller-identity` should succeed).
- OpenTofu 1.5+ or Terraform 1.5+:
  ```bash
  brew install opentofu
  ```
- jq, optionally — useful for reading `tofu output -json`.

## One-time bootstrap

Terraform's backend (the place where it stores state) lives in S3 with a
DynamoDB lock table — but those have to exist *before* you run
`tofu init`. So bootstrap them out-of-band:

```bash
export AWS_REGION=us-east-1
aws s3api create-bucket --bucket handmade-jewelry-store-tfstate --region "$AWS_REGION"
aws s3api put-bucket-versioning --bucket handmade-jewelry-store-tfstate \
  --versioning-configuration Status=Enabled
aws s3api put-bucket-encryption --bucket handmade-jewelry-store-tfstate \
  --server-side-encryption-configuration \
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
aws dynamodb create-table \
  --table-name handmade-jewelry-store-tflock \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST --region "$AWS_REGION"
```

Then uncomment the `backend "s3"` block in
[`infrastructure/backend.tf`](../../infrastructure/backend.tf) and run
`tofu init -reconfigure`.

## First apply (no DNS, no alarms)

The recommended sequence is **two passes** — bring the stack up without
DNS/alarms first, validate end-to-end, then layer them on.

```bash
cd infrastructure/
cp terraform.tfvars.example terraform.tfvars
```

Leave `domain_name = ""` and `alarm_email = ""` in `terraform.tfvars` on
this first pass. Apply:

```bash
tofu init                       # ~30s, downloads providers
tofu plan -out=tf.plan          # review the diff
tofu apply tf.plan              # ~10–15 min — RDS is the slow one
```

When it finishes:

```bash
tofu output
# Save these into your password manager / `.env.prod`:
#   - alb_dns_name
#   - rds_endpoint
#   - ecr_repository_url
#   - db_credentials_secret_arn
#   - cloudfront_domain_name
```

The `github_actions_*` outputs are sensitive — save them straight into
GitHub repo Secrets (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) without
echoing them to your terminal:

```bash
tofu output -raw github_actions_access_key_id        | pbcopy   # macOS
tofu output -raw github_actions_secret_access_key    | pbcopy
```

Smoke-test the API via the ALB:

```bash
curl "http://$(tofu output -raw alb_dns_name)/api/health"
# {"status":"ok"}
```

## Second apply — add HTTPS + alarms

Edit `terraform.tfvars`:

```hcl
domain_name       = "senichka.com"
manage_dns_in_aws = true              # set false if DNS lives in Cloudflare etc.
alarm_email       = "ops@senichka.com"
```

```bash
tofu plan -out=tf.plan
# Read the plan — you should see:
#   + Route53 zone, ACM cert, validation record
#   + ALB HTTPS listener (replaces HTTP forward with HTTPS+redirect)
#   + 4 CloudWatch alarms + SNS topic + email subscription
tofu apply tf.plan
```

If `manage_dns_in_aws = true`, copy `tofu output -json route53_name_servers`
into your registrar's NS configuration. The ACM cert won't validate until
the registrar propagates the new nameservers (15–60 minutes).

If `manage_dns_in_aws = false`, the dns module is skipped — bring your own
ACM certificate by setting `acm_certificate_arn` in the compute module
inputs (requires a minor `main.tf` edit) and add DNS records manually in
your external provider.

Confirm the SNS email subscription (AWS sends a confirmation email; click
the link). Without confirmation, the alarms fire but the topic eats the
notifications.

## Deploying app updates

Once the infrastructure exists, app deploys go through the existing
GitHub Actions pipeline (see [`flyio-production-setup.md`](flyio-production-setup.md)
for the Fly.io equivalent flow; the AWS-Fargate version uses the same
build step but pushes to ECR + updates the ECS service). The Terraform
module deliberately uses `lifecycle.ignore_changes = [container_definitions, desired_count, task_definition]`
on the ECS service so deploy-time changes don't show up in the next
`tofu plan` as drift.

## Rolling back infra changes

```bash
tofu plan -destroy   # show what destroy would do
tofu destroy         # take the whole stack down

# Or selective:
tofu destroy -target=module.observability
```

RDS keeps a final snapshot (`skip_final_snapshot = false`) — destroying
the database is recoverable. Secrets Manager has a 7-day recovery window
on delete.

## Verifying Terraform changes in PRs

CI does not currently gate on `tofu plan`. Run locally before opening a PR
that touches `infrastructure/`:

```bash
cd infrastructure/
tofu fmt -recursive             # auto-format
tofu validate                   # syntax + semantic check, no AWS calls
tofu plan                       # against your actual state
```

Paste the relevant slice of `tofu plan` into the PR description so the
reviewer can see the resource diff.

## Troubleshooting

- **`Error: cannot assume role`** — your AWS credentials lack the IAM
  permissions for whatever resource Terraform is creating. Apply
  `arn:aws:iam::aws:policy/AdministratorAccess` to your IAM user
  temporarily.
- **ALB unhealthy targets** — ECS tasks fail their health checks for
  ~3 minutes after first deploy because the API container is starting.
  Wait it out; if they still fail, check CloudWatch Logs under
  `/ecs/handmade-jewelry-store/api`.
- **RDS creation takes 10+ minutes** — that's normal for the first
  apply. The task is unblocked once the DB instance is `available`.
- **`Error: A managed resource ... has not been declared`** — usually
  means you imported a resource manually in the console. Either
  `tofu import` it into state or delete it in the console and let
  Terraform recreate.
