# Requirements Document

## Introduction

This feature introduces a dual Infrastructure-as-Code (IaC) strategy for the TaskFlow application. The existing Terraform infrastructure files are relocated into a dedicated subdirectory, and a new CloudFormation-based infrastructure is created as the primary deployment mechanism. The CloudFormation templates provision all AWS resources required to run the full-stack application across three environments (dev, staging, prod), with a new GitHub Actions CI/CD workflow that deploys via CloudFormation.

## Glossary

- **CloudFormation_Stack**: An AWS CloudFormation stack that provisions and manages a collection of AWS resources as a single unit
- **Terraform_Infra**: The existing set of Terraform configuration files that define AWS infrastructure
- **TaskFlow_Application**: The full-stack web application comprising a Flask backend (Lambda), React frontend (S3/CloudFront), and PostgreSQL database (RDS Aurora)
- **VPC**: AWS Virtual Private Cloud providing network isolation for deployed resources
- **NAT_Gateway**: A Network Address Translation gateway enabling resources in private subnets to access the internet
- **API_Gateway_HTTP_API**: AWS API Gateway v2 HTTP API that routes HTTPS requests to Lambda
- **Aurora_Serverless_v2**: Amazon RDS Aurora PostgreSQL database engine using Serverless v2 capacity mode
- **Secrets_Manager**: AWS Secrets Manager service storing sensitive configuration values (DATABASE_URL, JWT_SECRET_KEY)
- **CloudFront_Distribution**: AWS CloudFront CDN that serves the React frontend from an S3 origin
- **CI_CD_Workflow**: A GitHub Actions workflow file that automates build, test, and deployment operations
- **Parameter_File**: A JSON file containing environment-specific CloudFormation parameter values
- **Nested_Stack**: A CloudFormation stack created as a resource within another (parent) stack

## Requirements

### Requirement 1: Terraform Code Relocation

**User Story:** As a DevOps engineer, I want existing Terraform files moved into a dedicated subdirectory, so that both IaC approaches coexist without conflicts in the repository.

#### Acceptance Criteria

1. WHEN the repository is restructured, THE Build_System SHALL relocate all Terraform files (main.tf, variables.tf, outputs.tf, vpc.tf, rds.tf, secrets.tf, lambda.tf, api_gateway.tf, s3.tf, cloudfront.tf) from `infra/` to `infra/terraform-infra/`
2. WHEN the repository is restructured, THE Build_System SHALL relocate the `infra/environments/` directory (dev.tfvars, staging.tfvars, prod.tfvars) to `infra/terraform-infra/environments/`
3. WHEN the relocation is complete, THE Build_System SHALL preserve all file contents as byte-for-byte identical to the originals, with no changes to file content, encoding, or line endings
4. WHEN the relocation is complete, THE `infra/` directory SHALL contain no files at its root level (including hidden files such as .terraform.lock.hcl) and SHALL contain only the `terraform-infra/` and `cloudformation-infra/` subdirectories
5. WHEN the repository is restructured, THE Build_System SHALL relocate any Terraform-generated hidden files (such as .terraform.lock.hcl) from `infra/` to `infra/terraform-infra/`, IF they exist

### Requirement 2: CloudFormation Template Structure

**User Story:** As a DevOps engineer, I want CloudFormation templates organized in a maintainable structure, so that I can manage infrastructure definitions across multiple environments.

#### Acceptance Criteria

1. THE CloudFormation_Stack SHALL be defined in templates located under `infra/cloudformation-infra/`, with a parent template file named `main.yaml` at the root of that directory
2. THE CloudFormation_Stack SHALL use the parent template (`main.yaml`) to reference five Nested_Stacks, each defined in a separate template file under `infra/cloudformation-infra/`: networking, database, compute, storage/CDN, and secrets
3. THE CloudFormation_Stack SHALL accept an `Environment` parameter constrained to allowed values of `dev`, `staging`, and `prod`, and each Nested_Stack SHALL receive this parameter for environment-specific configuration
4. WHEN an environment is specified, THE CloudFormation_Stack SHALL read environment-specific parameters from a dedicated Parameter_File located at `infra/cloudformation-infra/parameters/{environment}.json`, and a Parameter_File SHALL exist for each of the three environments (dev, staging, prod)
5. THE CloudFormation_Stack SHALL apply a consistent resource naming convention using the pattern `taskflow-{environment}-{resource-type}` for all provisioned resources that support a Name tag or name property

### Requirement 3: VPC and Network Provisioning

**User Story:** As a DevOps engineer, I want CloudFormation to provision an isolated VPC with public and private subnets, so that application components are securely segmented.

#### Acceptance Criteria

