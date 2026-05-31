# S3 product-images bucket + CloudFront distribution with Origin Access
# Control. Mirrors infra/aws/setup-cloudfront-s3.sh and the per-resource
# JSON config files alongside it.

resource "aws_s3_bucket" "product_images" {
  bucket        = "${var.project_name}-product-images"
  force_destroy = false

  tags = {
    Name = "${var.project_name}-product-images"
  }
}

resource "aws_s3_bucket_public_access_block" "product_images" {
  bucket                  = aws_s3_bucket.product_images.id
  block_public_acls       = true
  block_public_policy     = false # CloudFront OAC needs a public-style bucket policy
  ignore_public_acls      = true
  restrict_public_buckets = false
}

resource "aws_s3_bucket_cors_configuration" "product_images" {
  bucket = aws_s3_bucket.product_images.id

  cors_rule {
    id              = "AllowAdminUploadsFromAppOrigins"
    allowed_headers = ["*"]
    allowed_methods = ["PUT", "POST", "GET", "HEAD"]
    allowed_origins = var.cors_origins
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "product_images" {
  bucket = aws_s3_bucket.product_images.id

  rule {
    id     = "ExpireAdminUploadsAfter1Day"
    status = "Enabled"

    filter {
      prefix = "uploads/"
    }

    expiration {
      days = 1
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 1
    }
  }

  rule {
    id     = "AbortStaleMultipartUploads"
    status = "Enabled"

    filter {
      prefix = ""
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

# CloudFront — distribution + OAC tying it to the S3 bucket.
resource "aws_cloudfront_origin_access_control" "product_images" {
  name                              = "${var.project_name}-product-images-oac"
  description                       = "OAC for ${var.project_name} product images"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "product_images" {
  enabled         = true
  is_ipv6_enabled = true
  http_version    = "http2and3"
  price_class     = "PriceClass_100"
  comment         = "${var.project_name} — product images CDN"

  origin {
    domain_name              = aws_s3_bucket.product_images.bucket_regional_domain_name
    origin_id                = "S3-${aws_s3_bucket.product_images.id}"
    origin_access_control_id = aws_cloudfront_origin_access_control.product_images.id
  }

  default_cache_behavior {
    target_origin_id       = "S3-${aws_s3_bucket.product_images.id}"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    # AWS managed "CachingOptimized" policy id — stable across regions.
    cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}

# Bucket policy must reference the distribution ARN, so it has to come last.
data "aws_iam_policy_document" "product_images_bucket_policy" {
  statement {
    sid    = "AllowCloudFrontServicePrincipalReadOnly"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.product_images.arn}/*"]

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.product_images.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "product_images" {
  bucket = aws_s3_bucket.product_images.id
  policy = data.aws_iam_policy_document.product_images_bucket_policy.json

  depends_on = [aws_s3_bucket_public_access_block.product_images]
}
