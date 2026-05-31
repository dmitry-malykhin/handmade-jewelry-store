# Surface the identifiers and ARNs the deploy pipeline / runbooks need.
# `terraform output -json` is consumable by CI; `terraform output <name>`
# prints a single value.

output "aws_region" {
  value = var.aws_region
}

output "aws_account_id" {
  value = data.aws_caller_identity.current.account_id
}

# ── Networking ──────────────────────────────────────────────────────────────

output "vpc_id" {
  value = module.networking.vpc_id
}

output "public_subnet_ids" {
  value = module.networking.public_subnet_ids
}

output "private_subnet_ids" {
  value = module.networking.private_subnet_ids
}

# ── Database ────────────────────────────────────────────────────────────────

output "rds_endpoint" {
  value = module.database.db_endpoint
}

output "db_credentials_secret_arn" {
  value = module.database.db_credentials_secret_arn
}

# ── Compute ─────────────────────────────────────────────────────────────────

output "ecr_repository_url" {
  value = module.compute.ecr_repository_url
}

output "ecs_cluster_name" {
  value = module.compute.ecs_cluster_name
}

output "ecs_service_name" {
  value = module.compute.ecs_service_name
}

output "alb_dns_name" {
  value = module.compute.alb_dns_name
}

# ── CDN ─────────────────────────────────────────────────────────────────────

output "s3_bucket_name" {
  value = module.cdn.bucket_name
}

output "cloudfront_distribution_id" {
  value = module.cdn.cloudfront_distribution_id
}

output "cloudfront_domain_name" {
  value = module.cdn.cloudfront_domain_name
}

# ── DNS (optional) ──────────────────────────────────────────────────────────

output "route53_name_servers" {
  description = "Empty list when DNS is managed externally."
  value       = try(module.dns[0].name_servers, [])
}

# ── CI deploy IAM ───────────────────────────────────────────────────────────

output "github_actions_access_key_id" {
  value = module.deploy_iam.access_key_id
}

output "github_actions_secret_access_key" {
  description = "Sensitive — saved into GitHub Secrets, never logged."
  value       = module.deploy_iam.secret_access_key
  sensitive   = true
}
