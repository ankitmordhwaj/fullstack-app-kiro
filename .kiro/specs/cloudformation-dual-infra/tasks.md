# Implementation Plan: CloudFormation Dual Infrastructure

## Overview

This plan migrates the existing Terraform files into a subdirectory and creates a complete CloudFormation-based infrastructure using nested stacks. The implementation proceeds bottom-up: relocate Terraform first, then build individual CloudFormation stacks (networking → database → secrets → compute → storage), wire them together in a parent stack, create parameter files, and finally set up the CI/CD workflows.

## Tasks

- [x] 1. Relocate existing Terraform files
  - [x] 1.1 Move all Terraform files from `infra/` to `infra/terraform-infra/`
    - Create directory `infra/terraform-infra/`
    - Move `main.tf`, `variables.tf`, `outputs.tf`, `vpc.tf`, `rds.tf`, `secrets.tf`, `lambda.tf`, `api_gateway.tf`, `s3.tf`, `cloudfront.tf` into `infra/terraform-infra/`
    - Move `infra/environments/` directory (dev.tfvars, staging.tfvars, prod.tfvars) to `infra/terraform-infra/environments/`
    - Move any hidden files (e.g., `.terraform.lock.hcl`) if they exist
    - Verify `infra/` root contains no loose files after relocation
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. Create CloudFormation networking stack
  - [x] 2.1 Create `infra/cloudformation-infra/networking.yaml`
    - Define Parameters: `Environment` (AllowedValues: dev, staging, prod), `VpcCidr` (String)
    - Create VPC with configurable CIDR, DNS support and DNS hostnames enabled
    - Create Internet Gateway and attach to VPC
    - Create 2 public subnets across different AZs using `!Select` and `!GetAZs`
    - Create 2 private subnets across different AZs
    - Create Elastic IP and NAT Gateway in a public subnet
    - Create public route table with 0.0.0.0/0 → IGW route, associate with public subnets
    - Create private route table with 0.0.0.0/0 → NAT GW route, associate with private subnets
    - Create Lambda security group (no inbound rules, outbound: port 5432 to RDS SG, port 443 to 0.0.0.0/0)
    - Create RDS security group (inbound: port 5432 from Lambda SG only)
    - Tag all resources with `taskflow-{environment}-{resource-type}` naming convention
    - Define Outputs: VpcId, PublicSubnetIds, PrivateSubnetIds, LambdaSecurityGroupId, RdsSecurityGroupId
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 4.1, 4.2, 4.3, 4.4_

- [x] 3. Create CloudFormation database stack
  - [x] 3.1 Create `infra/cloudformation-infra/database.yaml`
    - Define Parameters: `Environment`, `VpcId`, `PrivateSubnetIds`, `RdsSecurityGroupId`, `DBMinCapacity`, `DBMaxCapacity`, `DBMasterUsername`, `DBMasterPassword` (NoEcho), `DBName` (default: taskflow)
    - Create DB Subnet Group using private subnets
    - Create Aurora PostgreSQL cluster (engine: aurora-postgresql, engine version 15.4, ServerlessV2ScalingConfiguration with min/max ACU from parameters)
    - Enable storage encryption with default AWS-managed KMS key
    - Associate RDS security group with the cluster
    - Create Aurora DB instance with `db.serverless` instance class
    - Tag resources with `taskflow-{environment}-{resource-type}` convention
    - Define Outputs: ClusterEndpoint, ClusterPort, DatabaseName
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9_

