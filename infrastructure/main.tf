# Wires the infrastructure modules together. The order mirrors the topology:
#   networking → database → compute (uses DB secret) → cdn → dns → observability → deploy-iam
#
# DNS and observability are conditional — set `domain_name = ""` to skip
# Route53/ACM, `alarm_email = ""` to skip CloudWatch alarms.

module "networking" {
  source = "./modules/networking"

  project_name         = var.project_name
  vpc_cidr             = var.vpc_cidr
  public_subnet_cidrs  = var.public_subnet_cidrs
  private_subnet_cidrs = var.private_subnet_cidrs
  api_container_port   = var.api_container_port
}

module "database" {
  source = "./modules/database"

  project_name          = var.project_name
  private_subnet_ids    = module.networking.private_subnet_ids
  rds_security_group_id = module.networking.rds_security_group_id
  instance_class        = var.db_instance_class
  db_name               = var.db_name
  username              = var.db_username
  allocated_storage_gb  = var.db_allocated_storage_gb
}

# DNS provisioned first when it's enabled — the compute module wants an
# ACM cert ARN to pin the HTTPS listener. The ALB DNS / CloudFront flow
# back into Route53 records on the second apply.
module "dns" {
  count  = var.manage_dns_in_aws && var.domain_name != "" ? 1 : 0
  source = "./modules/dns"

  providers = {
    aws           = aws
    aws.us_east_1 = aws.us_east_1
  }

  project_name           = var.project_name
  domain_name            = var.domain_name
  alb_dns_name           = try(module.compute.alb_dns_name, "")
  alb_zone_id            = try(module.compute.alb_zone_id, "")
  cloudfront_domain_name = try(module.cdn.cloudfront_domain_name, "")
}

module "compute" {
  source = "./modules/compute"

  project_name                    = var.project_name
  vpc_id                          = module.networking.vpc_id
  public_subnet_ids               = module.networking.public_subnet_ids
  private_subnet_ids              = module.networking.private_subnet_ids
  alb_security_group_id           = module.networking.alb_security_group_id
  ecs_security_group_id           = module.networking.ecs_security_group_id
  container_port                  = var.api_container_port
  task_cpu                        = var.ecs_task_cpu
  task_memory                     = var.ecs_task_memory
  desired_count                   = var.ecs_desired_count
  autoscale_max_capacity          = var.ecs_autoscale_max_capacity
  autoscale_cpu_target_percent    = var.ecs_autoscale_cpu_target_percent
  autoscale_memory_target_percent = var.ecs_autoscale_memory_target_percent
  domain_name                     = var.domain_name
  acm_certificate_arn             = try(module.dns[0].api_certificate_arn, "")
  db_credentials_secret_arn       = module.database.db_credentials_secret_arn
}

module "cdn" {
  source = "./modules/cdn"

  project_name = var.project_name
  cors_origins = var.cors_origins
}

module "observability" {
  count  = var.alarm_email != "" ? 1 : 0
  source = "./modules/observability"

  project_name                = var.project_name
  alarm_email                 = var.alarm_email
  ecs_cluster_name            = module.compute.ecs_cluster_name
  ecs_service_name            = module.compute.ecs_service_name
  ecs_service_desired_count   = var.ecs_desired_count
  db_instance_id              = module.database.db_instance_id
  alb_arn_suffix              = module.compute.alb_arn_suffix
  alb_target_group_arn_suffix = module.compute.target_group_arn_suffix
}

module "deploy_iam" {
  source = "./modules/deploy-iam"

  project_name            = var.project_name
  ecr_repository_arn      = "arn:aws:ecr:${var.aws_region}:${data.aws_caller_identity.current.account_id}:repository/${var.project_name}-api"
  ecs_cluster_arn         = "arn:aws:ecs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:cluster/${module.compute.ecs_cluster_name}"
  ecs_service_name        = module.compute.ecs_service_name
  task_definition_family  = module.compute.task_definition_family
  task_execution_role_arn = module.compute.task_execution_role_arn
  task_role_arn           = module.compute.task_role_arn
}

data "aws_caller_identity" "current" {}
