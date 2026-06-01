variable "project_name" {
  type = string
}

variable "alarm_email" {
  description = "Subscription email for SNS alarm topic. Empty disables the whole module."
  type        = string
}

variable "ecs_cluster_name" {
  type = string
}

variable "ecs_service_name" {
  type = string
}

variable "db_instance_id" {
  type = string
}

variable "alb_arn_suffix" {
  description = "ALB ARN suffix (the bit after :loadbalancer/app/) — required for ALB metrics."
  type        = string
}

variable "ecs_service_desired_count" {
  description = "Steady-state task count — used as the lower bound for the 'running < desired' alarm."
  type        = number
  default     = 1
}

variable "rds_max_connections" {
  description = "Approximate max_connections for the RDS instance class. db.t3.micro defaults to ~85. Alarm fires when 60%+ of the pool is used."
  type        = number
  default     = 85
}

variable "alb_target_group_arn_suffix" {
  description = "Target group ARN suffix — required for healthy-host-count metric."
  type        = string
}
