# Requirements Document

## Introduction

This document specifies the requirements for deploying the TaskFlow FullStack application to AWS. The deployment infrastructure uses Terraform for infrastructure-as-code, supports three environments (dev, staging, prod), and automates builds and deployments through GitHub Actions CI/CD pipelines. The backend Flask API runs on AWS Lambda behind API Gateway, the React frontend is served from S3 via CloudFront, and the database is RDS Aurora PostgreSQL. Secrets are managed through AWS Secrets Manager.

## Glossary

- **Terraform_Module**: A set of Terraform configuration files (.tf) that define AWS infrastructure resources
- **Lambda_Function**: An AWS Lambda function that runs the Flask backend application using the aws-wsgi (awsgi) adapter
- **API_Gateway**: An AWS API Gateway HTTP API that routes HTTPS requests to the Lambda function
- **S3_Bucket**: An AWS S3 bucket configured for static website hosting of the React frontend build artifacts
- **CloudFront_Distribution**: An AWS CloudFront CDN distribution that serves the S3-hosted frontend to end users over HTTPS
- **RDS_Aurora_Cluster**: An Amazon RDS Aurora PostgreSQL Serverless v2 cluster used as the application database
- **Secrets_Manager**: AWS Secrets Manager service used to store sensitive environment variables for the Lambda function
- **VPC**: An AWS Virtual Private Cloud providing network isolation for the RDS cluster and Lambda function
- **Build_Script**: A shell script in the scripts/ directory that produces deployment-ready artifacts for backend or frontend
- **CI_CD_Pipeline**: A GitHub Actions workflow that automates building, testing, and deploying the application
- **Environment**: One of three deployment stages — dev, staging, or prod — each with isolated AWS resources
- **Tfvars_File**: A Terraform variable definitions file (.tfvars) containing non-secret configuration values for a specific environment

## Requirements

### Requirement 1: Terraform Project Structure

**User Story:** As a DevOps engineer, I want a well-organized Terraform project in the infra/ directory, so that I can manage AWS infrastructure consistently across environments.

#### Acceptance Criteria

1. THE Terraform_Module SHALL reside in an infra/ directory at the project root
2. THE Terraform_Module SHALL contain the following separate .tf files: main.tf (provider and backend configuration), variables.tf (input variable declarations), outputs.tf (output value declarations), lambda.tf (Lambda and related resources), api_gateway.tf (API Gateway resources), rds.tf (RDS Aurora resources), vpc.tf (VPC and networking resources), s3.tf (S3 bucket resources), cloudfront.tf (CloudFront distribution resources), and secrets.tf (Secrets Manager resources)
3. THE Terraform_Module SHALL include environment-specific Tfvars_File configurations named dev.tfvars, staging.tfvars, and prod.tfvars in an infra/environments/ directory, each declaring at minimum the variables: environment, vpc_cidr, lambda_memory_size, lambda_timeout, db_min_capacity, db_max_capacity, and cloudfront_price_class
4. WHEN a Tfvars_File is loaded, THE Terraform_Module SHALL use the environment variable value as a prefix in all AWS resource names and use all other variable values to parameterize resource sizing and network configuration
5. THE Terraform_Module SHALL configure an S3 backend block in main.tf specifying the bucket name, key path, AWS region, DynamoDB table name for state locking, and encryption enabled

### Requirement 2: VPC and Networking

**User Story:** As a DevOps engineer, I want a properly configured VPC with public and private subnets, so that the database is isolated from the public internet while Lambda can access it.

#### Acceptance Criteria

