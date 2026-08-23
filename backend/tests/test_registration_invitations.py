"""Unit tests for pending invitation delivery on user registration.

Validates Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6

Coverage:
  - Registration with matching pending invitations → invitee_id linked, notifications created
  - Case-insensitive email matching
  - Registration with no matching invitations → no notifications, registration succeeds
  - Multiple pending invitations for same email → all linked, one notification per invitation
  - Transaction rollback on failure during invitation processing
"""

import json
from unittest.mock import patch

from extensions import db
from models.invitation import Invitation, InvitationStatus
from models.notification import Notification
from models.team import Team
from models.user import User


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _register(client, payload):
    """Send a POST /auth/register request."""
    return client.post(
        "/auth/register",
        data=json.dumps(payload),
        content_type="application/json",
    )


def _create_user(full_name, email, password="Password1!"):
    """Create and persist a user (used for inviters)."""
    user = User(full_name=full_name, email=email)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    return user


def _create_team(name, owner_id):
    """Create and persist a team."""
    team = Team(name=name, owner_id=owner_id)
    db.session.add(team)
    db.session.commit()
    return team


def _create_invitation(team_id, inviter_id, invitee_email, status=InvitationStatus.PENDING, invitee_id=None):
    """Create and persist an invitation."""
    invitation = Invitation(
        team_id=team_id,
        inviter_id=inviter_id,
        invitee_email=invitee_email,
        status=status,
        invitee_id=invitee_id,
    )
    db.session.add(invitation)
    db.session.commit()
    return invitation


# ===========================================================================
# Registration with matching pending invitations
# ===========================================================================

class TestRegistrationLinksInvitations:
    """Registration with matching pending invitations → invitee_id linked, notifications created."""

    def test_pending_invitation_linked_to_new_user(self, client, app):
        """Requirement 3.2: invitee_id is set to the new user's ID."""
        with app.app_context():
            inviter = _create_user("Team Owner", "owner@example.com")
            team = _create_team("Dev Team", inviter.id)
            invitation = _create_invitation(team.id, inviter.id, "newuser@example.com")
            inv_id = invitation.id

        resp = _register(client, {
            "full_name": "New User",
            "email": "newuser@example.com",
            "password": "securepass",
        })

        assert resp.status_code == 201
        new_user_id = resp.get_json()["id"]

        with app.app_context():
            inv = Invitation.query.get(inv_id)
            assert inv.invitee_id == new_user_id

    def test_notification_created_for_linked_invitation(self, client, app):
        """Requirement 3.3: notification of type 'team_invitation' created with invitation_id."""
        with app.app_context():
            inviter = _create_user("Alice Inviter", "alice@example.com")
            team = _create_team("Alpha Team", inviter.id)
            invitation = _create_invitation(team.id, inviter.id, "bob@example.com")
            inv_id = invitation.id

        resp = _register(client, {
            "full_name": "Bob User",
            "email": "bob@example.com",
            "password": "securepass",
        })

        assert resp.status_code == 201
        new_user_id = resp.get_json()["id"]

        with app.app_context():
            notifications = Notification.query.filter_by(user_id=new_user_id).all()
            assert len(notifications) == 1
            notif = notifications[0]
            assert notif.type == "team_invitation"
            assert notif.invitation_id == inv_id
            assert "Alice Inviter" in notif.message
            assert notif.is_read is False


# ===========================================================================
# Case-insensitive email matching
# ===========================================================================

