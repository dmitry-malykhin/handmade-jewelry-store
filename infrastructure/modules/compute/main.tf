# ────────────────────────────────────────────────────────────────────────────
# ECR repository for the NestJS API container image. Lifecycle policy
# matches infra/aws/ecr/lifecycle-policy.json — keep 30 SHA-tagged images,
# expire untagged after 7 days.
# ────────────────────────────────────────────────────────────────────────────

resource "aws_ecr_repository" "api" {
  name                 = "${var.project_name}-api"
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }
}

resource "aws_ecr_lifecycle_policy" "api" {
  repository = aws_ecr_repository.api.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 30 SHA-tagged images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["sha-"]
          countType     = "imageCountMoreThan"
          countNumber   = 30
        }
        action = { type = "expire" }
      },
      {
        rulePriority = 2
        description  = "Expire untagged images after 7 days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 7
        }
        action = { type = "expire" }
      },
    ]
  })
}

# ────────────────────────────────────────────────────────────────────────────
# IAM roles for ECS tasks. Two roles per the AWS best practice:
#   - execution-role: ECR pull, log writes, secret fetch at task startup
#   - task-role: app-level S3 + Secrets Manager access at runtime
# ────────────────────────────────────────────────────────────────────────────

data "aws_iam_policy_document" "ecs_assume_role" {
  statement {
    sid     = "EcsTasksAssumeRole"
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "task_execution" {
  name               = "${var.project_name}-ecs-task-execution-role"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume_role.json
}

resource "aws_iam_role_policy" "task_execution" {
  name = "${var.project_name}-ecs-task-execution-role-policy"
  role = aws_iam_role.task_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "EcrAuthAndPull"
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
        ]
        Resource = "*"
      },
      {
        Sid      = "CloudWatchLogsWrite"
        Effect   = "Allow"
        Action   = ["logs:CreateLogStream", "logs:PutLogEvents", "logs:CreateLogGroup"]
        Resource = "arn:aws:logs:*:*:log-group:/ecs/${var.project_name}/*"
      },
      {
        Sid      = "SecretsManagerReadForBootstrap"
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = ["arn:aws:secretsmanager:*:*:secret:${var.project_name}/*"]
      },
    ]
  })
}

resource "aws_iam_role" "task" {
  name               = "${var.project_name}-ecs-task-role"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume_role.json
}

resource "aws_iam_role_policy" "task" {
  name = "${var.project_name}-ecs-task-role-policy"
  role = aws_iam_role.task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "S3ProductImagesReadWrite"
        Effect = "Allow"
        Action = ["s3:PutObject", "s3:GetObject", "s3:DeleteObject", "s3:ListBucket"]
        Resource = [
          "arn:aws:s3:::${var.project_name}-product-images",
          "arn:aws:s3:::${var.project_name}-product-images/*",
        ]
      },
      {
        Sid      = "SecretsManagerReadAppSecrets"
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = ["arn:aws:secretsmanager:*:*:secret:${var.project_name}/*"]
      },
    ]
  })
}

# ────────────────────────────────────────────────────────────────────────────
# CloudWatch log group + ECS cluster + Fargate task definition + service.
# ────────────────────────────────────────────────────────────────────────────

resource "aws_cloudwatch_log_group" "api" {
  name              = "/ecs/${var.project_name}/api"
  retention_in_days = 30
}

resource "aws_ecs_cluster" "this" {
  name = "${var.project_name}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# Capacity providers — FARGATE for steady-state, FARGATE_SPOT for cheaper
# burst when we add background workers.
resource "aws_ecs_cluster_capacity_providers" "this" {
  cluster_name       = aws_ecs_cluster.this.name
  capacity_providers = ["FARGATE", "FARGATE_SPOT"]

  default_capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = 1
    base              = 1
  }
}

resource "aws_ecs_task_definition" "api" {
  family                   = "${var.project_name}-api"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.task_cpu
  memory                   = var.task_memory
  execution_role_arn       = aws_iam_role.task_execution.arn
  task_role_arn            = aws_iam_role.task.arn

  container_definitions = jsonencode([
    {
      name      = "api"
      image     = "${aws_ecr_repository.api.repository_url}:latest"
      essential = true

      portMappings = [
        {
          containerPort = var.container_port
          hostPort      = var.container_port
          protocol      = "tcp"
        },
      ]

      environment = [
        { name = "NODE_ENV", value = "production" },
        { name = "API_PORT", value = tostring(var.container_port) },
      ]

      # Database creds resolved from Secrets Manager at task startup — the
      # secret is a JSON blob, jsonField pulls the individual keys.
      secrets = [
        { name = "DATABASE_USERNAME", valueFrom = "${var.db_credentials_secret_arn}:username::" },
        { name = "DATABASE_PASSWORD", valueFrom = "${var.db_credentials_secret_arn}:password::" },
        { name = "DATABASE_HOST", valueFrom = "${var.db_credentials_secret_arn}:host::" },
        { name = "DATABASE_PORT", valueFrom = "${var.db_credentials_secret_arn}:port::" },
        { name = "DATABASE_NAME", valueFrom = "${var.db_credentials_secret_arn}:db::" },
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.api.name
          awslogs-region        = data.aws_region.current.name
          awslogs-stream-prefix = "api"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "wget -q --spider http://localhost:${var.container_port}/api/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 30
      }
    },
  ])

  # The container image SHA changes on every deploy via the CI pipeline.
  # We don't want Terraform to revert it on the next `apply`.
  lifecycle {
    ignore_changes = [container_definitions]
  }
}

