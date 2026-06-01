# Runbook — CloudWatch alarms

Production alerting via SNS email. Делает 7 проверок: 4 из [#89](https://github.com/dmitry-malykhin/handmade-jewelry-store/issues/89)
+ 3 extras, которые ловят typical incidents.

Закрывает #89. Код в [`infrastructure/modules/observability/`](../../infrastructure/modules/observability/).

## What's monitored

| Alarm                            | Trigger                                          | Why                                              |
| -------------------------------- | ------------------------------------------------ | ------------------------------------------------ |
| `ecs-cpu-high`                   | ECS service CPU > 80% for 5 min                  | Pods хотят больше ресурсов; auto-scaler должен скейлиться |
| `rds-storage-low`                | RDS free storage < 2 GB                          | Postgres встанет, когда диск кончится            |
| `rds-cpu-high`                   | RDS CPU > 80% for 5 min                          | Тяжёлые запросы — нужен индекс или больший инстанс |
| `alb-5xx-rate-high`              | ALB returns 5xx on > 5% requests over 2 min      | Приложение массово ошибается                     |
| `rds-connections-high` (extra)   | RDS connections > 60% of pool over 10 min        | Deploy spike или утечка соединений               |
| `ecs-running-below-desired` (extra) | running task count < desired for 2 min        | Crashloop / image pull failure / OOM kill        |
| `alb-no-healthy-hosts` (extra)   | ALB target group has 0 healthy hosts for 1 min   | Сайт effectively down                            |

Все алярмы кидают в SNS topic `<project>-alarms`. Email-подписка
конфигурируется через `alarm_email` в `terraform.tfvars`.

## Enabling alarms

Алярмы opt-in — модуль активируется только если `alarm_email` непустой:

```hcl
# infrastructure/terraform.tfvars
alarm_email = "ops@senichka.com"
```

Затем:

```bash
cd infrastructure/
tofu apply
```

После первого apply AWS отправит на указанный email confirmation link.
**Кликни на него обязательно** — без подтверждения подписка неактивна и
алярмы будут срабатывать, но письма не уходят.

```bash
# Проверить статус подписки
aws sns list-subscriptions-by-topic \
  --topic-arn $(aws sns list-topics --query 'Topics[?contains(TopicArn, `alarms`)].TopicArn' --output text)
# Должно быть SubscriptionArn != "PendingConfirmation"
```

## Testing alarms

Чтобы убедиться, что письма реально доходят — каждый алярм можно
форсированно триггернуть.

### `ecs-cpu-high`

```bash
# Опустить порог временно до 1% — алярм сработает в течение 5 мин
aws cloudwatch put-metric-alarm \
  --alarm-name handmade-jewelry-store-ecs-cpu-high \
  --threshold 1 \
  # ... остальные параметры скопировать из describe-alarms

# После получения письма — terraform apply вернёт исходный порог 80%
```

Проще способ для проверки доставки writeoutgoing — отправить уведомление
прямо в SNS:

```bash
aws sns publish \
  --topic-arn $(aws sns list-topics --query 'Topics[?contains(TopicArn, `alarms`)].TopicArn' --output text) \
  --subject "Test alarm — disregard" \
  --message "If you got this, SNS → email plumbing works."
```

### `rds-storage-low`

```bash
# Создать большую таблицу через psql, чтобы выжрать место
# (только на не-prod инстансе!)
psql "$DATABASE_URL" -c "CREATE TABLE bloat AS SELECT generate_series(1, 100000000) AS i;"
# Спустя несколько минут free storage упадёт ниже 2 GB
# После теста: DROP TABLE bloat;
```

### `alb-5xx-rate-high`

Залить трафик на несуществующий endpoint:

```bash
for i in {1..100}; do
  curl -s "https://api.<your-domain>/api/this-does-not-exist" > /dev/null
done
```

NestJS вернёт 404 (а не 5xx), поэтому алярм НЕ сработает.
Чтобы реально протестировать — временно добавь endpoint, кидающий exception
без catch, и попади на него.

### `rds-connections-high`

```bash
# Открыть кучу соединений из локального psql одновременно
for i in {1..60}; do
  psql "$DATABASE_URL" -c "SELECT pg_sleep(600)" &
done
# Спустя 10 мин среднее число подключений превысит 60% порога
# Kill: kill %1 %2 ...
```

### `ecs-running-below-desired`

Самый простой способ — масштабировать сервис в 0 на минуту:

```bash
aws ecs update-service \
  --cluster handmade-jewelry-store-cluster \
  --service handmade-jewelry-store-api \
  --desired-count 0
# Подожди 2 мин — алярм сработает
aws ecs update-service \
  --cluster handmade-jewelry-store-cluster \
  --service handmade-jewelry-store-api \
  --desired-count 1
```

### `alb-no-healthy-hosts`

То же что и выше — масштабирование в 0. Дополнительно срабатывает, если
все таски проваливают health check (например, при поломке `/api/health`).

## Tuning thresholds

Если в первые недели после launch письма приходят слишком часто (false
positives) — поправь:

| Variable                               | Default | Что регулирует                       |
| -------------------------------------- | ------- | ------------------------------------ |
| `ecs_autoscale_cpu_target_percent`     | 70      | Когда добавлять таски                |
| (in `modules/observability/main.tf`)   | 80      | Когда орать про ECS CPU              |
| (in `modules/observability/main.tf`)   | 2 GB    | Когда орать про RDS storage          |
| `rds_max_connections`                  | 85      | Базовое значение для %-расчёта       |

ECS CPU имеет два разных threshold'а потому что **автоскейл** должен
триггериться раньше **алерта**: 70% → add task, 80% → wake up admin.

## Log retention

По умолчанию ECS task logs хранятся 30 дней. Для cost-conscious деплоев
поставь меньше:

```hcl
# Через корневой `terraform.tfvars` пробрасывается в compute module.
# Сейчас переменная только в модуле compute — выставлять через main.tf
# wrapper. Default 30 дней оставлен сознательно — баг чаще проявляется
# через несколько дней после релиза.
```

7 дней даёт ~30% экономии storage в CloudWatch, но при ретроспективном
дебаге неприятно.

## Cost

| Item                          | Monthly |
| ----------------------------- | ------- |
| SNS topic + email subscription | $0 (первые 1000 уведомлений) |
| 7 CloudWatch alarms           | $0.10 × 7 = $0.70 |
| Custom metric query (5xx rate) | $0.30 |
| CloudWatch Logs storage (30d, low log volume) | ~$1 |
| **Total**                     | **~$2/month** |

## Common false positives to expect

- **`ecs-cpu-high` during deploys** — wait-for-stability запускает старые
  и новые таски одновременно, общий CPU всплескивает. Один-два письма за
  деплой — нормально.
- **`alb-no-healthy-hosts` сразу после первого `tofu apply`** — таск ещё
  стартует. Алярм затухает через 1–2 мин. Можно временно отключить на
  первый деплой через `treat_missing_data = "notBreaching"` (сейчас стоит
  `breaching` для остроты).
- **`rds-connections-high` после ECS deploy** — pgBouncer бы убрал, но у
  нас его нет. Можно добавить (Phase 2 #83 Redis runbook прозрачно
  расширяется на pgBouncer).

## Какие алярмы добавить позже

- Stripe webhook delivery failures (если >5% за 1 ч) — нужен custom metric
  через PutMetricData из webhook handler'а
- Klaviyo / Resend API quota approaching — нужны custom metrics
- ECS task OOM kill rate — через CloudWatch Logs Insights query subscription
- Lambda errors (после #103 — image resize / scheduled jobs)
