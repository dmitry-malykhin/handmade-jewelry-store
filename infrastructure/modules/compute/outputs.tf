output "ecr_repository_url" {
  description = "Push tag: <url>:sha-<commit>. The CI workflow uses this."
  value       = aws_ecr_repository.api.repository_url
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.this.name
}

output "ecs_service_name" {
  value = aws_ecs_service.api.name
}

output "task_definition_family" {
  value = aws_ecs_task_definition.api.family
}

output "alb_dns_name" {
  description = "Public DNS of the ALB. Point your domain CNAME here."
  value       = aws_lb.api.dns_name
}

output "alb_zone_id" {
  description = "Route53 zone id for the ALB — used by alias records."
  value       = aws_lb.api.zone_id
}

output "task_execution_role_arn" {
  value = aws_iam_role.task_execution.arn
}

output "task_role_arn" {
  value = aws_iam_role.task.arn
}
