# Implementation Plan: AWS Deployment Infrastructure

## Overview

This plan implements the AWS deployment infrastructure for the TaskFlow FullStack application using Terraform, build scripts, and GitHub Actions CI/CD. Tasks are ordered to build foundational infrastructure first (VPC, networking), then data layer (RDS, Secrets), then compute (Lambda, API Gateway), then frontend hosting (S3, CloudFront), then build automation, and finally the CI/CD pipeline to wire everything together.

## Tasks

- [x] 1. Set up Terraform project structure and provider configuration
  - [x] 1.1 Create infra/main.tf with AWS provider and S3 backend configuration
    - Configure the `hashicorp/aws` provider
    - Configure S3 backend with bucket `taskflow-terraform-state`, key path using `var.environment`, DynamoDB table for state locking, and encryption enabled
    - _Requirements: 1.1, 1.5_
  - [x] 1.2 Create infra/variables.tf with all input variable declarations
    - Declare variables: `environment`, `vpc_cidr`, `lambda_memory_size`, `lambda_timeout`, `db_min_capacity`, `db_max_capacity`, `cloudfront_price_class`
    - Add validation rules for lambda_memory_size (128–3008), lambda_timeout (3–900), and environment (dev/staging/prod)
    - _Requirements: 1.3, 1.4, 10.3_
  - [x] 1.3 Create infra/outputs.tf with output value declarations
    - Define outputs: `api_url`, `cloudfront_domain`, `s3_bucket_name`, `lambda_function_name`
    - _Requirements: 1.2, 6.5, 7.7_
  - [x] 1.4 Create infra/environments/ directory with dev.tfvars, staging.tfvars, and prod.tfvars
    - dev.tfvars: environment="dev", vpc_cidr="10.0.0.0/16", lambda_memory_size=512, lambda_timeout=30, db_min_capacity=0.5, db_max_capacity=2, cloudfront_price_class="PriceClass_100"
    - staging.tfvars: environment="staging", vpc_cidr="10.1.0.0/16", lambda_memory_size=512, lambda_timeout=30, db_min_capacity=0.5, db_max_capacity=4, cloudfront_price_class="PriceClass_100"
    - prod.tfvars: environment="prod", vpc_cidr="10.2.0.0/16", lambda_memory_size=1024, lambda_timeout=30, db_min_capacity=1, db_max_capacity=8, cloudfront_price_class="PriceClass_200"
    - _Requirements: 1.3, 1.4, 10.3, 10.6_

- [x] 2. Implement VPC and networking resources
  - [x] 2.1 Create infra/vpc.tf with VPC, subnets, gateways, route tables, and security groups
    - Create VPC with configurable CIDR, DNS support and hostnames enabled
    - Create 2+ public subnets and 2+ private subnets across different AZs
    - Create Internet Gateway attached to VPC
    - Create NAT Gateway in a public subnet with Elastic IP
    - Create route tables: public subnets → IGW (0.0.0.0/0), private subnets → NAT GW (0.0.0.0/0)
    - Create Lambda security group allowing outbound to RDS on port 5432
    - Create RDS security group allowing inbound only from Lambda SG on port 5432
    - Prefix all resource names with `{environment}-taskflow-`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 10.1_

- [x] 3. Implement RDS Aurora PostgreSQL database
  - [x] 3.1 Create infra/rds.tf with Aurora Serverless v2 cluster and instance
    - Create DB subnet group using private subnets
    - Create Aurora PostgreSQL 15-compatible Serverless v2 cluster
    - Configure min/max ACU from variables (dev: 0.5–2, prod: 1–8)
    - Source database name, master username, and password from Secrets Manager
    - Enable deletion protection for prod environment
    - Configure automated backups (7 days dev, 30 days prod)
    - Enable encryption at rest
    - Associate with RDS security group
    - Prefix resource names with `{environment}-taskflow-`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 10.1_

- [x] 4. Implement Secrets Manager configuration
  - [x] 4.1 Create infra/secrets.tf with Secrets Manager secret and lifecycle rules
    - Create secret named `{environment}-taskflow-secrets`
    - Define JSON structure with keys: DATABASE_URL, JWT_SECRET_KEY, DB_USERNAME, DB_PASSWORD
    - Add lifecycle `ignore_changes` on secret value to prevent Terraform overwriting externally managed values
    - _Requirements: 4.1, 4.3, 4.5, 10.1_

- [x] 5. Implement Lambda function deployment
  - [x] 5.1 Create infra/lambda.tf with Lambda function, IAM role, and VPC configuration
    - Create IAM execution role with policies for Secrets Manager read, CloudWatch Logs write, and VPC networking (AWSLambdaVPCAccessExecutionRole)
    - Scope IAM role to environment-specific secrets ARN only
    - Create Lambda function with Python 3.11 runtime, handler `wsgi.handler`
    - Configure VPC placement in private subnets with Lambda security group
    - Set memory and timeout from variables
    - Pass SECRETS_ARN environment variable pointing to the Secrets Manager secret
    - Prefix resource names with `{environment}-taskflow-`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.7, 5.8, 10.1, 10.5_

