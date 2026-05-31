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
