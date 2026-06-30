output "api_url" {
  description = "API Gateway invoke URL (used as VITE_API_URL for the frontend build)"
  value       = aws_apigatewayv2_api.api.api_endpoint
}

output "cloudfront_domain" {
  description = "CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.frontend.domain_name
}

output "s3_bucket_name" {
  description = "Frontend S3 bucket name for deployments"
  value       = aws_s3_bucket.frontend.id
}

output "lambda_function_name" {
  description = "Lambda function name for code updates"
  value       = aws_lambda_function.backend.function_name
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID for cache invalidation"
  value       = aws_cloudfront_distribution.frontend.id
}
