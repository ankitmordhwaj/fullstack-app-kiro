"""Unit tests for wsgi.load_secrets() function.

Since wsgi.py executes load_secrets() and create_app() at module level,
we test load_secrets() by importing the module with carefully controlled
mocks and environment variables.
"""

import json
import os
import sys
import importlib
from unittest.mock import patch, MagicMock

import pytest
from botocore.exceptions import ClientError


@pytest.fixture(autouse=True)
def cleanup_wsgi_module():
    """Remove wsgi from sys.modules before and after each test."""
    sys.modules.pop("wsgi", None)
    yield
    sys.modules.pop("wsgi", None)
    # Clean up any env vars set by successful load_secrets calls
    for key in ("DATABASE_URL", "JWT_SECRET_KEY", "DB_USERNAME", "DB_PASSWORD", "SOME_OTHER_KEY"):
        os.environ.pop(key, None)


def _get_load_secrets_with_mocks(boto_mock=None, secrets_arn=None):
    """Import wsgi module with controlled mocks and return load_secrets.

    The module-level load_secrets() call will execute during import.
    We control its behavior by setting up mocks BEFORE importing.
    """
    env = {}
    if secrets_arn:
        env["SECRETS_ARN"] = secrets_arn

    # Mock create_app so the Flask app doesn't need a real database
    mock_app_module = MagicMock()
    mock_app_module.create_app.return_value = MagicMock()

    patches = {
        "app": mock_app_module,
    }

    with patch.dict(os.environ, env, clear=False):
        # Remove SECRETS_ARN if not specified
        if not secrets_arn:
            os.environ.pop("SECRETS_ARN", None)

        if boto_mock is not None:
            with patch("boto3.client", return_value=boto_mock):
                with patch.dict(sys.modules, patches):
                    import wsgi
                    importlib.reload(wsgi)
                    return wsgi.load_secrets
        else:
            with patch.dict(sys.modules, patches):
                import wsgi
                importlib.reload(wsgi)
                return wsgi.load_secrets


class TestLoadSecretsSkipsLocally:
    """When SECRETS_ARN is not set, load_secrets is a no-op."""

    def test_no_op_without_secrets_arn(self):
        """Should return without doing anything when SECRETS_ARN is unset."""
        load_secrets = _get_load_secrets_with_mocks(secrets_arn=None)
        # Call again explicitly — should be a no-op
        os.environ.pop("SECRETS_ARN", None)
        load_secrets()


class TestLoadSecretsSuccess:
    """When SECRETS_ARN is set and secret is valid."""

    def test_sets_env_vars_from_secret(self):
        """Should set all secret key-value pairs as environment variables."""
        secret_payload = {
            "DATABASE_URL": "postgresql://user:pass@host:5432/db",
            "JWT_SECRET_KEY": "super-secret",
            "DB_USERNAME": "admin",
            "DB_PASSWORD": "pw123",
        }
        mock_client = MagicMock()
        mock_client.get_secret_value.return_value = {
            "SecretString": json.dumps(secret_payload)
        }

        # Mock create_app so the Flask app doesn't need a real database
        mock_app_module = MagicMock()
        mock_app_module.create_app.return_value = MagicMock()

        env = {"SECRETS_ARN": "arn:aws:secretsmanager:us-east-1:123:secret:test"}

        with patch.dict(os.environ, env, clear=False):
            with patch("boto3.client", return_value=mock_client):
                with patch.dict(sys.modules, {"app": mock_app_module}):
                    import wsgi
                    importlib.reload(wsgi)

                    # Verify env vars were set by load_secrets during module load
                    assert os.environ["DATABASE_URL"] == "postgresql://user:pass@host:5432/db"
                    assert os.environ["JWT_SECRET_KEY"] == "super-secret"
                    assert os.environ["DB_USERNAME"] == "admin"
                    assert os.environ["DB_PASSWORD"] == "pw123"


class TestLoadSecretsClientError:
    """When Secrets Manager returns a ClientError."""

    def test_raises_runtime_error_on_client_error(self):
        """Should raise RuntimeError when secret retrieval fails."""
        mock_client = MagicMock()
        mock_client.get_secret_value.side_effect = ClientError(
            {"Error": {"Code": "ResourceNotFoundException", "Message": "Secret not found"}},
            "GetSecretValue",
        )

        with pytest.raises(RuntimeError, match="Cannot retrieve secrets"):
            _get_load_secrets_with_mocks(
                boto_mock=mock_client,
                secrets_arn="arn:aws:secretsmanager:us-east-1:123:secret:missing",
            )


class TestLoadSecretsInvalidFormat:
    """When the secret value is not valid JSON."""

    def test_raises_runtime_error_on_invalid_json(self):
        """Should raise RuntimeError when SecretString is not valid JSON."""
        mock_client = MagicMock()
        mock_client.get_secret_value.return_value = {
            "SecretString": "not-valid-json{{"
        }

        with pytest.raises(RuntimeError, match="Secret format invalid"):
            _get_load_secrets_with_mocks(
                boto_mock=mock_client,
                secrets_arn="arn:aws:secretsmanager:us-east-1:123:secret:bad",
            )


class TestLoadSecretsMissingKeys:
    """When required keys are missing from the secret."""

    def test_raises_runtime_error_when_database_url_missing(self):
        """Should raise RuntimeError when DATABASE_URL is missing."""
        secret_payload = {"JWT_SECRET_KEY": "secret"}
        mock_client = MagicMock()
        mock_client.get_secret_value.return_value = {
            "SecretString": json.dumps(secret_payload)
        }

        with pytest.raises(RuntimeError, match="Missing secret keys"):
            _get_load_secrets_with_mocks(
                boto_mock=mock_client,
                secrets_arn="arn:aws:secretsmanager:us-east-1:123:secret:partial",
            )

    def test_raises_runtime_error_when_jwt_secret_missing(self):
        """Should raise RuntimeError when JWT_SECRET_KEY is missing."""
        secret_payload = {"DATABASE_URL": "postgresql://host/db"}
        mock_client = MagicMock()
        mock_client.get_secret_value.return_value = {
            "SecretString": json.dumps(secret_payload)
        }

        with pytest.raises(RuntimeError, match="Missing secret keys"):
            _get_load_secrets_with_mocks(
                boto_mock=mock_client,
                secrets_arn="arn:aws:secretsmanager:us-east-1:123:secret:partial",
            )

    def test_raises_runtime_error_when_both_keys_missing(self):
        """Should raise RuntimeError when both required keys are missing."""
        secret_payload = {"SOME_OTHER_KEY": "value"}
        mock_client = MagicMock()
        mock_client.get_secret_value.return_value = {
            "SecretString": json.dumps(secret_payload)
        }

        with pytest.raises(RuntimeError, match="Missing secret keys"):
            _get_load_secrets_with_mocks(
                boto_mock=mock_client,
                secrets_arn="arn:aws:secretsmanager:us-east-1:123:secret:empty",
            )
