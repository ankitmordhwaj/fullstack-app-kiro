# Design Document: AWS Deployment Infrastructure

## Overview

This design describes the AWS deployment infrastructure for the TaskFlow FullStack application. The system uses Terraform to provision and manage all cloud resources across three isolated environments (dev, staging, prod). The architecture follows a serverless pattern: the Flask backend runs on AWS Lambda behind API Gateway, the React frontend is served from S3 via CloudFront, and Aurora PostgreSQL Serverless v2 provides the database layer. Secrets are managed via AWS Secrets Manager, and GitHub Actions automates the CI/CD pipeline.

### Key Design Decisions

1. **Serverless backend**: Lambda + API Gateway eliminates server management and provides automatic scaling. The existing `aws-wsgi` (awsgi) adapter translates API Gateway events to WSGI requests for Flask.
2. **Aurora Serverless v2**: Provides PostgreSQL compatibility with automatic scaling from 0.5 ACU (dev) to 8 ACU (prod), eliminating capacity planning.
3. **S3 + CloudFront**: Static frontend hosting with global CDN, Origin Access Control for security, and SPA error page handling for client-side routing.
4. **Separate state per environment**: Uses distinct S3 backend keys rather than Terraform workspaces, preventing cross-environment state conflicts.
5. **Secrets Manager integration**: Sensitive values never appear in Terraform state or source code. Lambda retrieves secrets at cold start.

## Architecture

```mermaid
graph TB
    subgraph "Internet"
        User[User Browser]
    end

    subgraph "AWS - CloudFront"
        CF[CloudFront Distribution]
    end

    subgraph "AWS - S3"
        S3[S3 Bucket<br/>Frontend Assets]
    end

    subgraph "AWS - API Gateway"
        APIGW[HTTP API<br/>Catch-all Proxy]
    end

    subgraph "AWS - VPC"
        subgraph "Public Subnets"
            NAT[NAT Gateway]
            IGW[Internet Gateway]
        end
        subgraph "Private Subnets"
            Lambda[Lambda Function<br/>Flask + awsgi]
            RDS[(Aurora PostgreSQL<br/>Serverless v2)]
        end
    end

    subgraph "AWS - Secrets"
        SM[Secrets Manager]
    end

    User -->|HTTPS| CF
    CF -->|OAC| S3
    User -->|HTTPS /api/*| APIGW
    APIGW -->|AWS_PROXY| Lambda
    Lambda -->|Port 5432| RDS
    Lambda -->|GetSecretValue| SM
    Lambda -->|Outbound| NAT
    NAT --> IGW
```

### Request Flow

1. **Frontend requests**: User → CloudFront → S3 (static assets). CloudFront serves cached content globally with HTTPS redirect and SPA fallback (index.html for 403/404).
2. **API requests**: User → API Gateway HTTP API → Lambda (awsgi adapter) → Flask app → Aurora PostgreSQL.
3. **Secret retrieval**: On Lambda cold start, the handler retrieves DATABASE_URL, JWT_SECRET_KEY, and DB credentials from Secrets Manager before initializing the Flask app.

## Components and Interfaces

### Terraform Module Structure

```
infra/
├── main.tf              # Provider, S3 backend configuration
├── variables.tf         # Input variable declarations
├── outputs.tf           # Output values (api_url, cloudfront_domain)
├── vpc.tf               # VPC, subnets, NAT GW, IGW, route tables, SGs
├── rds.tf               # Aurora cluster, instances, subnet group
├── secrets.tf           # Secrets Manager secret and lifecycle rules
├── lambda.tf            # Lambda function, IAM role, security group
├── api_gateway.tf       # HTTP API, integration, route, stage, CORS
├── s3.tf                # S3 bucket, bucket policy, public access block
├── cloudfront.tf        # Distribution, OAC, error responses
└── environments/
    ├── dev.tfvars       # Dev environment variables
    ├── staging.tfvars   # Staging environment variables
    └── prod.tfvars      # Prod environment variables
```

### Build Scripts

```
scripts/
├── build_backend.sh     # Package Flask app + deps into ZIP
└── build_frontend.sh    # npm install, VITE_API_URL, vite build
```

### CI/CD Pipeline

```
.github/
└── workflows/
    └── deploy.yml       # GitHub Actions workflow
```

### Component Responsibilities

| Component | Responsibility |
|-----------|---------------|
| `vpc.tf` | Network isolation: VPC, 2+ public subnets, 2+ private subnets, IGW, NAT GW, route tables, security groups |
| `rds.tf` | Aurora PostgreSQL Serverless v2 cluster and instance, DB subnet group, encryption |
| `secrets.tf` | Secrets Manager secret with JSON payload, lifecycle ignore_changes |
| `lambda.tf` | Lambda function, IAM execution role, VPC config, environment variables |
| `api_gateway.tf` | HTTP API, Lambda integration, catch-all route, CORS, auto-deploy stage |
| `s3.tf` | Frontend bucket, public access block, bucket policy for CloudFront OAC |
| `cloudfront.tf` | Distribution, OAC, HTTPS redirect, SPA error pages, price class |
| `build_backend.sh` | Install deps to temp dir, copy source (excluding tests), produce ZIP |
| `build_frontend.sh` | npm install, set VITE_API_URL, run `vite build`, output to dist/ |
| `deploy.yml` | Test → Build → Terraform Apply → Deploy Lambda + S3 + Invalidate CF |