1. THE Terraform_Module SHALL create a VPC with a configurable CIDR block variable per Environment, with DNS support and DNS hostnames enabled
2. THE Terraform_Module SHALL create at least two private subnets across different availability zones for the RDS_Aurora_Cluster, with CIDR ranges derived from the VPC CIDR block
3. THE Terraform_Module SHALL create at least two public subnets across different availability zones and an Internet Gateway attached to the VPC to provide internet access
4. THE Terraform_Module SHALL create a NAT Gateway in one of the public subnets with an associated Elastic IP to allow private subnet resources to reach the internet
5. THE Terraform_Module SHALL create a security group for the Lambda_Function that is placed in the private subnets and allows outbound connections to the RDS_Aurora_Cluster on port 5432
6. THE Terraform_Module SHALL create a security group for the RDS_Aurora_Cluster that only accepts inbound connections from the Lambda security group on port 5432 and denies all other inbound traffic
7. THE Terraform_Module SHALL create route tables that associate public subnets with a route to the Internet Gateway (0.0.0.0/0) and private subnets with a route to the NAT Gateway (0.0.0.0/0)

### Requirement 3: RDS Aurora PostgreSQL Database

**User Story:** As a DevOps engineer, I want an Aurora PostgreSQL Serverless v2 database, so that the application has a scalable and managed database.

#### Acceptance Criteria

1. THE Terraform_Module SHALL create an RDS_Aurora_Cluster using PostgreSQL 15-compatible Aurora Serverless v2 and deploy it in private subnets spanning at least 2 Availability Zones within the VPC
2. THE RDS_Aurora_Cluster SHALL have a configurable minimum and maximum ACU (Aurora Capacity Units) per Environment, with defaults of minimum 0.5 ACU and maximum 2 ACU for dev, and minimum 1 ACU and maximum 8 ACU for prod
3. THE RDS_Aurora_Cluster SHALL use the database name, master username, and master password stored in Secrets_Manager
4. IF the Environment is prod, THEN THE RDS_Aurora_Cluster SHALL have deletion protection enabled
5. THE RDS_Aurora_Cluster SHALL have automated backups with a configurable retention period per Environment, defaulting to 7 days for dev and 30 days for prod, within a range of 1 to 35 days
6. THE RDS_Aurora_Cluster SHALL have encryption at rest enabled and SHALL be associated with a Security Group that allows inbound TCP traffic on port 5432 only from the Lambda Security Group

### Requirement 4: AWS Secrets Manager

**User Story:** As a DevOps engineer, I want sensitive configuration stored in AWS Secrets Manager, so that secrets are not exposed in Terraform state or source code.

#### Acceptance Criteria

1. THE Terraform_Module SHALL create a Secrets_Manager secret containing a JSON object with keys for DATABASE_URL, JWT_SECRET_KEY, database master username, and database master password
2. WHEN the Lambda_Function cold starts, THE Lambda_Function SHALL retrieve all secret values from Secrets_Manager and set them as application environment variables before handling any requests
3. THE Secrets_Manager secret SHALL be named using the format {environment}-taskflow-secrets where {environment} is the Environment name (dev, staging, or prod)
4. IF the Secrets_Manager secret is unavailable or any required key is missing from the secret JSON, THEN THE Lambda_Function SHALL fail to start and log an error message to CloudWatch Logs indicating which secret or key could not be retrieved
5. THE Terraform_Module SHALL mark the Secrets_Manager secret value with lifecycle ignore_changes so that secret values managed outside Terraform are not overwritten on subsequent applies

### Requirement 5: Lambda Function Deployment

**User Story:** As a DevOps engineer, I want the Flask backend deployed as a Lambda function, so that the application runs serverlessly with automatic scaling.

#### Acceptance Criteria

