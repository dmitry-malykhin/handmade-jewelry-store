variable "project_name" {
  type = string
}

variable "domain_name" {
  description = "Apex domain (e.g. senichka.com). Empty disables the module entirely."
  type        = string
}

variable "alb_dns_name" {
  description = "Output from the compute module. Empty allowed during initial bootstrap."
  type        = string
  default     = ""
}

variable "alb_zone_id" {
  type    = string
  default = ""
}

variable "cloudfront_domain_name" {
  type    = string
  default = ""
}