### Interface Contracts

**Terraform Inputs** (via tfvars):
- `environment` (string): "dev", "staging", or "prod"
- `vpc_cidr` (string): Non-overlapping CIDR per environment
- `lambda_memory_size` (number): 128–3008 MB
- `lambda_timeout` (number): 3–900 seconds
- `db_min_capacity` (number): Minimum ACU
- `db_max_capacity` (number): Maximum ACU
- `cloudfront_price_class` (string): e.g., "PriceClass_100", "PriceClass_200"

**Terraform Outputs**:
- `api_url`: API Gateway invoke URL (used as VITE_API_URL)
- `cloudfront_domain`: CloudFront distribution domain name
- `s3_bucket_name`: Frontend bucket name for deployments
- `lambda_function_name`: Lambda function name for code updates

**Build Script Inputs/Outputs**:
- `build_backend.sh`: Input: `backend/` directory → Output: `build/backend.zip`
- `build_frontend.sh`: Input: `VITE_API_URL` env var + `frontend/` → Output: `frontend/dist/`

## Data Models

### Secrets Manager JSON Structure

```json
{
  "DATABASE_URL": "postgresql://user:pass@host:5432/dbname",
  "JWT_SECRET_KEY": "random-secret-key",
  "DB_USERNAME": "taskflow_admin",
  "DB_PASSWORD": "secure-password"
}
```

### Terraform State Structure

Each environment stores state independently:
- `s3://taskflow-terraform-state/dev/terraform.tfstate`
- `s3://taskflow-terraform-state/staging/terraform.tfstate`
- `s3://taskflow-terraform-state/prod/terraform.tfstate`

### Resource Naming Convention

All resources follow the pattern: `{environment}-taskflow-{resource-type}`

Examples:
- `dev-taskflow-lambda`
- `staging-taskflow-api`
- `prod-taskflow-vpc`
- `dev-taskflow-secrets`

### Environment Variable Configuration (tfvars)

```hcl
# dev.tfvars
environment         = "dev"
vpc_cidr            = "10.0.0.0/16"
lambda_memory_size  = 512
lambda_timeout      = 30
db_min_capacity     = 0.5
db_max_capacity     = 2
cloudfront_price_class = "PriceClass_100"

# staging.tfvars
environment         = "staging"
vpc_cidr            = "10.1.0.0/16"
lambda_memory_size  = 512
lambda_timeout      = 30
db_min_capacity     = 0.5
db_max_capacity     = 4
cloudfront_price_class = "PriceClass_100"

# prod.tfvars
environment         = "prod"
vpc_cidr            = "10.2.0.0/16"
lambda_memory_size  = 1024
lambda_timeout      = 30
db_min_capacity     = 1
db_max_capacity     = 8
cloudfront_price_class = "PriceClass_200"
```

## Error Handling

### Lambda Cold Start - Secrets Retrieval

When the Lambda function cold starts, it must retrieve secrets from Secrets Manager before the Flask app initializes:

```python
# backend/wsgi.py (enhanced for Lambda)
import os
import json
import logging
import boto3
import awsgi
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)

def load_secrets():
    """Retrieve secrets from AWS Secrets Manager and set as env vars."""
    secret_name = os.environ.get("SECRETS_ARN")
    if not secret_name:
        # Local development - secrets already in environment
        return

    client = boto3.client("secretsmanager")
    try:
        response = client.get_secret_value(SecretId=secret_name)
        secrets = json.loads(response["SecretString"])
    except ClientError as e:
        logger.error("Failed to retrieve secret %s: %s", secret_name, e)
        raise RuntimeError(f"Cannot retrieve secrets: {e}") from e
    except (json.JSONDecodeError, KeyError) as e:
        logger.error("Secret %s has invalid format: %s", secret_name, e)
        raise RuntimeError(f"Secret format invalid: {e}") from e

    required_keys = ["DATABASE_URL", "JWT_SECRET_KEY"]
    missing = [k for k in required_keys if k not in secrets]
    if missing:
        logger.error("Missing required keys in secret: %s", missing)
        raise RuntimeError(f"Missing secret keys: {missing}")

    for key, value in secrets.items():
        os.environ[key] = value

# Load secrets at module level (cold start)
load_secrets()

from app import create_app
app = create_app()

def handler(event, context):
    """Lambda handler function."""
    return awsgi.response(app, event, context)
```

### Terraform Error Scenarios

| Scenario | Handling |
|----------|----------|
| State lock contention | DynamoDB lock table prevents concurrent applies; retry after timeout |
| Resource already exists | Use `terraform import` or add lifecycle rules; prefix prevents cross-env conflicts |
| Secrets Manager unavailable | Lambda fails to start; CloudWatch logs capture error; alarm triggers notification |
| VPC quota exceeded | Terraform plan fails early; error message indicates quota limit |
| S3 bucket name taken | Environment prefix ensures uniqueness within account |

