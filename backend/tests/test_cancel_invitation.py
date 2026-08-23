"""Unit tests for PUT /invitations/<invitation_id>/cancel endpoint."""

from unittest.mock import patch

from flask_jwt_extended import create_access_token

from extensions import db
from models.user import User
from models.team import Team
from models.invitation import Invitation, InvitationStatus
from models.notification import Notification


def _create_user(full_name, email, password="Password1!"):
    """Helper to create a user."""
    user = User(full_name=full_name, email=email)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    return user


def _auth_header(app, user_id):
    """Return Authorization header dict for the given user_id."""
    with app.app_context():
        token = create_access_token(identity=str(user_id))
    return {"Authorization": f"Bearer {token}"}


class TestCancelInvitation:
    """Tests for PUT /invitations/<id>/cancel."""

    def test_cancel_success(self, client, app):
        """Inviter cancels a pending invitation → 200, status updated, notification marked read."""
        with app.app_context():
            inviter = _create_user("Inviter", "inviter@test.com")
            invitee = _create_user("Invitee", "invitee@test.com")
            team = Team(name="Test Team", owner_id=inviter.id)
            db.session.add(team)
            db.session.commit()

            invitation = Invitation(
                team_id=team.id,
                inviter_id=inviter.id,
                invitee_id=invitee.id,
                invitee_email=invitee.email,
                status=InvitationStatus.PENDING,
            )
            db.session.add(invitation)
            db.session.commit()

            notification = Notification(
                user_id=invitee.id,
                type="team_invitation",
                message="You have been invited to Test Team",
                invitation_id=invitation.id,
                is_read=False,
            )
            db.session.add(notification)
            db.session.commit()

            inv_id = invitation.id
            inviter_id = inviter.id
            notif_id = notification.id

        headers = _auth_header(app, inviter_id)
        resp = client.put(f"/invitations/{inv_id}/cancel", headers=headers)

        assert resp.status_code == 200
        data = resp.get_json()
        assert data["id"] == inv_id
        assert data["status"] == "cancelled"

        # Verify invitation status updated
        with app.app_context():
            inv = Invitation.query.get(inv_id)
            assert inv.status == InvitationStatus.CANCELLED

            # Verify notification marked as read
            notif = Notification.query.get(notif_id)
            assert notif.is_read is True

    def test_cancel_forbidden_non_inviter(self, client, app):
        """A user who is not the inviter gets 403."""
        with app.app_context():
            inviter = _create_user("Inviter", "inviter@test.com")
            invitee = _create_user("Invitee", "invitee@test.com")
            other = _create_user("Other", "other@test.com")
            team = Team(name="Test Team", owner_id=inviter.id)
            db.session.add(team)
            db.session.commit()

            invitation = Invitation(
                team_id=team.id,
                inviter_id=inviter.id,
                invitee_id=invitee.id,
                invitee_email=invitee.email,
                status=InvitationStatus.PENDING,
            )
            db.session.add(invitation)
            db.session.commit()

            inv_id = invitation.id
            other_id = other.id

        headers = _auth_header(app, other_id)
        resp = client.put(f"/invitations/{inv_id}/cancel", headers=headers)

        assert resp.status_code == 403
        assert resp.get_json()["error"] == "You are not the inviter for this invitation."

        # Verify invitation status unchanged
        with app.app_context():
            inv = Invitation.query.get(inv_id)
            assert inv.status == InvitationStatus.PENDING

    def test_cancel_not_found(self, client, app):
        """Cancelling a non-existent invitation returns 404."""
        with app.app_context():
            user = _create_user("User", "user@test.com")
            user_id = user.id

        headers = _auth_header(app, user_id)
        resp = client.put("/invitations/9999/cancel", headers=headers)

        assert resp.status_code == 404
        assert resp.get_json()["error"] == "Invitation not found."

    def test_cancel_not_pending_accepted(self, client, app):
        """Cancelling an already accepted invitation returns 400."""
        with app.app_context():
            inviter = _create_user("Inviter", "inviter@test.com")
            invitee = _create_user("Invitee", "invitee@test.com")
            team = Team(name="Test Team", owner_id=inviter.id)
            db.session.add(team)
            db.session.commit()

            invitation = Invitation(
                team_id=team.id,
                inviter_id=inviter.id,
                invitee_id=invitee.id,
                invitee_email=invitee.email,
                status=InvitationStatus.ACCEPTED,
            )
            db.session.add(invitation)
            db.session.commit()

            inv_id = invitation.id
            inviter_id = inviter.id

        headers = _auth_header(app, inviter_id)
        resp = client.put(f"/invitations/{inv_id}/cancel", headers=headers)

        assert resp.status_code == 400
        assert resp.get_json()["error"] == "Only pending invitations can be cancelled."

    def test_cancel_not_pending_declined(self, client, app):
        """Cancelling an already declined invitation returns 400."""
        with app.app_context():
            inviter = _create_user("Inviter", "inviter@test.com")
            invitee = _create_user("Invitee", "invitee@test.com")
            team = Team(name="Test Team", owner_id=inviter.id)
            db.session.add(team)
            db.session.commit()

            invitation = Invitation(
                team_id=team.id,
                inviter_id=inviter.id,
                invitee_id=invitee.id,
                invitee_email=invitee.email,
                status=InvitationStatus.DECLINED,
            )
            db.session.add(invitation)
            db.session.commit()

            inv_id = invitation.id
            inviter_id = inviter.id

        headers = _auth_header(app, inviter_id)
        resp = client.put(f"/invitations/{inv_id}/cancel", headers=headers)

        assert resp.status_code == 400
        assert resp.get_json()["error"] == "Only pending invitations can be cancelled."

    def test_cancel_not_pending_already_cancelled(self, client, app):
        """Cancelling an already cancelled invitation returns 400."""
        with app.app_context():
            inviter = _create_user("Inviter", "inviter@test.com")
            invitee = _create_user("Invitee", "invitee@test.com")
            team = Team(name="Test Team", owner_id=inviter.id)
            db.session.add(team)
            db.session.commit()

            invitation = Invitation(
                team_id=team.id,
                inviter_id=inviter.id,
                invitee_id=invitee.id,
                invitee_email=invitee.email,
                status=InvitationStatus.CANCELLED,
            )
            db.session.add(invitation)
            db.session.commit()

            inv_id = invitation.id
            inviter_id = inviter.id

        headers = _auth_header(app, inviter_id)
        resp = client.put(f"/invitations/{inv_id}/cancel", headers=headers)

        assert resp.status_code == 400
        assert resp.get_json()["error"] == "Only pending invitations can be cancelled."

    def test_cancel_database_error_returns_500(self, client, app):
        """Database error during commit triggers rollback and returns 500."""
        with app.app_context():
            inviter = _create_user("Inviter", "inviter@test.com")
            invitee = _create_user("Invitee", "invitee@test.com")
            team = Team(name="Test Team", owner_id=inviter.id)
            db.session.add(team)
            db.session.commit()

            invitation = Invitation(
                team_id=team.id,
                inviter_id=inviter.id,
                invitee_id=invitee.id,
                invitee_email=invitee.email,
                status=InvitationStatus.PENDING,
            )
            db.session.add(invitation)
            db.session.commit()

            inv_id = invitation.id
            inviter_id = inviter.id

        headers = _auth_header(app, inviter_id)

        with patch("routes.invitations.db.session.commit", side_effect=Exception("DB error")):
            resp = client.put(f"/invitations/{inv_id}/cancel", headers=headers)

        assert resp.status_code == 500
        assert resp.get_json()["error"] == "An unexpected error occurred. Please try again later."

        # Verify invitation status was rolled back (still pending)
        with app.app_context():
            inv = Invitation.query.get(inv_id)
            assert inv.status == InvitationStatus.PENDING

    def test_cancel_no_notification_still_succeeds(self, client, app):
        """Cancelling when no notification exists for the invitation should still succeed."""
        with app.app_context():
            inviter = _create_user("Inviter", "inviter@test.com")
            invitee = _create_user("Invitee", "invitee@test.com")
            team = Team(name="Test Team", owner_id=inviter.id)
            db.session.add(team)
            db.session.commit()

            invitation = Invitation(
                team_id=team.id,
                inviter_id=inviter.id,
                invitee_id=invitee.id,
                invitee_email=invitee.email,
                status=InvitationStatus.PENDING,
            )
            db.session.add(invitation)
            db.session.commit()

            inv_id = invitation.id
            inviter_id = inviter.id

            # Verify no notification exists
            notif = Notification.query.filter_by(invitation_id=inv_id).first()
            assert notif is None

        headers = _auth_header(app, inviter_id)
        resp = client.put(f"/invitations/{inv_id}/cancel", headers=headers)

        assert resp.status_code == 200
        data = resp.get_json()
        assert data["id"] == inv_id
        assert data["status"] == "cancelled"

        # Verify invitation status updated
        with app.app_context():
            inv = Invitation.query.get(inv_id)
            assert inv.status == InvitationStatus.CANCELLED

    def test_cancel_requires_auth(self, client):
        """Cancelling without a token returns 401."""
        resp = client.put("/invitations/1/cancel")
        assert resp.status_code == 401