data "aws_region" "current" {}

# ────────────────────────────────────────────────────────────────────────────
# ALB + target group + listeners. ACM certificate is provisioned when the
# caller passes a domain name and elects not to bring their own cert.
# ────────────────────────────────────────────────────────────────────────────

resource "aws_lb" "api" {
  name               = "${var.project_name}-alb"
  load_balancer_type = "application"
  security_groups    = [var.alb_security_group_id]
  subnets            = var.public_subnet_ids
  idle_timeout       = 60

  tags = {
    Name = "${var.project_name}-alb"
  }
}

resource "aws_lb_target_group" "api" {
  name        = "${var.project_name}-api-tg"
  port        = var.container_port
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    path                = "/api/health"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
    matcher             = "200"
  }

  deregistration_delay = 30
}

# HTTP listener — always present. When HTTPS is configured it redirects;
# when there's no domain it serves traffic directly.
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.api.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = var.acm_certificate_arn != "" || var.domain_name != "" ? "redirect" : "forward"

    dynamic "redirect" {
      for_each = (var.acm_certificate_arn != "" || var.domain_name != "") ? [1] : []
      content {
        port        = "443"
        protocol    = "HTTPS"
        status_code = "HTTP_301"
      }
    }

    dynamic "forward" {
      for_each = (var.acm_certificate_arn == "" && var.domain_name == "") ? [1] : []
      content {
        target_group {
          arn = aws_lb_target_group.api.arn
        }
      }
    }
  }
}

# HTTPS listener — only when an ACM cert is in play.
resource "aws_lb_listener" "https" {
  count             = var.acm_certificate_arn != "" ? 1 : 0
  load_balancer_arn = aws_lb.api.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.acm_certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }
}

# ────────────────────────────────────────────────────────────────────────────
# Fargate service. wired to ALB target group; tasks live in private subnets.
# Rolling deploys via the default deployment controller — health checks must
# pass before old tasks are drained.
# ────────────────────────────────────────────────────────────────────────────

resource "aws_ecs_service" "api" {
  name            = "${var.project_name}-api"
  cluster         = aws_ecs_cluster.this.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [var.ecs_security_group_id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = var.container_port
  }

  deployment_minimum_healthy_percent = 50
  deployment_maximum_percent         = 200
  health_check_grace_period_seconds  = 60

  # CI flips the desired count on deploy via aws cli — let it own this.
  lifecycle {
    ignore_changes = [desired_count, task_definition]
  }

  depends_on = [aws_lb_listener.http]
}

# ────────────────────────────────────────────────────────────────────────────
# Auto-scaling. Issue #82 — "scale out when CPU > 70%". Target tracking
# is the simpler model: AWS computes the math, we just declare the target.
# Scales between `desired_count` (floor) and `max_capacity` (ceiling).
# ────────────────────────────────────────────────────────────────────────────

resource "aws_appautoscaling_target" "ecs_api" {
  service_namespace  = "ecs"
  resource_id        = "service/${aws_ecs_cluster.this.name}/${aws_ecs_service.api.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  min_capacity       = var.desired_count
  max_capacity       = var.autoscale_max_capacity
}

resource "aws_appautoscaling_policy" "ecs_cpu_target_tracking" {
  name               = "${var.project_name}-cpu-target-tracking"
  policy_type        = "TargetTrackingScaling"
  service_namespace  = aws_appautoscaling_target.ecs_api.service_namespace
  resource_id        = aws_appautoscaling_target.ecs_api.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_api.scalable_dimension

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }

    target_value       = var.autoscale_cpu_target_percent
    scale_in_cooldown  = 300 # wait 5 min before removing a task — avoids flap
    scale_out_cooldown = 60  # add tasks aggressively when load spikes
  }
}

# A second target-tracking policy on memory. Either metric crossing target
# triggers scale-out; both must stay below to scale in.
resource "aws_appautoscaling_policy" "ecs_memory_target_tracking" {
  name               = "${var.project_name}-memory-target-tracking"
  policy_type        = "TargetTrackingScaling"
  service_namespace  = aws_appautoscaling_target.ecs_api.service_namespace
  resource_id        = aws_appautoscaling_target.ecs_api.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_api.scalable_dimension

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }

    target_value       = var.autoscale_memory_target_percent
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}
