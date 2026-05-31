output "db_instance_id" {
  value = aws_db_instance.this.id
}

output "db_endpoint" {
  description = "host:port — the value Prisma's DATABASE_URL needs."
  value       = aws_db_instance.this.endpoint
}

output "db_credentials_secret_arn" {
  description = "ARN of the Secrets Manager entry holding username/password/db/host/port."
  value       = aws_secretsmanager_secret.db_credentials.arn
}
