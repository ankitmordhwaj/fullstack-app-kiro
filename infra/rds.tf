# =============================================================================
# RDS Aurora PostgreSQL Serverless v2
# =============================================================================

# -----------------------------------------------------------------------------
# Random Password for Master User (avoids plaintext in tfvars)
# -----------------------------------------------------------------------------
resource "random_password" "db_master_password" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# -----------------------------------------------------------------------------
# DB Subnet Group (private subnets across 2 AZs)
# -----------------------------------------------------------------------------
resource "aws_db_subnet_group" "main" {
  name       = "${var.environment}-taskflow-db-subnet-group"
  subnet_ids = aws_subnet.private[*].id

  tags = {
    Name = "${var.environment}-taskflow-db-subnet-group"
  }
}

# -----------------------------------------------------------------------------
# Aurora PostgreSQL Serverless v2 Cluster
# -----------------------------------------------------------------------------
resource "aws_rds_cluster" "main" {
  cluster_identifier = "${var.environment}-taskflow-aurora-cluster"
  engine             = "aurora-postgresql"
  engine_mode        = "provisioned"
  engine_version     = "15.4"

  database_name   = "taskflow"
  master_username = "taskflow_admin"
  master_password = random_password.db_master_password.result

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  storage_encrypted   = true
  deletion_protection = var.environment == "prod" ? true : false

  backup_retention_period = var.environment == "prod" ? 30 : 7

  skip_final_snapshot       = var.environment != "prod"
  final_snapshot_identifier = var.environment == "prod" ? "${var.environment}-taskflow-final-snapshot" : null

  serverlessv2_scaling_configuration {
    min_capacity = var.db_min_capacity
    max_capacity = var.db_max_capacity
  }

  tags = {
    Name        = "${var.environment}-taskflow-aurora-cluster"
    Environment = var.environment
  }
}

# -----------------------------------------------------------------------------
# Aurora Serverless v2 Instance
# -----------------------------------------------------------------------------
resource "aws_rds_cluster_instance" "main" {
  identifier         = "${var.environment}-taskflow-aurora-instance-1"
  cluster_identifier = aws_rds_cluster.main.id
  instance_class     = "db.serverless"
  engine             = aws_rds_cluster.main.engine
  engine_version     = aws_rds_cluster.main.engine_version

  db_subnet_group_name = aws_db_subnet_group.main.name

  tags = {
    Name        = "${var.environment}-taskflow-aurora-instance-1"
    Environment = var.environment
  }
}
