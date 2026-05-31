# RDS PostgreSQL + private subnet group + master credentials in Secrets
# Manager. Single-AZ on purpose — multi-AZ doubles cost (~$13/mo → ~$26/mo)
# and pre-launch we accept the recovery time of a failover-by-restore.

resource "random_password" "db_master" {
  length  = 25
  special = false
}

resource "aws_db_subnet_group" "this" {
  name        = "${var.project_name}-db-subnet-group"
  description = "Private subnets for ${var.project_name} RDS"
  subnet_ids  = var.private_subnet_ids

  tags = {
    Name = "${var.project_name}-db-subnet-group"
  }
}

resource "aws_db_instance" "this" {
  identifier            = "${var.project_name}-db"
  engine                = "postgres"
  engine_version        = "16.4"
  instance_class        = var.instance_class
  allocated_storage     = var.allocated_storage_gb
  max_allocated_storage = var.allocated_storage_gb * 5 # autoscale ceiling

  db_name  = var.db_name
  username = var.username
  password = random_password.db_master.result

  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [var.rds_security_group_id]
  publicly_accessible    = false
  multi_az               = false
  storage_encrypted      = true

  backup_retention_period   = 7
  skip_final_snapshot       = false
  final_snapshot_identifier = "${var.project_name}-db-final-${formatdate("YYYYMMDDhhmmss", timestamp())}"

  # Apply destructive parameter changes during the next maintenance window
  # — never during a `terraform apply`.
  apply_immediately = false

  # Ignore the auto-rotated final-snapshot-identifier timestamp so we don't
  # diff every plan run.
  lifecycle {
    ignore_changes = [final_snapshot_identifier]
  }

  tags = {
    Name = "${var.project_name}-db"
  }
}

resource "aws_secretsmanager_secret" "db_credentials" {
  name        = "${var.project_name}/db-credentials"
  description = "RDS PostgreSQL master credentials for ${var.project_name}"

  tags = {
    Name = "${var.project_name}-db-credentials"
  }
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username = var.username
    password = random_password.db_master.result
    db       = var.db_name
    host     = aws_db_instance.this.address
    port     = aws_db_instance.this.port
  })
}
