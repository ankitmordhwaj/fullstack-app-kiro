variable "environment" {
  description = "Deployment environment (dev, staging, or prod)"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC. Must be non-overlapping per environment."
  type        = string
}

variable "lambda_memory_size" {
  description = "Memory allocation for the Lambda function in MB (128–3008)"
  type        = number

  validation {
    condition     = var.lambda_memory_size >= 128 && var.lambda_memory_size <= 3008
    error_message = "Lambda memory size must be between 128 and 3008 MB."
  }
}

variable "lambda_timeout" {
  description = "Timeout for the Lambda function in seconds (3–900)"
  type        = number

  validation {
    condition     = var.lambda_timeout >= 3 && var.lambda_timeout <= 900
    error_message = "Lambda timeout must be between 3 and 900 seconds."
  }
}

variable "db_min_capacity" {
  description = "Minimum ACU capacity for Aurora Serverless v2"
  type        = number
}

variable "db_max_capacity" {
  description = "Maximum ACU capacity for Aurora Serverless v2"
  type        = number
}

variable "cloudfront_price_class" {
  description = "CloudFront distribution price class (e.g., PriceClass_100, PriceClass_200)"
  type        = string
}