1. THE CloudFormation_Stack SHALL create a VPC with a CIDR block configurable via parameters, with DNS support and DNS hostnames enabled
2. THE CloudFormation_Stack SHALL create at least two public subnets across different Availability Zones
3. THE CloudFormation_Stack SHALL create at least two private subnets across different Availability Zones
4. THE CloudFormation_Stack SHALL create an Internet Gateway attached to the VPC for public subnet internet access
5. THE CloudFormation_Stack SHALL create a NAT_Gateway in a public subnet with an allocated Elastic IP to provide outbound internet access for resources in private subnets
6. THE CloudFormation_Stack SHALL create route tables with a default route (0.0.0.0/0) directing public subnet traffic to the Internet Gateway and private subnet traffic to the NAT_Gateway
7. THE CloudFormation_Stack SHALL tag all VPC networking resources (VPC, subnets, route tables, gateways) with the environment name and the resource naming convention `taskflow-{environment}-{resource-type}`

### Requirement 4: Security Groups

**User Story:** As a DevOps engineer, I want CloudFormation to define security groups, so that network traffic is restricted to only necessary communication paths.

#### Acceptance Criteria

1. THE CloudFormation_Stack SHALL create a security group for Lambda that allows outbound TCP traffic to the RDS security group on port 5432 and outbound TCP traffic to 0.0.0.0/0 on port 443
2. THE CloudFormation_Stack SHALL create a security group for Aurora_Serverless_v2 that allows inbound TCP traffic only from the Lambda security group on port 5432
3. THE CloudFormation_Stack SHALL define no inbound rules on the Lambda security group
4. THE CloudFormation_Stack SHALL deny all inbound traffic to Aurora_Serverless_v2 that does not originate from the Lambda security group by specifying no additional inbound rules beyond the Lambda security group reference on port 5432

### Requirement 5: RDS Aurora PostgreSQL Serverless v2

**User Story:** As a DevOps engineer, I want CloudFormation to provision an Aurora PostgreSQL Serverless v2 cluster, so that the application has a scalable managed database.

#### Acceptance Criteria

1. THE CloudFormation_Stack SHALL create an RDS Aurora PostgreSQL-compatible cluster using engine mode provisioned with Serverless v2 scaling configuration
2. THE CloudFormation_Stack SHALL create at least one Aurora DB instance associated with the cluster using the `db.serverless` instance class
3. THE CloudFormation_Stack SHALL place the Aurora cluster in private subnets using a DB subnet group
4. THE CloudFormation_Stack SHALL configure minimum and maximum ACU (Aurora Capacity Units) as parameters per environment with defaults of 0.5 minimum and 2 maximum
5. THE CloudFormation_Stack SHALL set the database master username and password via parameters (password marked as NoEcho)
6. THE CloudFormation_Stack SHALL accept a database name as a parameter with a default value of `taskflow`
7. THE CloudFormation_Stack SHALL associate the RDS security group with the Aurora cluster
8. THE CloudFormation_Stack SHALL set the PostgreSQL engine version to 15.4 (Aurora PostgreSQL compatible)
9. THE CloudFormation_Stack SHALL enable storage encryption using the default AWS-managed KMS key

### Requirement 6: AWS Secrets Manager

**User Story:** As a DevOps engineer, I want CloudFormation to create a Secrets Manager secret containing application credentials, so that Lambda can securely retrieve DATABASE_URL and JWT_SECRET_KEY at runtime.

#### Acceptance Criteria

1. THE CloudFormation_Stack SHALL create a Secrets_Manager secret named following the pattern `taskflow-{environment}-secrets` containing a JSON object with keys DATABASE_URL and JWT_SECRET_KEY
2. THE CloudFormation_Stack SHALL construct the DATABASE_URL value in the format `postgresql://{master_username}:{master_password}@{aurora_cluster_endpoint}:{port}/{database_name}` using values resolved from the Aurora cluster resource and stack parameters
3. THE CloudFormation_Stack SHALL accept the JWT_SECRET_KEY value as a parameter (NoEcho) with a minimum length of 32 characters
4. THE CloudFormation_Stack SHALL output the Secrets_Manager secret ARN for use by the Lambda function
5. THE CloudFormation_Stack SHALL encrypt the Secrets_Manager secret using the AWS-managed KMS key for Secrets Manager (aws/secretsmanager)

### Requirement 7: Lambda Function

**User Story:** As a DevOps engineer, I want CloudFormation to provision a Lambda function running the Flask backend, so that API requests are served in a serverless manner.

#### Acceptance Criteria

