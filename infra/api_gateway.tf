# =============================================================================
# API Gateway HTTP API Configuration
# =============================================================================

# -----------------------------------------------------------------------------
# HTTP API
# -----------------------------------------------------------------------------
resource "aws_apigatewayv2_api" "api" {
  name          = "${var.environment}-taskflow-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = ["*"]
    allow_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_headers = ["Content-Type", "Authorization", "X-Amz-Date"]
  }

  tags = {
    Name = "${var.environment}-taskflow-api"
  }
}

# -----------------------------------------------------------------------------
# Lambda Integration (AWS_PROXY, payload format version 2.0)
# -----------------------------------------------------------------------------
resource "aws_apigatewayv2_integration" "lambda" {
  api_id                 = aws_apigatewayv2_api.api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.backend.invoke_arn
  payload_format_version = "2.0"
}

# -----------------------------------------------------------------------------
# Catch-all Default Route
# -----------------------------------------------------------------------------
resource "aws_apigatewayv2_route" "default" {
  api_id    = aws_apigatewayv2_api.api.id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

# -----------------------------------------------------------------------------
# Default Stage with Auto-Deploy
# -----------------------------------------------------------------------------
resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.api.id
  name        = "$default"
  auto_deploy = true

  tags = {
    Name = "${var.environment}-taskflow-api-stage"
  }
}

# -----------------------------------------------------------------------------
# Lambda Permission for API Gateway Invoke
# -----------------------------------------------------------------------------
resource "aws_lambda_permission" "apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.backend.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.api.execution_arn}/*/*"
}
