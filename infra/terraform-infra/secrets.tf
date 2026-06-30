# AWS Secrets Manager - Application Secrets
# Stores sensitive configuration as a JSON object

resource "aws_secretsmanager_secret" "app_secrets" {
  name        = "${var.environment}-taskflow-secrets"
  description = "Application secrets for TaskFlow ${var.environment} environment"

  tags = {
    Name = "${var.environment}-taskflow-secrets"
  }
}

resource "aws_secretsmanager_secret_version" "app_secrets_version" {
  secret_id = aws_secretsmanager_secret.app_secrets.id

  secret_string = jsonencode({
    DATABASE_URL   = "placeholder"
    JWT_SECRET_KEY = "placeholder"
    DB_USERNAME    = "placeholder"
    DB_PASSWORD    = "placeholder"
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}
