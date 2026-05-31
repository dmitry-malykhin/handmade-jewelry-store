# Route53 hosted zone + ACM certificate. Only created when the caller manages
# DNS in AWS — set `manage_dns_in_aws = false` at the root level to skip the
# whole module (the conditional happens in the root via `count`).

terraform {
  required_providers {
    aws = {
      source                = "hashicorp/aws"
      configuration_aliases = [aws.us_east_1]
    }
  }
}

resource "aws_route53_zone" "primary" {
  name = var.domain_name

  tags = {
    Name = "${var.project_name}-zone"
  }
}

# ────────────────────────────────────────────────────────────────────────────
# ACM cert for the API subdomain (api.<domain>). Lives in the primary region.
# Validated via DNS — Terraform creates the validation CNAME automatically.
# ────────────────────────────────────────────────────────────────────────────

resource "aws_acm_certificate" "api" {
  domain_name       = "api.${var.domain_name}"
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "api_cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.api.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  zone_id         = aws_route53_zone.primary.zone_id
  name            = each.value.name
  type            = each.value.type
  records         = [each.value.record]
  ttl             = 60
  allow_overwrite = true
}

resource "aws_acm_certificate_validation" "api" {
  certificate_arn         = aws_acm_certificate.api.arn
  validation_record_fqdns = [for record in aws_route53_record.api_cert_validation : record.fqdn]
}

# A record pointing api.<domain> at the ALB. Skipped while the ALB DNS isn't
# wired yet (initial bootstrap pass).
resource "aws_route53_record" "api" {
  count   = var.alb_dns_name != "" ? 1 : 0
  zone_id = aws_route53_zone.primary.zone_id
  name    = "api.${var.domain_name}"
  type    = "A"

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}

# Optional CNAME pointing cdn.<domain> at CloudFront. Skipped when no
# distribution exists yet.
resource "aws_route53_record" "cdn" {
  count   = var.cloudfront_domain_name != "" ? 1 : 0
  zone_id = aws_route53_zone.primary.zone_id
  name    = "cdn.${var.domain_name}"
  type    = "CNAME"
  ttl     = 300
  records = [var.cloudfront_domain_name]
}
