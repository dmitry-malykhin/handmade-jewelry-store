# ecs-deploy-debug (custom)

**Effort:** medium. **Impact:** high.

## Что делает

При красном GitHub Actions deploy — параллельно тянет:
- `aws ecs describe-services` — текущее состояние сервиса
- Последний task stop reason
- CloudWatch logs за 10 минут
- Sentry issues за тот же период
- ALB target health

Выдаёт диагноз: что сломалось, на каком шаге, что попробовать.

## Trigger

- User: `/deploy-debug` после failing CI
- Auto-suggest когда юзер upload пишет про deploy failure

## SKILL.md

````markdown
---
name: ecs-deploy-debug
description: Use when an AWS ECS Fargate deploy fails or when the production service is unhealthy. Aggregates aws ecs describe-services, last task stop reason, CloudWatch logs from last 10 minutes, Sentry issues from same window, and ALB target health into a single diagnosis with proposed next steps.
---

# ecs-deploy-debug

## Inputs

1. **Service name** — default `production-api` (read from `infrastructure/main.tf`)
2. **Time window** — default last 10 minutes

## Procedure

Run these IN PARALLEL:

### 1. ECS service status

```bash
aws ecs describe-services \
  --cluster production-handmade-jewelry \
  --services <service-name> \
  --query 'services[0].{desired:desiredCount,running:runningCount,pending:pendingCount,events:events[0:5]}' \
  --output json
```

### 2. Last task stop reason

```bash
# Find last 3 stopped tasks
aws ecs list-tasks \
  --cluster production-handmade-jewelry \
  --service-name <service-name> \
  --desired-status STOPPED \
  --query 'taskArns[0:3]' \
  --output text \
  | xargs -n1 -I{} aws ecs describe-tasks --cluster production-handmade-jewelry --tasks {} \
  --query 'tasks[0].{stoppedReason,containers:containers[*].{name,exitCode,reason}}' \
  --output json
```

### 3. CloudWatch logs

```bash
END=$(date -u +%Y-%m-%dT%H:%M:%S)
START=$(date -u -v-10M +%Y-%m-%dT%H:%M:%S)

aws logs filter-log-events \
  --log-group-name /ecs/production-api \
  --start-time $(date -ud "$START" +%s)000 \
  --end-time $(date -ud "$END" +%s)000 \
  --filter-pattern 'ERROR ?error ?FATAL ?fatal' \
  --query 'events[*].[timestamp,message]' \
  --output text \
  | head -50
```

### 4. ALB target health

```bash
aws elbv2 describe-target-health \
  --target-group-arn $(terraform output -raw alb_target_group_arn) \
  --query 'TargetHealthDescriptions[*].{target:Target.Id,health:TargetHealth.State,reason:TargetHealth.Reason}'
```

### 5. Sentry (via sentry MCP if installed)

Otherwise fall back to:
```bash
gh api /repos/<org>/<repo>/issues?labels=sentry,severity:high&state=open&since=$START
```

## Diagnosis flow

1. **If desiredCount > runningCount**:
   - Check task stop reasons
   - Common: `Essential container exited`, `OutOfMemoryError`, `Health check timeout`
2. **If logs contain `ECONNREFUSED postgres`**:
   - Check `aws rds describe-db-instances`
   - Likely Security Group misconfiguration after a Terraform change
3. **If logs contain `JWT_SECRET is undefined`** or similar:
   - Check Secrets Manager / task definition env vars
4. **If `unhealthy` target on ALB**:
   - Health endpoint failing — check `/health` returns 200
5. **If CPU/Memory metric > 80%**:
   - Scaling event needed; check auto-scaling policy

## Output format

```
ECS deploy debug — production-api @ 2026-06-01 22:15:00

Service state:
  Desired: 2 | Running: 1 | Pending: 1 (DEGRADED)

Last task stop:
  Reason: Essential container "api" exited
  Exit code: 1
  Container reason: "Error: Cannot connect to database"

Recent logs (last 10 min):
  22:14:12 ERROR PrismaClientInitializationError: P1001 Can't reach database server at production-postgres.cluster-xyz.us-east-1.rds.amazonaws.com:5432

ALB targets:
  i-abc123 — unhealthy (Target.FailedHealthChecks)
  i-def456 — healthy

Sentry: 12 new issues in last 10 min, all "Database connection failed"

DIAGNOSIS:
  RDS unreachable from ECS tasks.
  Possible causes:
    1. Security Group rule removed in last Terraform apply
    2. RDS instance restarting / failed
    3. DATABASE_URL env var changed

PROPOSED NEXT STEPS:
  1. Check git log for recent infrastructure/ changes:
     git log -5 --oneline infrastructure/
  2. Verify SG: aws ec2 describe-security-groups --group-ids <ecs-sg-id>
     Look for ingress from <rds-sg-id> on 5432
  3. Verify RDS up: aws rds describe-db-instances --db-instance-identifier production-postgres
  4. If recent rollback option: gh workflow run rollback-aws-ecs.yml
```

## Trade-offs

- Aggregation requires AWS CLI access — auth needed
- Sentry MCP optional (degrades gracefully)
- Diagnosis based on pattern-matching log keywords — not always accurate, treat as starting point
````

## Зависимости

- AWS CLI configured (`AWS_PROFILE=handmade-jewelry`)
- Terraform outputs accessible
- Sentry MCP (optional)
- GitHub CLI

## Источник

- docs/runbooks/aws-ecs-deploy.md
- docs/runbooks/cloudwatch-alarms.md
