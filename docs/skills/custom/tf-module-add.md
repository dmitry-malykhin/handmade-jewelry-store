# tf-module-add (custom)

**Effort:** medium. **Impact:** medium.

## Что делает

Скаффолд нового Terraform-модуля в `infrastructure/modules/<name>/`:
- `main.tf` — ресурсы
- `variables.tf` — входные переменные
- `outputs.tf` — экспортируемые значения
- `README.md` — описание модуля
- Wire в `infrastructure/main.tf` корневой конфиг
- Tagging convention (Environment, Service, Owner, CostCenter)
- Backend remote-state ключ

## Trigger

- User: `/tf-module elasticache` или "добавь terraform module для Redis"

## SKILL.md

````markdown
---
name: tf-module-add
description: Use when adding a new Terraform module to infrastructure/modules/. Scaffolds main.tf/variables.tf/outputs.tf/README.md, wires into root infrastructure/main.tf, applies tagging conventions (Environment, Service, Owner, CostCenter), and sets the remote-state key.
---

# tf-module-add

## Inputs

1. **Module name** — kebab-case (`elasticache`, `cloudwatch-alarms`, `s3-uploads`).
2. **Purpose** — short description.
3. **AWS resources** — list expected (e.g. `aws_elasticache_cluster`, `aws_security_group`).

## Files created

```
infrastructure/modules/<name>/
├── main.tf
├── variables.tf
├── outputs.tf
└── README.md
```

## Template — main.tf

```hcl
locals {
  common_tags = {
    Environment = var.environment
    Service     = var.service_name
    Module      = "<name>"
    Owner       = "dmitry.v.malykhin@gmail.com"
    CostCenter  = "handmade-jewelry"
    ManagedBy   = "terraform"
  }
}

# <resource block>

resource "aws_<resource> "main" {
  # ...
  tags = local.common_tags
}
```

## Template — variables.tf

```hcl
variable "environment" {
  description = "Environment (dev/staging/production)"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Must be dev, staging or production"
  }
}

variable "service_name" {
  description = "Service name for tagging"
  type        = string
  default     = "handmade-jewelry"
}

# Add module-specific variables here
```

## Template — outputs.tf

```hcl
output "<resource>_id" {
  description = "ID of the created resource"
  value       = aws_<resource>.main.id
}

output "<resource>_arn" {
  description = "ARN of the created resource"
  value       = aws_<resource>.main.arn
}
```

## Wire into root

In `infrastructure/main.tf`:

```hcl
module "<name>" {
  source = "./modules/<name>"

  environment  = var.environment
  service_name = var.service_name
  # ... other inputs
}
```

## Hard rules

1. **All resources get `common_tags`** — for cost tracking.
2. **Variables have `description`** and where applicable `validation`.
3. **Outputs have `description`**.
4. **No hardcoded values** — use variables.
5. **`README.md` must include** Inputs table and Outputs table (use `terraform-docs` format).
6. **Naming**: resources prefixed with `${var.environment}-<name>-` when ambiguous globally.

## Post-scaffold

1. Run `terraform fmt -recursive infrastructure/modules/<name>`.
2. Run `terraform validate` in `infrastructure/`.
3. Run `terraform plan` and review changes.
4. Update `docs/runbooks/terraform-aws-setup.md` with the new module.
5. **Do not apply** — user runs `terraform apply` manually.

## Источник

- docs/runbooks/terraform-aws-setup.md
- infrastructure/modules/ (existing modules as patterns)
````

## Зависимости

- Terraform 1.5+
- AWS provider 5.x
- Existing `infrastructure/` setup

## Источник

- docs/runbooks/terraform-aws-setup.md