1. THE Terraform_Module SHALL create a Lambda_Function with Python 3.11 runtime
2. THE Lambda_Function SHALL use backend/wsgi.handler as the entry point
3. THE Lambda_Function SHALL be deployed inside the VPC with access to the private subnets where the RDS_Aurora_Cluster resides
4. THE Lambda_Function SHALL have an IAM role with permissions to read from Secrets_Manager and write to CloudWatch Logs
5. THE Lambda_Function SHALL have configurable memory size and timeout per Environment via the Tfvars_File, with defaults of 512 MB memory and 30 seconds timeout
6. WHILE Environment is set to "development" in the Tfvars_File, THE Lambda_Function SHALL have CORS headers configured to allow all origins, and WHILE Environment is set to "production", THE Lambda_Function SHALL restrict allowed origins to the value specified in the Tfvars_File
7. THE Terraform_Module SHALL configure a Security_Group for the Lambda_Function that allows outbound traffic to the RDS_Aurora_Cluster Security_Group on port 5432 and to the Secrets_Manager VPC endpoint
8. THE Terraform_Module SHALL pass DATABASE_URL and JWT_SECRET_KEY as environment variables to the Lambda_Function, with values sourced from Secrets_Manager

### Requirement 6: API Gateway Configuration

**User Story:** As a DevOps engineer, I want an API Gateway HTTP API routing requests to Lambda, so that the backend is accessible over HTTPS.

#### Acceptance Criteria

1. THE Terraform_Module SHALL create an API_Gateway HTTP API integrated with the Lambda_Function using an AWS_PROXY integration with payload format version 2.0
2. THE API_Gateway SHALL route all HTTP methods and paths to the Lambda_Function using a catch-all route key (`$default`) with a single proxy integration
3. THE API_Gateway SHALL configure CORS to allow all origins (`*`), the HTTP methods GET, POST, PUT, DELETE, and OPTIONS, and the headers Content-Type, Authorization, and X-Amz-Date
4. THE API_Gateway SHALL have a default stage (`$default`) with auto-deploy enabled
5. THE API_Gateway SHALL output the invoke URL as a Terraform output named `api_url` for use by the frontend build as the `VITE_API_URL` value
6. THE Terraform_Module SHALL create a Lambda permission resource granting the API_Gateway service principal (`apigateway.amazonaws.com`) invoke access to the Lambda_Function

### Requirement 7: S3 and CloudFront for Frontend

**User Story:** As a DevOps engineer, I want the React frontend served from S3 via CloudFront, so that users get fast, globally cached access to the application.

#### Acceptance Criteria

1. THE Terraform_Module SHALL create an S3_Bucket configured for static website hosting of the frontend build artifacts
2. THE S3_Bucket SHALL block all public access and only allow access through the CloudFront_Distribution using an Origin Access Control
3. THE Terraform_Module SHALL create a CloudFront_Distribution with the S3_Bucket as its origin and with the default root object set to index.html
4. THE CloudFront_Distribution SHALL serve the frontend over HTTPS by redirecting HTTP requests to HTTPS using the default CloudFront certificate
5. THE CloudFront_Distribution SHALL return index.html with an HTTP 200 response code for all 403 and 404 error responses to support client-side routing
6. THE CloudFront_Distribution SHALL have a configurable price class per Environment via the Tfvars_File
7. THE Terraform_Module SHALL output the CloudFront_Distribution domain name as a Terraform output

### Requirement 8: Build Scripts

**User Story:** As a developer, I want build scripts that produce deployment artifacts, so that I can reliably build the backend and frontend for AWS deployment.

#### Acceptance Criteria

1. THE Build_Script for the backend SHALL install Python dependencies from backend/requirements.txt into a temporary directory and package the backend application code together with installed dependencies into a ZIP file that contains the Lambda handler module (wsgi.py) at the package root
2. THE Build_Script for the frontend SHALL install Node.js dependencies, set the VITE_API_URL environment variable, and produce a production build in the frontend/dist/ directory
3. THE Build_Script files SHALL reside in a scripts/ directory at the project root
4. THE Build_Script for the backend SHALL include all Python source files from the backend/ directory (app.py, config.py, extensions.py, wsgi.py, models/, routes/) and all installed runtime dependencies in the deployment ZIP, excluding test files and the tests/ directory
5. THE Build_Script files SHALL be executable shell scripts using a #!/bin/bash shebang, and SHALL exit with a non-zero status code if any command within the script fails
6. IF a dependency installation or build command fails during script execution, THEN THE Build_Script SHALL terminate immediately and exit with a non-zero status code indicating the failure

