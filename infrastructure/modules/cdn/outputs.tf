output "bucket_name" {
  value = aws_s3_bucket.product_images.id
}

output "bucket_arn" {
  value = aws_s3_bucket.product_images.arn
}

output "cloudfront_distribution_id" {
  description = "Used by the cache-invalidation step in the deploy workflow."
  value       = aws_cloudfront_distribution.product_images.id
}

output "cloudfront_domain_name" {
  description = "<distribution>.cloudfront.net. CNAME your CDN-facing domain here."
  value       = aws_cloudfront_distribution.product_images.domain_name
}
