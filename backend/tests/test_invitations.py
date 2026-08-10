"""Unit tests for the invitations routes (accept/decline)."""

import pytest
from flask_jwt_extended import create_access_token

from extensions import db
from models.user import User
from models.team import Team, TeamMember
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


class TestAcceptInvitation:
    """Tests for PUT /invitations/<id>/accept."""

    def test_accept_success(self, client, app):
        """Accepting a pending invitation creates TeamMember and marks notification read."""
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
            invitee_id = invitee.id
            team_id = team.id
            notif_id = notification.id

        headers = _auth_header(app, invitee_id)
        resp = client.put(f"/invitations/{inv_id}/accept", headers=headers)

        assert resp.status_code == 200
        data = resp.get_json()
        assert data["id"] == inv_id
        assert data["status"] == "accepted"
        assert data["team_id"] == team_id

        # Verify TeamMember was created
        with app.app_context():
            member = TeamMember.query.filter_by(team_id=team_id, user_id=invitee_id).first()
            assert member is not None
            assert member.role == "member"

            # Verify notification marked as read
            notif = Notification.query.get(notif_id)
            assert notif.is_read is True

            # Verify invitation status updated
            inv = Invitation.query.get(inv_id)
            assert inv.status == InvitationStatus.ACCEPTED

    def test_accept_not_found(self, client, app):
        """Accepting a non-existent invitation returns 404."""
        with app.app_context():
            user = _create_user("User", "user@test.com")
            user_id = user.id

        headers = _auth_header(app, user_id)
        resp = client.put("/invitations/9999/accept", headers=headers)

        assert resp.status_code == 404
        assert resp.get_json()["error"] == "Invitation not found."

    def test_accept_wrong_user(self, client, app):
        """A user who is not the invitee gets 403."""
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
        resp = client.put(f"/invitations/{inv_id}/accept", headers=headers)

        assert resp.status_code == 403
        assert resp.get_json()["error"] == "You are not the invitee for this invitation."

    def test_accept_already_accepted(self, client, app):
        """Accepting an already accepted invitation returns 400."""
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
            invitee_id = invitee.id

        headers = _auth_header(app, invitee_id)
        resp = client.put(f"/invitations/{inv_id}/accept", headers=headers)

        assert resp.status_code == 400
        assert resp.get_json()["error"] == "Invitation is no longer pending."

    def test_accept_requires_auth(self, client):
        """Accepting without a token returns 401."""
        resp = client.put("/invitations/1/accept")
        assert resp.status_code == 401


class TestDeclineInvitation:
    """Tests for PUT /invitations/<id>/decline."""

    def test_decline_success(self, client, app):
        """Declining a pending invitation updates status and marks notification read."""
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
            invitee_id = invitee.id
            notif_id = notification.id

        headers = _auth_header(app, invitee_id)
        resp = client.put(f"/invitations/{inv_id}/decline", headers=headers)

        assert resp.status_code == 200
        data = resp.get_json()
        assert data["id"] == inv_id
        assert data["status"] == "declined"

        # Verify notification marked as read
        with app.app_context():
            notif = Notification.query.get(notif_id)
            assert notif.is_read is True

            # Verify invitation status updated
            inv = Invitation.query.get(inv_id)
            assert inv.status == InvitationStatus.DECLINED

            # Verify no TeamMember was created
            member = TeamMember.query.filter_by(user_id=invitee_id).first()
            assert member is None

    def test_decline_not_found(self, client, app):
        """Declining a non-existent invitation returns 404."""
        with app.app_context():
            user = _create_user("User", "user@test.com")
            user_id = user.id

        headers = _auth_header(app, user_id)
        resp = client.put("/invitations/9999/decline", headers=headers)

        assert resp.status_code == 404
        assert resp.get_json()["error"] == "Invitation not found."

    def test_decline_wrong_user(self, client, app):
        """A user who is not the invitee gets 403."""
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
        resp = client.put(f"/invitations/{inv_id}/decline", headers=headers)

        assert resp.status_code == 403
        assert resp.get_json()["error"] == "You are not the invitee for this invitation."

    def test_decline_already_declined(self, client, app):
        """Declining an already declined invitation returns 400."""
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
            invitee_id = invitee.id

        headers = _auth_header(app, invitee_id)
        resp = client.put(f"/invitations/{inv_id}/decline", headers=headers)

        assert resp.status_code == 400
        assert resp.get_json()["error"] == "Invitation is no longer pending."

    def test_decline_requires_auth(self, client):
        """Declining without a token returns 401."""
        resp = client.put("/invitations/1/decline")
        assert resp.status_code == 401