1. THE CloudFormation_Stack SHALL create a Lambda function with runtime Python 3.11 and handler set to `wsgi.handler`
2. THE CloudFormation_Stack SHALL configure the Lambda function to run within the private subnets of the VPC using the Lambda security group
3. THE CloudFormation_Stack SHALL set the Lambda environment variable SECRETS_ARN to the ARN of the Secrets_Manager secret
4. THE CloudFormation_Stack SHALL attach an IAM execution role granting the Lambda function permissions for secretsmanager:GetSecretValue scoped to the Secrets_Manager secret ARN, logs:CreateLogGroup, logs:CreateLogStream, and logs:PutLogEvents for CloudWatch Logs, and ec2:CreateNetworkInterface, ec2:DescribeNetworkInterfaces, and ec2:DeleteNetworkInterface for VPC networking
5. THE CloudFormation_Stack SHALL configure Lambda memory as a parameter with a default of 512 MB and allowed values between 128 MB and 3008 MB, and timeout as a parameter with a default of 30 seconds and allowed values between 3 and 900 seconds
6. THE CloudFormation_Stack SHALL reference the deployment artifact from an S3 bucket and key specified as parameters

### Requirement 8: API Gateway HTTP API

**User Story:** As a DevOps engineer, I want CloudFormation to create an HTTP API that routes all requests to the Lambda function, so that the backend is accessible over HTTPS.

#### Acceptance Criteria

1. THE CloudFormation_Stack SHALL create an API_Gateway_HTTP_API with a `$default` stage that has auto-deploy enabled
2. THE CloudFormation_Stack SHALL configure a Lambda proxy integration with payload format version 2.0 routing all HTTP methods and paths (`$default` route) to the Lambda function
3. THE CloudFormation_Stack SHALL configure CORS with AllowOrigins set to "*", AllowMethods set to all standard HTTP methods (GET, POST, PUT, DELETE, OPTIONS), and AllowHeaders set to "Content-Type, Authorization"
4. THE CloudFormation_Stack SHALL grant API Gateway permission to invoke the Lambda function via a Lambda resource-based policy (AWS::Lambda::Permission) with source ARN scoped to the specific HTTP API
5. THE CloudFormation_Stack SHALL output the API Gateway invoke URL

### Requirement 9: S3 Bucket for Frontend

**User Story:** As a DevOps engineer, I want CloudFormation to create an S3 bucket for hosting the React frontend static assets, so that CloudFront can serve them.

#### Acceptance Criteria

1. THE CloudFormation_Stack SHALL create an S3 bucket with a name following the pattern `taskflow-{environment}-frontend`
2. THE CloudFormation_Stack SHALL enable S3 Block Public Access on the bucket with all four settings active (BlockPublicAcls, IgnorePublicAcls, BlockPublicPolicy, RestrictPublicBuckets)
3. THE CloudFormation_Stack SHALL create an Origin Access Control (OAC) resource with origin type set to S3 and signing behavior set to "always", associated with the CloudFront_Distribution
4. THE CloudFormation_Stack SHALL apply a bucket policy granting s3:GetObject on all objects in the bucket (resource `arn:aws:s3:::bucket-name/*`) to the CloudFront service principal, with a condition restricting access to the specific CloudFront_Distribution ARN via the `aws:SourceArn` condition key

### Requirement 10: CloudFront Distribution

**User Story:** As a DevOps engineer, I want CloudFormation to create a CloudFront distribution serving the frontend, so that users access the application via a CDN with low latency.

#### Acceptance Criteria

1. THE CloudFormation_Stack SHALL create a CloudFront_Distribution with the S3 frontend bucket as its origin using Origin Access Control
2. THE CloudFormation_Stack SHALL set the default root object to `index.html`
3. THE CloudFormation_Stack SHALL configure custom error responses for HTTP status codes 403 and 404 that return `/index.html` with response status 200 and an error caching minimum TTL of 0 seconds, to support client-side routing
4. THE CloudFormation_Stack SHALL enable the distribution with PriceClass_100 (North America and Europe edge locations)
5. THE CloudFormation_Stack SHALL output the CloudFront distribution domain name and distribution ID
6. THE CloudFormation_Stack SHALL configure the default cache behavior with viewer protocol policy set to redirect-to-https and allowed HTTP methods restricted to GET and HEAD
7. THE CloudFormation_Stack SHALL configure the default cache behavior to use the CachingOptimized managed cache policy

### Requirement 11: CloudFormation CI/CD Workflow

**User Story:** As a DevOps engineer, I want a GitHub Actions workflow that deploys infrastructure using CloudFormation, so that deployments are automated and consistent across environments.

#### Acceptance Criteria

