# cloudwatch-alarm-add (custom)

**Effort:** low. **Impact:** medium.

## Что делает

Добавляет alarm в `infrastructure/modules/observability/`:
- Создаёт `aws_cloudwatch_metric_alarm` resource
- Прописывает SNS topic subscription (email)
- Обновляет runbook `docs/runbooks/cloudwatch-alarms.md` с описанием порога и false-positive сценариями
- Связывает с тестовой процедурой (как симулировать)

## Trigger

- User: `/cw-alarm rds-cpu-high`

## SKILL.md

````markdown
---
name: cloudwatch-alarm-add
description: Use when adding a CloudWatch alarm to the AWS production stack. Generates aws_cloudwatch_metric_alarm in infrastructure/modules/observability/, wires SNS subscription, and updates docs/runbooks/cloudwatch-alarms.md with threshold rationale, false-positive scenarios, test procedure.
---

# cloudwatch-alarm-add

## Inputs

1. **Alarm name** — kebab-case (`rds-cpu-high`, `ecs-task-count-low`).
2. **Metric** — namespace + name (e.g. `AWS/RDS / CPUUtilization`).
3. **Threshold** — value + comparison (`>= 80%`).
4. **Period** — evaluation period (default `300s` = 5 min).
5. **Evaluation periods** — how many breaches (default `2`).

## Template

```hcl
resource "aws_cloudwatch_metric_alarm" "<name>" {
  alarm_name          = "${var.environment}-<name>"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 2
  metric_name         = "<metric>"
  namespace           = "AWS/<service>"
  period              = 300
  statistic           = "Average"
  threshold           = <value>
  alarm_description   = "<description>"
  treat_missing_data  = "notBreaching"

  dimensions = {
    # e.g. DBInstanceIdentifier = aws_db_instance.main.id
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  tags = local.common_tags
}
```

## Runbook update

Append to `docs/runbooks/cloudwatch-alarms.md`:

```markdown
### <alarm-name>

**Metric:** `AWS/<service> / <metric>`
**Threshold:** `<comparison> <value>` over `<periods> × <period>s`
**Severity:** P2 (page during business hours)

**What it means.** <Description of what triggers it and why it matters.>

**False-positive scenarios.**
- Scheduled batch job at 03:00 UTC briefly spikes CPU — alarm has 2-period eval to avoid
- New deploy briefly increases connections — same eval covers

**How to test.**
```bash
# Simulate breach:
aws cloudwatch set-alarm-state \
  --alarm-name "production-<name>" \
  --state-value ALARM \
  --state-reason "manual test"
```
Email should arrive within 1 min.

**Reset:**
```bash
aws cloudwatch set-alarm-state \
  --alarm-name "production-<name>" \
  --state-value OK \
  --state-reason "test complete"
```

**Common remediation.**
- <step 1>
- <step 2>
- <link to deeper runbook if exists>
```

## Hard rules

1. **`treat_missing_data`** explicit — usually `notBreaching` for "rare event" metrics, `breaching` for "must be present" metrics
2. **`evaluation_periods >= 2`** — single breach is too noisy
3. **Both `alarm_actions` and `ok_actions`** — get recovery notification too
4. **Tag** with `common_tags` for cost tracking
5. **Update runbook synchronously** — runbook IS the documentation; alarm without runbook = on-call rage
````

## Зависимости

- `infrastructure/modules/observability/` уже существует
- `aws_sns_topic.alerts` уже создан с email subscription

## Источник

- docs/runbooks/cloudwatch-alarms.md
- infrastructure/modules/observability/