class TestCaseInsensitiveMatching:
    """Requirement 3.1: case-insensitive comparison on invitee_email."""

    def test_uppercase_invitation_matches_lowercase_registration(self, client, app):
        """Invitation for 'User@Example.com' matches registration with 'user@example.com'."""
        with app.app_context():
            inviter = _create_user("Inviter", "inviter@example.com")
            team = _create_team("Case Team", inviter.id)
            invitation = _create_invitation(team.id, inviter.id, "User@Example.com")
            inv_id = invitation.id

        resp = _register(client, {
            "full_name": "Case User",
            "email": "user@example.com",
            "password": "securepass",
        })

        assert resp.status_code == 201
        new_user_id = resp.get_json()["id"]

        with app.app_context():
            inv = Invitation.query.get(inv_id)
            assert inv.invitee_id == new_user_id

    def test_lowercase_invitation_matches_uppercase_registration(self, client, app):
        """Invitation for 'user@example.com' matches registration with 'USER@EXAMPLE.COM'."""
        with app.app_context():
            inviter = _create_user("Inviter", "inviter@example.com")
            team = _create_team("Case Team", inviter.id)
            invitation = _create_invitation(team.id, inviter.id, "user@example.com")
            inv_id = invitation.id

        resp = _register(client, {
            "full_name": "Case User",
            "email": "USER@EXAMPLE.COM",
            "password": "securepass",
        })

        assert resp.status_code == 201
        new_user_id = resp.get_json()["id"]

        with app.app_context():
            inv = Invitation.query.get(inv_id)
            assert inv.invitee_id == new_user_id

    def test_mixed_case_invitation_matches(self, client, app):
        """Invitation for 'UsEr@ExAmPlE.cOm' matches registration with 'user@example.com'."""
        with app.app_context():
            inviter = _create_user("Inviter", "inviter@example.com")
            team = _create_team("Mixed Case Team", inviter.id)
            invitation = _create_invitation(team.id, inviter.id, "UsEr@ExAmPlE.cOm")
            inv_id = invitation.id

        resp = _register(client, {
            "full_name": "Mixed Case User",
            "email": "user@example.com",
            "password": "securepass",
        })

        assert resp.status_code == 201
        new_user_id = resp.get_json()["id"]

        with app.app_context():
            inv = Invitation.query.get(inv_id)
            assert inv.invitee_id == new_user_id


# ===========================================================================
# Registration with no matching invitations
# ===========================================================================

class TestNoMatchingInvitations:
    """Requirement 3.4: registration succeeds without creating notifications."""

    def test_registration_succeeds_with_no_pending_invitations(self, client, app):
        """No invitations exist for the email — registration succeeds normally."""
        resp = _register(client, {
            "full_name": "Solo User",
            "email": "solo@example.com",
            "password": "securepass",
        })

        assert resp.status_code == 201
        new_user_id = resp.get_json()["id"]

        with app.app_context():
            notifications = Notification.query.filter_by(user_id=new_user_id).all()
            assert len(notifications) == 0

    def test_non_pending_invitations_not_linked(self, client, app):
        """Invitations with status != 'pending' are not linked on registration."""
        with app.app_context():
            inviter = _create_user("Inviter", "inviter@example.com")
            team = _create_team("Team", inviter.id)
            # Accepted invitation
            inv_accepted = _create_invitation(
                team.id, inviter.id, "newuser@example.com", status=InvitationStatus.ACCEPTED
            )
            # Cancelled invitation
            inv_cancelled = _create_invitation(
                team.id, inviter.id, "newuser@example.com", status=InvitationStatus.CANCELLED
            )
            inv_accepted_id = inv_accepted.id
            inv_cancelled_id = inv_cancelled.id

        resp = _register(client, {
            "full_name": "New User",
            "email": "newuser@example.com",
            "password": "securepass",
        })

        assert resp.status_code == 201
        new_user_id = resp.get_json()["id"]

        with app.app_context():
            # Neither should be linked
            assert Invitation.query.get(inv_accepted_id).invitee_id is None
            assert Invitation.query.get(inv_cancelled_id).invitee_id is None
            # No notifications created
            notifications = Notification.query.filter_by(user_id=new_user_id).all()
            assert len(notifications) == 0

    def test_different_email_invitations_not_linked(self, client, app):
        """Pending invitations for a different email are not affected."""
        with app.app_context():
            inviter = _create_user("Inviter", "inviter@example.com")
            team = _create_team("Team", inviter.id)
            invitation = _create_invitation(team.id, inviter.id, "other@example.com")
            inv_id = invitation.id

        resp = _register(client, {
            "full_name": "Different User",
            "email": "different@example.com",
            "password": "securepass",
        })

        assert resp.status_code == 201

        with app.app_context():
            inv = Invitation.query.get(inv_id)
            assert inv.invitee_id is None


# ===========================================================================
# Multiple pending invitations for same email
# ===========================================================================