1. THE CI_CD_Workflow SHALL be defined in a file at `.github/workflows/deploy-cloudformation.yml`
2. WHEN a push occurs to the main branch, THE CI_CD_Workflow SHALL run backend tests (pytest), frontend tests (vitest), and build jobs, and SHALL automatically deploy to the dev environment only after all three jobs complete successfully
3. WHEN the dev deployment succeeds, THE CI_CD_Workflow SHALL require manual approval (GitHub environment protection) before deploying to staging
4. WHEN the staging deployment succeeds, THE CI_CD_Workflow SHALL require manual approval (GitHub environment protection) before deploying to prod
5. THE CI_CD_Workflow SHALL use `aws cloudformation deploy` with the template at `infra/cloudformation-infra/` (parent template) and the parameter file at `infra/cloudformation-infra/parameters/{environment}.json` for each environment, using the stack name `taskflow-{environment}`
6. THE CI_CD_Workflow SHALL upload the backend artifact (build/backend.zip) to the S3 deployment bucket specified by the CloudFormation stack output before deploying the CloudFormation stack
7. WHEN the CloudFormation stack deployment succeeds, THE CI_CD_Workflow SHALL retrieve the stack outputs (S3 frontend bucket name, CloudFront distribution ID, Lambda function name) and sync the frontend build artifacts (frontend/dist/) to the S3 frontend bucket identified by the stack output
8. WHEN the frontend sync completes, THE CI_CD_Workflow SHALL invalidate the CloudFront distribution cache using the distribution ID from the stack output with the invalidation path `/*`
9. WHEN the CloudFormation stack deployment succeeds, THE CI_CD_Workflow SHALL update the Lambda function code (identified by function name from stack output) with the backend artifact (build/backend.zip)
10. IF the `aws cloudformation deploy` command fails, THEN THE CI_CD_Workflow SHALL halt the pipeline for that environment, skip subsequent deployment steps (frontend sync, cache invalidation, Lambda update), and report the failure via the workflow job status
11. THE CI_CD_Workflow SHALL configure AWS credentials using GitHub secrets (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION) scoped per environment

### Requirement 12: Existing Terraform Workflow Preservation

**User Story:** As a DevOps engineer, I want the existing Terraform-based workflow preserved as a secondary deployment option, so that I can fall back to Terraform if needed.

#### Acceptance Criteria

1. THE CI_CD_Workflow SHALL rename the existing `.github/workflows/deploy.yml` to `.github/workflows/deploy-terraform.yml`
2. WHEN the Terraform workflow runs, THE CI_CD_Workflow SHALL set the `working-directory` for all Terraform init, plan, and apply steps to `infra/terraform-infra/` and set the working directory for all Terraform output steps to `infra/terraform-infra/`
3. THE CI_CD_Workflow SHALL retain all existing Terraform workflow job definitions, build steps, artifact uploads, S3 sync commands, Lambda update commands, and CloudFront invalidation steps without modification other than the working directory path
4. THE CI_CD_Workflow SHALL change the Terraform workflow trigger from automatic push-based deployment to `workflow_dispatch` only, so that it does not conflict with the CloudFormation workflow that deploys on push to main
5. THE CI_CD_Workflow SHALL update the workflow `name` field to "TaskFlow Terraform Deploy" to distinguish it from the CloudFormation workflow in the GitHub Actions UI

### Requirement 13: CloudFormation Stack Outputs

**User Story:** As a DevOps engineer, I want CloudFormation stacks to export key resource identifiers, so that CI/CD pipelines and other tooling can reference them.

#### Acceptance Criteria

1. THE CloudFormation_Stack SHALL output the API Gateway invoke URL with the logical output key `ApiGatewayInvokeUrl`
2. THE CloudFormation_Stack SHALL output the S3 frontend bucket name with the logical output key `FrontendBucketName`
3. THE CloudFormation_Stack SHALL output the CloudFront distribution ID with the logical output key `CloudFrontDistributionId`
4. THE CloudFormation_Stack SHALL output the CloudFront distribution domain name with the logical output key `CloudFrontDomainName`
5. THE CloudFormation_Stack SHALL output the Lambda function name with the logical output key `LambdaFunctionName`
6. THE CloudFormation_Stack SHALL output the Aurora cluster endpoint with the logical output key `AuroraClusterEndpoint`
7. THE CloudFormation_Stack SHALL define all outputs in the parent stack template so that they are retrievable via a single `aws cloudformation describe-stacks` call against the parent stack name
8. THE CloudFormation_Stack SHALL export each output using a CloudFormation Export with a name following the pattern `taskflow-{environment}-{output-key}` so that other stacks and tooling can reference them cross-stack
