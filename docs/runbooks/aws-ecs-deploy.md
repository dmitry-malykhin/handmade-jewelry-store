# Runbook — AWS ECS Fargate deploy

Production API runs on **Fly.io** by default (cheaper, simpler, $0 idle).
This runbook covers the cutover to **AWS ECS Fargate** once revenue justifies
the operational cost — the moment described in
[`docs/12_PLAN_PERSONAL.md`](../12_PLAN_PERSONAL.md) as "after first $500/mo".

Closes [#82](https://github.com/dmitry-malykhin/handmade-jewelry-store/issues/82).

## What's already in place

| Piece                       | Where                                                      |
| --------------------------- | ---------------------------------------------------------- |
| ECS cluster / task def / service | Terraform [`infrastructure/modules/compute/`](../../infrastructure/modules/compute/) |
| ALB + target group + listeners   | same module                                              |
| Auto-scaling (CPU 70%, mem 75%)  | same module                                              |
| ECR repository                   | same module                                              |
| IAM roles (execution, task)      | same module                                              |
| GitHub Actions IAM user          | Terraform [`modules/deploy-iam/`](../../infrastructure/modules/deploy-iam/) |
| Deploy workflow              | [`.github/workflows/deploy-aws-ecs.yml`](../../.github/workflows/deploy-aws-ecs.yml) |
| CloudWatch alarms            | Terraform [`modules/observability/`](../../infrastructure/modules/observability/) |

The Dockerfile ([`apps/api/Dockerfile`](../../apps/api/Dockerfile)) is identical
to the one Fly.io uses — no changes needed.

## Prerequisites for cutover

- AWS infrastructure already applied via Terraform (see
  [`terraform-aws-setup.md`](terraform-aws-setup.md)).
- DNS plan: where will `api.<your-domain>` point? Either AWS Route53
  (`manage_dns_in_aws = true`) or your existing provider (Cloudflare, etc.)
  with a CNAME to the ALB.
- HTTPS certificate validated (ACM in us-east-1 if Route53, or BYO cert).
- Production Neon database already populated, OR plan to migrate to RDS
  (Neon → RDS dump/restore is out of scope here; for now we keep using
  Neon and ECS just talks to it).

## Step 1 — Configure GitHub Secrets

The deploy workflow needs these. Grab values from `tofu output` after
`infrastructure/` applies:

| Secret                    | Source                                                  |
| ------------------------- | ------------------------------------------------------- |
| `AWS_ACCESS_KEY_ID`       | `tofu output -raw github_actions_access_key_id`         |
| `AWS_SECRET_ACCESS_KEY`   | `tofu output -raw github_actions_secret_access_key`     |
| `AWS_REGION`              | e.g. `us-east-1`                                        |
| `AWS_ECR_REPOSITORY`      | e.g. `handmade-jewelry-store-api`                       |
| `AWS_ECS_CLUSTER`         | e.g. `handmade-jewelry-store-cluster`                   |
| `AWS_ECS_SERVICE`         | e.g. `handmade-jewelry-store-api`                       |
| `AWS_ECS_TASK_FAMILY`     | e.g. `handmade-jewelry-store-api`                       |
| `AWS_ECS_CONTAINER_NAME`  | `api`                                                   |
| `AWS_API_HEALTH_URL`      | e.g. `https://api.senichka.com/api/health`              |

Set them under repo Settings → Secrets and variables → Actions.

## Step 2 — Push the first image to ECR

The Terraform task definition references `<ecr-repo>:latest`, but the
repo is empty after the first `tofu apply`. Push an image once so the
ECS service can start its first task:

```bash
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query 'Account' --output text)
ECR_URL="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/handmade-jewelry-store-api"

aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "$ECR_URL"

docker build -f apps/api/Dockerfile -t "$ECR_URL:latest" .
docker push "$ECR_URL:latest"
```

After the push, ECS will pull the image and start the task. Watch:

```bash
aws ecs describe-services \
  --cluster handmade-jewelry-store-cluster \
  --services handmade-jewelry-store-api \
  --query 'services[0].deployments'
```

Once it reads `runningCount: 1`, hit the ALB DNS:

```bash
curl "http://$(tofu output -raw alb_dns_name)/api/health"
# {"status":"ok","info":{"database":{"status":"up"}}}
```

## Step 3 — Point DNS at the ALB

If `manage_dns_in_aws = true`: Route53 already has the `api.<domain>` A-record
(alias) pointing at the ALB — nothing to do.

If DNS is external: in your provider, create a CNAME from `api.<domain>`
to `tofu output -raw alb_dns_name`. Wait for propagation
(`dig api.<domain> +short`).

## Step 4 — Test the deploy workflow

1. Go to repo → Actions → "Deploy API to AWS ECS".
2. Click **Run workflow**, leave defaults, click the green button.
3. Watch the run. Expected stages:
   - `Login to Amazon ECR` (~5s)
   - `Build and push Docker image` (~3–4 min on a clean cache, ~45s warm)
   - `Download current task definition` (~3s)
   - `Render new task definition with image SHA` (~1s)
   - `Apply pending Prisma migrations` (~30–60s — runs in a one-off Fargate task)
   - `Deploy to ECS service` (~3–5 min — wait-for-service-stability)
   - `Smoke test` (~25s)
4. After it completes: `curl https://api.<your-domain>/api/health` →
   `{"status":"ok"}` and inspect CloudWatch Logs under
   `/ecs/handmade-jewelry-store/api` to confirm it's actually serving.

## Step 5 — Cut over from Fly.io

Once you trust the AWS deploys:

1. Update DNS so `api.<domain>` points at the ALB (if it wasn't already).
2. Wait for Fly.io traffic to drain (~5–10 min for caches).
3. Optionally `flyctl scale count 0 --app handmade-jewelry-api` to stop
   billing for Fly.io machines (the app stays defined; you can resume by
   scaling back up).
4. In `.github/workflows/deploy-aws-ecs.yml`, replace the
   `workflow_dispatch` trigger with the commented-out `push: branches: [main]`
   block. From this point every merge to `main` deploys to ECS.
5. (Optional) Delete `.github/workflows/deploy-flyio-production.yml` and the
   `Deploy API to Fly.io` Fly secrets. Keep `fly.production.toml` in the
   repo as a fallback configuration in case you ever need to flip back.

## Rolling back

The fastest rollback is to redeploy a known-good image SHA:

```bash
# 1. Find a recent good image
aws ecr describe-images \
  --repository-name handmade-jewelry-store-api \
  --query 'sort_by(imageDetails,&imagePushedAt)[-10:].imageTags' \
  --output table

# 2. Roll the service to that image (sha-<commit>)
GOOD_SHA=sha-abc123def...
aws ecs describe-task-definition \
  --task-definition handmade-jewelry-store-api \
  --query 'taskDefinition' \
  | jq '.containerDefinitions[0].image = "<ecr-url>:'"$GOOD_SHA"'"' \
  | jq 'del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy)' \
  > rollback-task-def.json

aws ecs register-task-definition --cli-input-json file://rollback-task-def.json
aws ecs update-service \
  --cluster handmade-jewelry-store-cluster \
  --service handmade-jewelry-store-api \
  --task-definition handmade-jewelry-store-api \
  --force-new-deployment
```

The auto-rollback policy on the ECS service is conservative — if a new
deploy never reaches `runningCount == desired`, the deploy fails but the
old tasks stay up. So a botched deploy doesn't take production down; it
just leaves you with the previous version still serving.

## Common failure modes

- **Image pull failures** — `ECR repository not found` usually means the
  GitHub Actions IAM user doesn't have `ecr:BatchGetImage` on the
  repository. Re-run `tofu apply` to reconcile.
- **Task stuck in `PROVISIONING`** — usually a security-group misconfig.
  Verify the ECS tasks security group allows egress to 443 (for ECR pulls)
  and 5432 (for RDS) in the right private subnets.
- **Migration task fails** — `aws logs tail /ecs/handmade-jewelry-store/api`
  shows the Prisma error. Common culprit: secret rotation broke
  `DATABASE_HOST`/`DATABASE_PASSWORD` — re-fetch the secret in
  Secrets Manager and confirm the values.
- **Health check returns 503** — the app is up but `SELECT 1` against the
  DB fails. Check RDS connectivity from the ECS task subnet, and that the
  `DATABASE_*` secrets resolve correctly.

## Cost notes

| Resource                      | Monthly |
| ----------------------------- | ------- |
| Fargate 0.25 vCPU + 0.5 GB (1 task) | ~$8 |
| ALB                           | ~$16 |
| RDS db.t3.micro               | ~$13 |
| ECR storage + data transfer   | ~$1 |
| CloudWatch logs (30d, low log volume) | ~$1 |
| **Baseline (no traffic)**     | **~$39** |

Auto-scaling kicks in at 70% CPU / 75% memory. Each extra Fargate task is
~$8/mo if running 24/7, but scale-in drops them when load falls.

Compare to Fly.io: ~$5/mo for the equivalent baseline plus free 256 MB
machines. Switching back is one workflow file edit.
