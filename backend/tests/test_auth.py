"""Unit tests for POST /auth/register and POST /auth/login.

Coverage:
  - Happy-path register → 201 + user dict (no password field)
  - Missing field(s) → 400 with errors dict, all errors returned at once
  - Invalid email format → 400
  - Field length violations → 400
  - Duplicate email (case-insensitive) → 409
  - Happy-path login → 200 + tokens + user dict
  - Login missing fields → 400
  - Login wrong password → 401 generic message
  - Login unknown email → 401 generic message
"""

import json

import pytest


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _register(client, payload):
    return client.post(
        "/auth/register",
        data=json.dumps(payload),
        content_type="application/json",
    )


def _login(client, payload):
    return client.post(
        "/auth/login",
        data=json.dumps(payload),
        content_type="application/json",
    )


VALID_REG_PAYLOAD = {
    "full_name": "Alice Example",
    "email": "alice@example.com",
    "password": "securepass",
}


# ===========================================================================
# POST /auth/register — success
# ===========================================================================

class TestRegisterSuccess:
    def test_returns_201(self, client):
        res = _register(client, VALID_REG_PAYLOAD)
        assert res.status_code == 201

    def test_returns_user_dict_fields(self, client):
        res = _register(client, VALID_REG_PAYLOAD)
        body = res.get_json()
        assert "id" in body
        assert body["full_name"] == "Alice Example"
        assert body["email"] == "alice@example.com"
        assert "created_at" in body

    def test_password_not_in_response(self, client):
        res = _register(client, VALID_REG_PAYLOAD)
        body = res.get_json()
        assert "password" not in body
        assert "password_hash" not in body

    def test_email_stored_lowercase(self, client):
        payload = {**VALID_REG_PAYLOAD, "email": "ALICE@EXAMPLE.COM"}
        res = _register(client, payload)
        assert res.status_code == 201
        assert res.get_json()["email"] == "alice@example.com"


# ===========================================================================
# POST /auth/register — validation errors (400)
# ===========================================================================

class TestRegisterValidation:
    def test_missing_all_fields_returns_all_errors(self, client):
        res = _register(client, {})
        assert res.status_code == 400
        errors = res.get_json()["errors"]
        assert "full_name" in errors
        assert "email" in errors
        assert "password" in errors

    def test_missing_full_name(self, client):
        payload = {k: v for k, v in VALID_REG_PAYLOAD.items() if k != "full_name"}
        res = _register(client, payload)
        assert res.status_code == 400
        assert "full_name" in res.get_json()["errors"]

    def test_missing_email(self, client):
        payload = {k: v for k, v in VALID_REG_PAYLOAD.items() if k != "email"}
        res = _register(client, payload)
        assert res.status_code == 400
        assert "email" in res.get_json()["errors"]

    def test_missing_password(self, client):
        payload = {k: v for k, v in VALID_REG_PAYLOAD.items() if k != "password"}
        res = _register(client, payload)
        assert res.status_code == 400
        assert "password" in res.get_json()["errors"]

    def test_invalid_email_format(self, client):
        payload = {**VALID_REG_PAYLOAD, "email": "not-an-email"}
        res = _register(client, payload)
        assert res.status_code == 400
        assert "email" in res.get_json()["errors"]

    def test_password_too_short(self, client):
        payload = {**VALID_REG_PAYLOAD, "password": "short"}
        res = _register(client, payload)
        assert res.status_code == 400
        assert "password" in res.get_json()["errors"]

    def test_full_name_too_long(self, client):
        payload = {**VALID_REG_PAYLOAD, "full_name": "A" * 256}
        res = _register(client, payload)
        assert res.status_code == 400
        assert "full_name" in res.get_json()["errors"]

    def test_email_too_long(self, client):
        # 255 chars total: local@domain
        long_local = "a" * 244
        payload = {**VALID_REG_PAYLOAD, "email": f"{long_local}@example.com"}
        res = _register(client, payload)
        assert res.status_code == 400
        assert "email" in res.get_json()["errors"]

    def test_multiple_errors_returned_simultaneously(self, client):
        """Both full_name and password errors must come back in one response."""
        payload = {"full_name": "", "email": "valid@example.com", "password": "x"}
        res = _register(client, payload)
        assert res.status_code == 400
        errors = res.get_json()["errors"]
        assert "full_name" in errors
        assert "password" in errors

    def test_empty_strings_treated_as_missing(self, client):
        payload = {"full_name": "  ", "email": "  ", "password": ""}
        res = _register(client, payload)
        assert res.status_code == 400
        errors = res.get_json()["errors"]
        assert "full_name" in errors
        assert "email" in errors
        assert "password" in errors


