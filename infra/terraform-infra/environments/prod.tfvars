# Prod environment configuration
environment         = "prod"
vpc_cidr            = "10.2.0.0/16"
lambda_memory_size  = 1024
lambda_timeout      = 30
db_min_capacity     = 1
db_max_capacity     = 8
cloudfront_price_class = "PriceClass_200"
