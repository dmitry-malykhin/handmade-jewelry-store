# AWS Infrastructure

Source-controlled artifacts for provisioning the AWS networking, IAM, and database
foundation that ECS Fargate (#82) and the production deploy pipeline depend on.

## Layout

```
infra/aws/
├── README.md                       # this file
├── setup-networking.sh             # one-shot bash + AWS CLI provisioner (#76)
└── iam/
    ├── ecs-task-execution-role-trust-policy.json
    ├── ecs-task-execution-role-policy.json
    ├── ecs-task-role-trust-policy.json
    └── ecs-task-role-policy.json
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

# 2. Run the provisioner
./infra/aws/setup-networking.sh

# 3. Save the printed resource IDs (VPC, subnets, SGs, roles)
#    into your password manager / .env.prod for later use in #81 and #82.
```

Best for: re-runs in fresh AWS accounts (e.g. company sandbox → prod).

## What this **does not** do

- ❌ ECR repository (#81 — separate)
- ❌ ECS Fargate cluster + task definitions (#82 — separate)
- ❌ ALB / target groups (#82 — depends on networking + ECS)
- ❌ CloudFront + S3 product images bucket (#77 — separate runbook)
- ❌ Terraform state — Terraform migration is post-MVP (#102)

## Why bash + JSON, not Terraform?

Per [docs/12_PLAN_PERSONAL.md](../../docs/12_PLAN_PERSONAL.md) and the project
roadmap, Terraform is **post-MVP** (#102). For first-launch we use AWS Console
and CLI scripts because:

1. **Single deployer** — solo project, no team coordination needed
2. **Provider-specific** — until we add multi-cloud or multi-environment, IaC overhead exceeds value
3. **Easier debugging** — when something breaks, click around the AWS console; with Terraform you'd be reading state files
4. **Fast launch path** — bash + console is 1 hour; Terraform setup with state backend is 4–6 hours

When the store has revenue and a second engineer joins, #102 migrates these
runbooks + scripts into Terraform modules.

## Cost summary

| Resource                         | Class / Type                         | Monthly cost (us-east-1, May 2026) |
| -------------------------------- | ------------------------------------ | ---------------------------------- |
| VPC + subnets + SGs + IGW        | n/a                                  | $0                                 |
| RDS PostgreSQL                   | db.t3.micro, 20 GB gp2, 7-day backup | ~$13                               |
| Secrets Manager                  | 1 secret + light API calls           | ~$0.40                             |
| **NOT provisioned:** NAT Gateway | —                                    | **$0** (saves ~$32/mo)             |

**Baseline networking + DB:** ~$13.40/month before adding ECS/ALB.

## Production cutover prerequisites

Before running `setup-networking.sh` against production AWS:

- [ ] AWS account exists and billing is set up
- [ ] IAM user (or role) with `AdministratorAccess` for the initial bootstrap
  - Strip down to least-privilege after the first run
- [ ] AWS CLI v2 installed locally (`aws --version` → 2.x)
- [ ] `jq` installed (`brew install jq`)
- [ ] Region decision made (default: `us-east-1` — closest to US East customers, cheapest)
- [ ] Cost alerts configured in AWS Billing (set $50/month threshold initially)