class TestMultiplePendingInvitations:
    """Requirement 3.3: all linked, one notification per invitation."""

    def test_all_pending_invitations_linked(self, client, app):
        """Multiple pending invitations for the same email are all linked to new user."""
        with app.app_context():
            inviter1 = _create_user("Inviter One", "inviter1@example.com")
            inviter2 = _create_user("Inviter Two", "inviter2@example.com")
            team1 = _create_team("Team Alpha", inviter1.id)
            team2 = _create_team("Team Beta", inviter2.id)

            inv1 = _create_invitation(team1.id, inviter1.id, "multi@example.com")
            inv2 = _create_invitation(team2.id, inviter2.id, "multi@example.com")
            inv1_id = inv1.id
            inv2_id = inv2.id

        resp = _register(client, {
            "full_name": "Multi User",
            "email": "multi@example.com",
            "password": "securepass",
        })

        assert resp.status_code == 201
        new_user_id = resp.get_json()["id"]

        with app.app_context():
            assert Invitation.query.get(inv1_id).invitee_id == new_user_id
            assert Invitation.query.get(inv2_id).invitee_id == new_user_id

    def test_one_notification_per_invitation(self, client, app):
        """Each linked invitation generates exactly one notification."""
        with app.app_context():
            inviter1 = _create_user("Inviter One", "inviter1@example.com")
            inviter2 = _create_user("Inviter Two", "inviter2@example.com")
            inviter3 = _create_user("Inviter Three", "inviter3@example.com")
            team1 = _create_team("Team A", inviter1.id)
            team2 = _create_team("Team B", inviter2.id)
            team3 = _create_team("Team C", inviter3.id)

            inv1 = _create_invitation(team1.id, inviter1.id, "multi@example.com")
            inv2 = _create_invitation(team2.id, inviter2.id, "multi@example.com")
            inv3 = _create_invitation(team3.id, inviter3.id, "multi@example.com")
            inv1_id = inv1.id
            inv2_id = inv2.id
            inv3_id = inv3.id

        resp = _register(client, {
            "full_name": "Multi User",
            "email": "multi@example.com",
            "password": "securepass",
        })

        assert resp.status_code == 201
        new_user_id = resp.get_json()["id"]

        with app.app_context():
            notifications = Notification.query.filter_by(user_id=new_user_id).all()
            assert len(notifications) == 3

            # Each notification should reference a distinct invitation
            notification_inv_ids = {n.invitation_id for n in notifications}
            assert notification_inv_ids == {inv1_id, inv2_id, inv3_id}

            # All should be team_invitation type
            for notif in notifications:
                assert notif.type == "team_invitation"

    def test_notification_messages_reference_inviters(self, client, app):
        """Each notification message contains the inviter's name."""
        with app.app_context():
            inviter1 = _create_user("Charlie Inviter", "charlie@example.com")
            inviter2 = _create_user("Diana Inviter", "diana@example.com")
            team1 = _create_team("Team Charlie", inviter1.id)
            team2 = _create_team("Team Diana", inviter2.id)

            _create_invitation(team1.id, inviter1.id, "recipient@example.com")
            _create_invitation(team2.id, inviter2.id, "recipient@example.com")

        resp = _register(client, {
            "full_name": "Recipient",
            "email": "recipient@example.com",
            "password": "securepass",
        })

        assert resp.status_code == 201
        new_user_id = resp.get_json()["id"]

        with app.app_context():
            notifications = Notification.query.filter_by(user_id=new_user_id).all()
            messages = [n.message for n in notifications]
            assert any("Charlie Inviter" in m for m in messages)
            assert any("Diana Inviter" in m for m in messages)


# ===========================================================================
# Transaction rollback on failure
# ===========================================================================

class TestTransactionRollback:
    """Requirements 3.5, 3.6: atomic transaction — rollback on failure."""

    def test_rollback_on_commit_failure(self, client, app):
        """If commit fails, user is not created, invitations not linked."""
        with app.app_context():
            inviter = _create_user("Inviter", "inviter@example.com")
            team = _create_team("Team", inviter.id)
            invitation = _create_invitation(team.id, inviter.id, "failing@example.com")
            inv_id = invitation.id

        with patch("routes.auth.db.session.commit", side_effect=Exception("DB failure")):
            resp = _register(client, {
                "full_name": "Failing User",
                "email": "failing@example.com",
                "password": "securepass",
            })

        assert resp.status_code == 500
        body = resp.get_json()
        assert "error" in body

        with app.app_context():
            # User should not exist
            user = User.query.filter_by(email="failing@example.com").first()
            assert user is None

            # Invitation should not be linked
            inv = Invitation.query.get(inv_id)
            assert inv.invitee_id is None

            # No notifications should exist for the email
            notifications = Notification.query.all()
            # Only notifications that might exist are unrelated
            for n in notifications:
                assert n.invitation_id != inv_id