- [x] 6. Implement API Gateway HTTP API
  - [x] 6.1 Create infra/api_gateway.tf with HTTP API, Lambda integration, and CORS
    - Create HTTP API with name `{environment}-taskflow-api`
    - Create AWS_PROXY integration with Lambda (payload format version 2.0)
    - Create catch-all `$default` route pointing to Lambda integration
    - Configure CORS: allow origins `*`, methods GET/POST/PUT/DELETE/OPTIONS, headers Content-Type/Authorization/X-Amz-Date
    - Create `$default` stage with auto-deploy enabled
    - Create Lambda permission granting `apigateway.amazonaws.com` invoke access
    - Output invoke URL as `api_url`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 10.1_

- [~] 7. Checkpoint - Verify core infrastructure modules
  - Ensure all Terraform files are syntactically valid using `terraform validate`. Ask the user if questions arise.

- [x] 8. Implement S3 bucket for frontend hosting
  - [x] 8.1 Create infra/s3.tf with S3 bucket, access block, and bucket policy
    - Create S3 bucket named `{environment}-taskflow-frontend`
    - Block all public access (block_public_acls, block_public_policy, ignore_public_acls, restrict_public_buckets)
    - Create bucket policy allowing CloudFront OAC access only
    - _Requirements: 7.1, 7.2, 10.1_

- [x] 9. Implement CloudFront distribution
  - [x] 9.1 Create infra/cloudfront.tf with distribution, OAC, and SPA routing
    - Create Origin Access Control for S3
    - Create CloudFront distribution with S3 origin and default root object `index.html`
    - Configure HTTPS redirect (viewer-protocol-policy: redirect-to-https)
    - Add custom error responses: 403 → index.html (200), 404 → index.html (200) for SPA routing
    - Set price class from variable
    - Output CloudFront domain name
    - _Requirements: 7.3, 7.4, 7.5, 7.6, 7.7, 10.1_

- [x] 10. Update backend wsgi.py with Secrets Manager integration
  - [x] 10.1 Enhance backend/wsgi.py with load_secrets() function
    - Add boto3 import and load_secrets() function that retrieves secrets from Secrets Manager using SECRETS_ARN environment variable
    - Set retrieved secret values as environment variables before Flask app initialization
    - Validate required keys (DATABASE_URL, JWT_SECRET_KEY) are present
    - Log errors and raise RuntimeError if secrets are unavailable or keys are missing
    - Skip secret loading when SECRETS_ARN is not set (local development)
    - _Requirements: 4.2, 4.4_

- [x] 11. Create build scripts
  - [x] 11.1 Create scripts/build_backend.sh
    - Add `#!/bin/bash` shebang with `set -euo pipefail`
    - Install Python dependencies from backend/requirements.txt into a temporary directory
    - Copy backend source files (app.py, config.py, extensions.py, wsgi.py, models/, routes/) excluding tests/ directory
    - Package everything into build/backend.zip with wsgi.py at the package root
    - Make script executable
    - _Requirements: 8.1, 8.3, 8.4, 8.5, 8.6_
  - [x] 11.2 Create scripts/build_frontend.sh
    - Add `#!/bin/bash` shebang with `set -euo pipefail`
    - Install Node.js dependencies with `npm ci`
    - Require VITE_API_URL environment variable to be set
    - Run `npm run build` (Vite production build) producing frontend/dist/
    - Make script executable
    - _Requirements: 8.2, 8.3, 8.5, 8.6_

- [~] 12. Checkpoint - Verify build scripts and Terraform modules
  - Ensure build scripts are executable and produce expected artifacts. Ensure all Terraform files pass `terraform fmt -check` and `terraform validate`. Ask the user if questions arise.

- [-] 13. Create GitHub Actions CI/CD pipeline
  - [~] 13.1 Create .github/workflows/deploy.yml with test, build, and deploy stages
    - Trigger on push to main branch and pull request events targeting main
    - Test stage: run `pytest backend/tests/` and `npm run test` (vitest --run) — fail pipeline if any test fails
    - Build stage: execute scripts/build_backend.sh and scripts/build_frontend.sh (depends on test stage)
    - Deploy stage (only on push to main, not PRs): run `terraform apply` with dev.tfvars, upload frontend to S3, update Lambda function code, invalidate CloudFront cache
    - Auto-deploy to dev environment on push to main
    - Require manual approval (GitHub environment protection rules) for staging and prod
    - Use GitHub environment secrets for AWS credentials and sensitive Terraform variables
    - Halt pipeline on any terraform apply or deployment step failure
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 9.10, 9.11, 9.12, 9.13_

- [~] 14. Final checkpoint - Ensure all modules are integrated
  - Ensure all Terraform files are valid, build scripts produce correct artifacts, and CI/CD pipeline YAML is syntactically correct. Ask the user if questions arise.

## Notes

- This feature is entirely Infrastructure-as-Code (Terraform HCL), shell scripts, and CI/CD YAML — no property-based tests apply
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation of infrastructure modules
- The enhanced wsgi.py (task 10.1) bridges the application code with the AWS infrastructure
- Build scripts must be tested manually by running them and verifying output artifacts
- Terraform validation (`terraform validate`, `terraform plan`) serves as the primary correctness check
- Resource naming convention `{environment}-taskflow-{resource-type}` ensures environment isolation

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3", "1.4"] },
    { "id": 1, "tasks": ["2.1", "4.1"] },
    { "id": 2, "tasks": ["3.1", "5.1"] },
    { "id": 3, "tasks": ["6.1", "8.1"] },
    { "id": 4, "tasks": ["9.1", "10.1"] },
    { "id": 5, "tasks": ["11.1", "11.2"] },
    { "id": 6, "tasks": ["13.1"] }
  ]
}
```