### CI/CD Pipeline Error Handling

| Stage | Failure Action |
|-------|---------------|
| Tests fail | Pipeline halts, no build or deploy |
| Build script fails | `set -e` causes immediate exit with non-zero code; pipeline halts |
| `terraform plan` fails | Pipeline halts before apply |
| `terraform apply` fails | Pipeline halts; no subsequent deploy steps; manual remediation needed |
| Lambda update fails | Pipeline reports failure; previous version remains active |
| S3 upload fails | Pipeline halts; CloudFront still serves previous cached content |
| CloudFront invalidation fails | Non-critical; old cache expires naturally; pipeline reports warning |

### Build Script Error Handling

Both scripts use `set -e` and `set -o pipefail` to fail fast:

```bash
#!/bin/bash
set -euo pipefail

# If any command fails, the script exits immediately with non-zero status
```

## Correctness Properties

This feature is entirely Infrastructure-as-Code (Terraform HCL), shell scripts, and CI/CD YAML. These are declarative configurations and build automation, not algorithmic code with variable inputs. Traditional property-based testing (PBT) does not apply because there are no functions that accept arbitrary inputs and produce outputs satisfying universal invariants. Instead, correctness is validated through the structural and behavioral properties listed below, verified via Terraform validation, integration tests, and security audits.

### Property 1: Environment Isolation

**Validates: Requirements 10.1, 10.2, 10.4, 10.5, 10.6**

For any two distinct environments E1 and E2, no resource created by E1's Terraform apply shall share a name, state file, VPC CIDR range, or IAM access scope with any resource created by E2's Terraform apply.

### Property 2: Network Security

**Validates: Requirements 2.5, 2.6, 3.6**

For any deployed environment, the RDS cluster shall accept inbound TCP connections exclusively from the Lambda security group on port 5432, and from no other source.

### Property 3: Secret Confidentiality

**Validates: Requirements 4.1, 4.5**

For any Terraform plan or apply output, no secret value (DATABASE_URL, JWT_SECRET_KEY, DB_PASSWORD) shall appear in plaintext in the Terraform state, plan output, or CI/CD logs.

### Property 4: Build Determinism

**Validates: Requirements 8.1, 8.4, 8.5**

For any given commit SHA and VITE_API_URL value, executing the build scripts shall produce identical deployment artifacts (same files in ZIP, same dist/ output).

### Property 5: Pipeline Gating

**Validates: Requirements 9.2, 9.3, 9.12, 9.13**

For any CI/CD pipeline run where at least one test fails, no deployment step (terraform apply, S3 upload, Lambda update, CloudFront invalidation) shall execute.

### Property 6: SPA Routing

**Validates: Requirements 7.5**

For any HTTP request to the CloudFront distribution with a path that does not match a physical file in S3, the response shall be index.html with HTTP status 200.

## Testing Strategy

### Why Property-Based Testing Does NOT Apply

This feature consists entirely of:
- **Infrastructure as Code (Terraform)**: Declarative configuration, not functions with inputs/outputs
- **Shell scripts**: Build automation with deterministic behavior
- **CI/CD pipeline (YAML)**: Workflow orchestration

None of these produce meaningful "for all inputs X, property P(X) holds" statements. The testing approach uses validation, integration, and smoke tests instead.

### Testing Approach

#### 1. Terraform Validation Tests

- `terraform validate` — syntax and internal consistency checks
- `terraform plan` with each tfvars file — ensures all environments produce valid plans
- `terraform fmt -check` — enforces consistent formatting

#### 2. Build Script Tests

- Run `build_backend.sh` and verify the ZIP contains expected files (wsgi.py, app.py, etc.)
- Run `build_backend.sh` and verify test files are excluded
- Run `build_frontend.sh` with a mock VITE_API_URL and verify `dist/` is produced
- Verify both scripts exit non-zero on simulated failures (missing dependencies)

#### 3. Integration Tests (Post-Deploy)

- Hit the API Gateway URL `/health` endpoint and verify 200 response
- Verify CloudFront serves `index.html` for the root path
- Verify CloudFront returns `index.html` (not 404) for arbitrary SPA routes
- Verify Lambda can connect to RDS through the VPC (health check queries DB)

#### 4. Security Validation

- Verify RDS is not publicly accessible (no public IP, private subnet only)
- Verify S3 bucket blocks public access
- Verify Lambda security group only allows port 5432 outbound to RDS SG
- Verify RDS security group only allows port 5432 inbound from Lambda SG

#### 5. CI/CD Pipeline Tests

- Verify pipeline triggers on push to main and on PR events
- Verify test failure halts the pipeline (no deploy steps run)
- Verify PR events skip deployment steps
- Verify staging/prod require manual approval

#### 6. Environment Isolation Verification

- Verify each environment's resources have correct prefix
- Verify state files are stored at separate S3 keys
- Verify VPC CIDRs do not overlap across environments
- Verify IAM roles are scoped to their own environment's resources