- [x] 4. Create CloudFormation secrets stack
  - [x] 4.1 Create `infra/cloudformation-infra/secrets.yaml`
    - Define Parameters: `Environment`, `ClusterEndpoint`, `ClusterPort`, `DBName`, `DBMasterUsername`, `DBMasterPassword` (NoEcho), `JwtSecretKey` (NoEcho, MinLength: 32)
    - Create Secrets Manager secret named `taskflow-{environment}-secrets`
    - Set SecretString as JSON with keys `DATABASE_URL` (constructed as `postgresql://{username}:{password}@{endpoint}:{port}/{dbname}`) and `JWT_SECRET_KEY`
    - Encrypt using AWS-managed KMS key (`aws/secretsmanager`)
    - Define Outputs: SecretArn
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 5. Create CloudFormation compute stack
  - [x] 5.1 Create `infra/cloudformation-infra/compute.yaml`
    - Define Parameters: `Environment`, `VpcId`, `PrivateSubnetIds`, `LambdaSecurityGroupId`, `SecretArn`, `LambdaMemorySize` (default: 512), `LambdaTimeout` (default: 30), `LambdaS3Bucket`, `LambdaS3Key`
    - Create IAM execution role with policies: secretsmanager:GetSecretValue (scoped to SecretArn), CloudWatch Logs permissions, VPC networking permissions (ec2:CreateNetworkInterface, ec2:DescribeNetworkInterfaces, ec2:DeleteNetworkInterface)
    - Create Lambda function: runtime Python 3.11, handler `wsgi.handler`, VPC config with private subnets and Lambda SG, environment variable SECRETS_ARN, code from S3 bucket/key
    - Create API Gateway HTTP API with `$default` stage (auto-deploy), CORS config (AllowOrigins: *, AllowMethods: GET/POST/PUT/DELETE/OPTIONS, AllowHeaders: Content-Type/Authorization)
    - Create Lambda proxy integration with payload format version 2.0
    - Create `$default` route pointing to the Lambda integration
    - Create AWS::Lambda::Permission granting API Gateway invoke access (source ARN scoped to specific HTTP API)
    - Tag resources with `taskflow-{environment}-{resource-type}` naming convention
    - Define Outputs: ApiInvokeUrl, FunctionName, LambdaArn
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 6. Create CloudFormation storage stack
  - [x] 6.1 Create `infra/cloudformation-infra/storage.yaml`
    - Define Parameters: `Environment`
    - Create S3 bucket named `taskflow-{environment}-frontend` with all 4 Block Public Access settings enabled
    - Create CloudFront Origin Access Control (OAC) with origin type S3, signing behavior "always"
    - Create CloudFront Distribution: S3 origin with OAC, default root object `index.html`, PriceClass_100, viewer protocol policy redirect-to-https, allowed methods GET/HEAD, CachingOptimized managed cache policy
    - Configure custom error responses for 403 and 404 → `/index.html` with status 200 and TTL 0 (SPA routing support)
    - Create S3 bucket policy granting s3:GetObject to CloudFront service principal conditioned on `aws:SourceArn` of the distribution
    - Tag resources with `taskflow-{environment}-{resource-type}` convention
    - Define Outputs: BucketName, DistributionId, DomainName
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

- [x] 7. Checkpoint - Verify all nested stack templates
  - Ensure all five nested stack templates (networking.yaml, database.yaml, secrets.yaml, compute.yaml, storage.yaml) are syntactically valid YAML
  - Verify each template declares required Parameters and Outputs sections
  - Verify cross-stack interface contracts: networking outputs match database/compute inputs, database outputs match secrets inputs, secrets outputs match compute inputs
  - Ask the user if questions arise.

- [x] 8. Create CloudFormation parent stack and parameter files
  - [x] 8.1 Create `infra/cloudformation-infra/main.yaml`
    - Define all parent-level Parameters: Environment, VpcCidr, DBMinCapacity, DBMaxCapacity, DBMasterUsername, DBMasterPassword (NoEcho), DBName (default: taskflow), JwtSecretKey (NoEcho, MinLength: 32), LambdaMemorySize (default: 512), LambdaTimeout (default: 30), LambdaS3Bucket, LambdaS3Key
    - Create AWS::CloudFormation::Stack resources for each nested stack (networking, database, secrets, compute, storage), passing correct parameters from parent and from other nested stack outputs
    - Wire cross-stack references: networking outputs → database/compute parameters, database outputs → secrets parameters, secrets outputs → compute parameters
    - Define parent Outputs: ApiGatewayInvokeUrl, FrontendBucketName, CloudFrontDistributionId, CloudFrontDomainName, LambdaFunctionName, AuroraClusterEndpoint
    - Export each output with name pattern `taskflow-{environment}-{output-key}` using `!Sub`
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8_

  - [x] 8.2 Create parameter files in `infra/cloudformation-infra/parameters/`
    - Create `dev.json` with: Environment=dev, VpcCidr=10.0.0.0/16, DBMinCapacity=0.5, DBMaxCapacity=2, DBMasterUsername=taskflow_admin, DBName=taskflow, LambdaMemorySize=512, LambdaTimeout=30
    - Create `staging.json` with: Environment=staging, VpcCidr=10.1.0.0/16, DBMinCapacity=0.5, DBMaxCapacity=4, same defaults
    - Create `prod.json` with: Environment=prod, VpcCidr=10.2.0.0/16, DBMinCapacity=1, DBMaxCapacity=8, LambdaMemorySize=1024, LambdaTimeout=30
    - Exclude sensitive parameters (DBMasterPassword, JwtSecretKey) — those come from CLI overrides
    - _Requirements: 2.4_

