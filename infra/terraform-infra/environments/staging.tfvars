# Staging environment configuration
environment         = "staging"
vpc_cidr            = "10.1.0.0/16"
lambda_memory_size  = 512
lambda_timeout      = 30
db_min_capacity     = 0.5
db_max_capacity     = 4
cloudfront_price_class = "PriceClass_100"
