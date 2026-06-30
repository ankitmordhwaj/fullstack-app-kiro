# =============================================================================
# Lambda Function and IAM Configuration
# =============================================================================

# -----------------------------------------------------------------------------
# IAM Role for Lambda Execution
# -----------------------------------------------------------------------------
resource "aws_iam_role" "lambda_exec" {
  name = "${var.environment}-taskflow-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "${var.environment}-taskflow-lambda-role"
  }
}

# -----------------------------------------------------------------------------
# IAM Policy: Secrets Manager Access (scoped to environment-specific secret)
# -----------------------------------------------------------------------------
resource "aws_iam_policy" "lambda_secrets" {
  name        = "${var.environment}-taskflow-lambda-secrets-policy"
  description = "Allow Lambda to read the environment-specific Secrets Manager secret"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = "secretsmanager:GetSecretValue"
        Resource = aws_secretsmanager_secret.app_secrets.arn
      }
    ]
  })
}

# -----------------------------------------------------------------------------
# IAM Policy: CloudWatch Logs
# -----------------------------------------------------------------------------
resource "aws_iam_policy" "lambda_logging" {
  name        = "${var.environment}-taskflow-lambda-logging-policy"
  description = "Allow Lambda to write CloudWatch Logs"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

# -----------------------------------------------------------------------------
# IAM Policy Attachments
# -----------------------------------------------------------------------------
resource "aws_iam_role_policy_attachment" "lambda_secrets" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = aws_iam_policy.lambda_secrets.arn
}

resource "aws_iam_role_policy_attachment" "lambda_logging" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = aws_iam_policy.lambda_logging.arn
}

resource "aws_iam_role_policy_attachment" "lambda_vpc_access" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

# -----------------------------------------------------------------------------
# Lambda Function
# -----------------------------------------------------------------------------
resource "aws_lambda_function" "backend" {
  function_name = "${var.environment}-taskflow-lambda"
  role          = aws_iam_role.lambda_exec.arn
  handler       = "wsgi.handler"
  runtime       = "python3.11"
  memory_size   = var.lambda_memory_size
  timeout       = var.lambda_timeout
  filename      = "placeholder.zip"

  vpc_config {
    subnet_ids         = aws_subnet.private[*].id
    security_group_ids = [aws_security_group.lambda.id]
  }

  environment {
    variables = {
      SECRETS_ARN = aws_secretsmanager_secret.app_secrets.arn
    }
  }

  lifecycle {
    ignore_changes = [filename, source_code_hash]
  }

  tags = {
    Name = "${var.environment}-taskflow-lambda"
  }
}
