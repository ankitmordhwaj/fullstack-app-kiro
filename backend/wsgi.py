"""AWS Lambda entry point.

This module is the handler invoked by Lambda. It adapts the Flask WSGI
application to the Lambda event/context interface using ``awsgi``.

On cold start, secrets are retrieved from AWS Secrets Manager and set as
environment variables before the Flask app is initialised.
"""

import os
import json
import logging

import boto3
import awsgi
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)


def load_secrets():
    """Retrieve secrets from AWS Secrets Manager and set as env vars.

    Reads the SECRETS_ARN environment variable to locate the secret.
    If SECRETS_ARN is not set (local development), this function is a no-op.

    Raises:
        RuntimeError: If the secret cannot be retrieved, has invalid format,
            or is missing required keys (DATABASE_URL, JWT_SECRET_KEY).
    """
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

from app import create_app  # noqa: E402

app = create_app()


def handler(event, context):
    """Lambda handler function."""
    return awsgi.response(app, event, context)
