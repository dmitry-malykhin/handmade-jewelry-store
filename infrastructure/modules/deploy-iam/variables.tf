variable "project_name" {
  type = string
}

variable "ecr_repository_arn" {
  type = string
}

variable "ecs_cluster_arn" {
  type = string
}

variable "ecs_service_name" {
  type = string
}

variable "task_definition_family" {
  type = string
}

variable "task_execution_role_arn" {
  type = string
}

variable "task_role_arn" {
  type = string
}
