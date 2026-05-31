variable "project_name" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "public_subnet_ids" {
  type = list(string)
}

variable "private_subnet_ids" {
  type = list(string)
}

variable "alb_security_group_id" {
  type = string
}

variable "ecs_security_group_id" {
  type = string
}

variable "container_port" {
  type = number
}

variable "task_cpu" {
  type = string
}

variable "task_memory" {
  type = string
}

variable "desired_count" {
  type = number
}

variable "domain_name" {
  description = "Apex domain (used to provision ACM certificate). '' disables HTTPS — only HTTP listener is created."
  type        = string
}

variable "acm_certificate_arn" {
  description = "Pre-issued ACM cert ARN (validated externally). Leave '' to let Terraform create + validate via DNS."
  type        = string
  default     = ""
}

variable "db_credentials_secret_arn" {
  description = "Secrets Manager ARN piped into the container as DATABASE_* env vars."
  type        = string
}