# ===========================================================================
# POST /auth/register — duplicate email (409)
# ===========================================================================

class TestRegisterDuplicateEmail:
    def test_duplicate_email_returns_409(self, client):
        _register(client, VALID_REG_PAYLOAD)
        res = _register(client, VALID_REG_PAYLOAD)
        assert res.status_code == 409
        assert "error" in res.get_json()

    def test_duplicate_email_case_insensitive(self, client):
        _register(client, VALID_REG_PAYLOAD)
        payload = {**VALID_REG_PAYLOAD, "email": "ALICE@EXAMPLE.COM"}
        res = _register(client, payload)
        assert res.status_code == 409


# ===========================================================================
# POST /auth/login — success
# ===========================================================================

class TestLoginSuccess:
    @pytest.fixture(autouse=True)
    def register_user(self, client):
        _register(client, VALID_REG_PAYLOAD)
        # store client on self so test methods can reuse it
        self.client = client

    def test_returns_200(self):
        res = _login(self.client, {"email": "alice@example.com", "password": "securepass"})
        assert res.status_code == 200

    def test_response_contains_access_token(self):
        res = _login(self.client, {"email": "alice@example.com", "password": "securepass"})
        body = res.get_json()
        assert "access_token" in body
        assert body["access_token"]

    def test_response_contains_refresh_token(self):
        res = _login(self.client, {"email": "alice@example.com", "password": "securepass"})
        body = res.get_json()
        assert "refresh_token" in body
        assert body["refresh_token"]

    def test_response_contains_user_dict(self):
        res = _login(self.client, {"email": "alice@example.com", "password": "securepass"})
        user = res.get_json()["user"]
        assert user["email"] == "alice@example.com"
        assert user["full_name"] == "Alice Example"
        assert "password" not in user

    def test_login_case_insensitive_email(self):
        res = _login(self.client, {"email": "ALICE@EXAMPLE.COM", "password": "securepass"})
        assert res.status_code == 200


# ===========================================================================
# POST /auth/login — validation errors (400)
# ===========================================================================

class TestLoginValidation:
    def test_missing_email_returns_400(self, client):
        res = _login(client, {"password": "securepass"})
        assert res.status_code == 400
        assert "email" in res.get_json()["errors"]

    def test_missing_password_returns_400(self, client):
        res = _login(client, {"email": "alice@example.com"})
        assert res.status_code == 400
        assert "password" in res.get_json()["errors"]

    def test_missing_both_fields_returns_400_with_both_errors(self, client):
        res = _login(client, {})
        assert res.status_code == 400
        errors = res.get_json()["errors"]
        assert "email" in errors
        assert "password" in errors


# ===========================================================================
# POST /auth/login — bad credentials (401)
# ===========================================================================

class TestLoginBadCredentials:
    @pytest.fixture(autouse=True)
    def register_user(self, client):
        _register(client, VALID_REG_PAYLOAD)
        self.client = client

    def test_wrong_password_returns_401(self):
        res = _login(self.client, {"email": "alice@example.com", "password": "wrongpass"})
        assert res.status_code == 401

    def test_unknown_email_returns_401(self):
        res = _login(self.client, {"email": "unknown@example.com", "password": "securepass"})
        assert res.status_code == 401

    def test_generic_error_message_wrong_password(self):
        """Must not reveal which field was wrong."""
        res = _login(self.client, {"email": "alice@example.com", "password": "wrong"})
        body = res.get_json()
        assert "error" in body
        assert "Invalid" in body["error"] or "invalid" in body["error"]

    def test_generic_error_message_unknown_email(self):
        """Same generic message whether email is unknown or password is wrong."""
        res = _login(self.client, {"email": "ghost@example.com", "password": "securepass"})
        body = res.get_json()
        assert "error" in body
        # Must NOT reveal "email not found" or similar
        error_lower = body["error"].lower()
        assert "email not found" not in error_lower
        assert "not registered" not in error_lower