- [x] 9. Create GitHub Actions CloudFormation workflow
  - [x] 9.1 Create `.github/workflows/deploy-cloudformation.yml`
    - Set workflow name "TaskFlow CloudFormation Deploy"
    - Trigger on push to main branch and pull_request to main
    - Define test-backend job (pytest in backend/ directory)
    - Define test-frontend job (vitest via `npm run test` in frontend/ directory)
    - Define build job (needs test jobs, runs build_backend.sh and build_frontend.sh, uploads artifacts)
    - Define deploy-dev job (needs build, runs on push to main only, uses environment: dev):
      - Download artifacts
      - Upload backend.zip to S3 deployment bucket (from GitHub secrets)
      - Run `aws cloudformation deploy` with template `infra/cloudformation-infra/main.yaml`, parameter file `infra/cloudformation-infra/parameters/dev.json`, stack name `taskflow-dev`, parameter overrides for DBMasterPassword, JwtSecretKey, LambdaS3Bucket, LambdaS3Key
      - Retrieve stack outputs via `aws cloudformation describe-stacks`
      - Update Lambda function code with backend.zip
      - Sync frontend/dist/ to S3 frontend bucket
      - Invalidate CloudFront cache with path `/*`
    - Define deploy-staging job (needs deploy-dev, environment: staging with manual approval)
    - Define deploy-prod job (needs deploy-staging, environment: prod with manual approval)
    - Configure AWS credentials from GitHub secrets per environment (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION)
    - Ensure pipeline halts if cloudformation deploy fails (no subsequent steps execute)
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 11.9, 11.10, 11.11_

- [x] 10. Update existing Terraform workflow
  - [x] 10.1 Rename `.github/workflows/deploy.yml` to `.github/workflows/deploy-terraform.yml` and update
    - Rename the file from `deploy.yml` to `deploy-terraform.yml`
    - Change the workflow `name` field to "TaskFlow Terraform Deploy"
    - Change trigger from push/pull_request to `workflow_dispatch` only
    - Update all Terraform `working-directory` references from `infra` to `infra/terraform-infra/`
    - Retain all existing job definitions, build steps, artifact uploads, S3 sync commands, Lambda updates, and CloudFront invalidation steps unchanged except for the working directory path
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 11. Final checkpoint - Verify complete implementation
  - Verify `infra/` root contains only `terraform-infra/` and `cloudformation-infra/` subdirectories
  - Verify all CloudFormation templates are present and reference each other correctly in main.yaml
  - Verify parameter files exist for all 3 environments
  - Verify both GitHub Actions workflow files exist with correct triggers
  - Verify resource naming follows `taskflow-{environment}-{resource-type}` convention throughout all templates
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- This feature is entirely Infrastructure as Code (YAML, JSON, shell scripts, GitHub Actions) — no property-based tests apply
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation between major phases
- Sensitive values (DBMasterPassword, JwtSecretKey) are never stored in parameter files — they are passed via CLI `--parameter-overrides` from GitHub secrets
- The CloudFormation naming convention (`taskflow-{env}-*`) intentionally differs from Terraform (`{env}-taskflow-*`) to avoid resource conflicts
- Build scripts (`scripts/build_backend.sh`, `scripts/build_frontend.sh`) already exist and require no changes
- `backend/wsgi.py` already has Secrets Manager integration via `load_secrets()` — no application code changes needed

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "6.1"] },
    { "id": 2, "tasks": ["3.1", "4.1", "5.1"] },
    { "id": 3, "tasks": ["8.1", "8.2"] },
    { "id": 4, "tasks": ["9.1", "10.1"] }
  ]
}
```