### Requirement 9: CI/CD Pipeline

**User Story:** As a DevOps engineer, I want a GitHub Actions pipeline that automates build, test, and deploy, so that code changes are automatically deployed to the correct environment.

#### Acceptance Criteria

1. THE CI_CD_Pipeline SHALL trigger on push events to the main branch and on pull request events targeting the main branch
2. THE CI_CD_Pipeline SHALL run backend tests using pytest before deployment, and IF any test fails, THEN THE CI_CD_Pipeline SHALL halt the workflow and report the failure without proceeding to build or deploy steps
3. THE CI_CD_Pipeline SHALL run frontend tests using vitest before deployment, and IF any test fails, THEN THE CI_CD_Pipeline SHALL halt the workflow and report the failure without proceeding to build or deploy steps
4. THE CI_CD_Pipeline SHALL execute the build step for backend (packaging the Flask application and its dependencies into a deployment zip) and frontend (running the Vite production build to produce static assets) to produce deployment artifacts
5. THE CI_CD_Pipeline SHALL deploy infrastructure changes using Terraform apply for the target Environment
6. THE CI_CD_Pipeline SHALL upload the frontend build artifacts to the S3_Bucket
7. THE CI_CD_Pipeline SHALL invalidate the CloudFront_Distribution cache after frontend deployment
8. THE CI_CD_Pipeline SHALL update the Lambda_Function code with the new backend deployment package
9. THE CI_CD_Pipeline SHALL use GitHub environment secrets for AWS credentials and sensitive Terraform variables
10. WHEN a push event occurs on the main branch, THE CI_CD_Pipeline SHALL automatically deploy to the dev Environment after all tests pass and builds succeed
11. WHEN a deployment to the staging or prod Environment is requested, THE CI_CD_Pipeline SHALL require manual approval via a GitHub Actions environment protection rule before executing deploy steps
12. WHEN the pipeline is triggered by a pull request event, THE CI_CD_Pipeline SHALL run tests and build steps only and SHALL NOT execute any deployment steps
13. IF a Terraform apply or deployment step fails, THEN THE CI_CD_Pipeline SHALL halt the workflow, report the failing step, and SHALL NOT proceed with subsequent deployment steps

### Requirement 10: Environment Isolation

**User Story:** As a DevOps engineer, I want each environment to have isolated resources, so that changes in one environment do not affect another.

#### Acceptance Criteria

1. THE Terraform_Module SHALL prefix all AWS resource names with the Environment name followed by a hyphen separator (e.g., "dev-", "staging-", "prod-") to produce unique resource identifiers per Environment
2. THE Terraform_Module SHALL store each Environment's Terraform state file in the S3 backend under a key path that includes the Environment name as a path segment (e.g., "env-name/terraform.tfstate"), ensuring no two Environments share the same state file
3. THE Tfvars_File for each Environment SHALL define environment-specific values for VPC CIDR, Lambda memory (minimum 128 MB, maximum 3008 MB), Lambda timeout (minimum 3 seconds, maximum 900 seconds), database minimum and maximum ACU, and CloudFront price class
4. THE Terraform_Module SHALL use separate state configurations per Environment rather than Terraform workspaces, with each Environment selecting its own backend key and Tfvars_File, to prevent cross-environment resource conflicts
5. THE Terraform_Module SHALL scope IAM roles and resource policies per Environment so that a Lambda_Function in one Environment cannot access Secrets_Manager secrets or RDS_Aurora_Cluster instances belonging to another Environment
6. THE Tfvars_File for each Environment SHALL define non-overlapping VPC CIDR blocks across dev, staging, and prod Environments
