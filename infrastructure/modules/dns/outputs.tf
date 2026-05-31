output "zone_id" {
  value = aws_route53_zone.primary.zone_id
}

output "name_servers" {
  description = "Set these as the NS records on your registrar."
  value       = aws_route53_zone.primary.name_servers
}

output "api_certificate_arn" {
  description = "Pass this to the compute module so the ALB listener uses HTTPS."
  value       = aws_acm_certificate_validation.api.certificate_arn
}
