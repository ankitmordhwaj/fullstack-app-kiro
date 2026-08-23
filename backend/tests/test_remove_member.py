"""Unit tests for DELETE /teams/members/<user_id> endpoint."""

from unittest.mock import patch

from flask_jwt_extended import create_access_token

from extensions import db
from models.user import User
from models.team import Team, TeamMember
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


class TestRemoveMember:
    """Tests for DELETE /teams/members/<user_id>."""

    def test_remove_member_success(self, client, app):
        """Owner removes a member → 200, member record deleted, notification created."""
        with app.app_context():
            owner = _create_user("Owner", "owner@test.com")
            member = _create_user("Member", "member@test.com")

            team = Team(name="Test Team", owner_id=owner.id)
            db.session.add(team)
            db.session.commit()

            owner_membership = TeamMember(team_id=team.id, user_id=owner.id, role="owner")
            member_membership = TeamMember(team_id=team.id, user_id=member.id, role="member")
            db.session.add_all([owner_membership, member_membership])
            db.session.commit()

            owner_id = owner.id
            member_id = member.id
            team_id = team.id

        headers = _auth_header(app, owner_id)
        resp = client.delete(f"/teams/members/{member_id}", headers=headers)

        assert resp.status_code == 200
        data = resp.get_json()
        assert data["message"] == "Member removed successfully."

        # Verify member record is deleted
        with app.app_context():
            membership = TeamMember.query.filter_by(
                team_id=team_id, user_id=member_id
            ).first()
            assert membership is None

            # Verify notification was created for the removed user
            notification = Notification.query.filter_by(
                user_id=member_id, type="team_removal"
            ).first()
            assert notification is not None
            assert "Test Team" in notification.message
            assert notification.is_read is False

    def test_remove_member_forbidden_non_owner(self, client, app):
        """Non-owner attempts removal → 403."""
        with app.app_context():
            owner = _create_user("Owner", "owner@test.com")
            member = _create_user("Member", "member@test.com")
            other_member = _create_user("Other", "other@test.com")

            team = Team(name="Test Team", owner_id=owner.id)
            db.session.add(team)
            db.session.commit()

            owner_membership = TeamMember(team_id=team.id, user_id=owner.id, role="owner")
            member_membership = TeamMember(team_id=team.id, user_id=member.id, role="member")
            other_membership = TeamMember(team_id=team.id, user_id=other_member.id, role="member")
            db.session.add_all([owner_membership, member_membership, other_membership])
            db.session.commit()

            member_id = member.id
            other_member_id = other_member.id

        # other_member (non-owner) tries to remove member
        headers = _auth_header(app, other_member_id)
        resp = client.delete(f"/teams/members/{member_id}", headers=headers)

        assert resp.status_code == 403
        data = resp.get_json()
        assert data["error"] == "Only the team owner can remove members."

    def test_remove_member_owner_self_removal(self, client, app):
        """Owner tries to remove themselves → 400."""
        with app.app_context():
            owner = _create_user("Owner", "owner@test.com")

            team = Team(name="Test Team", owner_id=owner.id)
            db.session.add(team)
            db.session.commit()

            owner_membership = TeamMember(team_id=team.id, user_id=owner.id, role="owner")
            db.session.add(owner_membership)
            db.session.commit()

            owner_id = owner.id

        headers = _auth_header(app, owner_id)
        resp = client.delete(f"/teams/members/{owner_id}", headers=headers)

        assert resp.status_code == 400
        data = resp.get_json()
        assert data["error"] == "Cannot remove the team owner."

    def test_remove_member_not_found(self, client, app):
        """Target user is not a member of the team → 404."""
        with app.app_context():
            owner = _create_user("Owner", "owner@test.com")
            non_member = _create_user("NonMember", "nonmember@test.com")

            team = Team(name="Test Team", owner_id=owner.id)
            db.session.add(team)
            db.session.commit()

            owner_membership = TeamMember(team_id=team.id, user_id=owner.id, role="owner")
            db.session.add(owner_membership)
            db.session.commit()

            owner_id = owner.id
            non_member_id = non_member.id

        headers = _auth_header(app, owner_id)
        resp = client.delete(f"/teams/members/{non_member_id}", headers=headers)

        assert resp.status_code == 404
        data = resp.get_json()
        assert data["error"] == "Member not found in this team."

    def test_remove_member_database_error(self, client, app):
        """Mock db.session.commit raising exception → rollback and 500 response."""
        with app.app_context():
            owner = _create_user("Owner", "owner@test.com")
            member = _create_user("Member", "member@test.com")

            team = Team(name="Test Team", owner_id=owner.id)
            db.session.add(team)
            db.session.commit()

            owner_membership = TeamMember(team_id=team.id, user_id=owner.id, role="owner")
            member_membership = TeamMember(team_id=team.id, user_id=member.id, role="member")
            db.session.add_all([owner_membership, member_membership])
            db.session.commit()

            owner_id = owner.id
            member_id = member.id
            team_id = team.id

        headers = _auth_header(app, owner_id)

        with patch("routes.teams.db.session.commit", side_effect=Exception("DB error")):
            resp = client.delete(f"/teams/members/{member_id}", headers=headers)

        assert resp.status_code == 500
        data = resp.get_json()
        assert data["error"] == "An unexpected error occurred. Please try again later."

        # Verify rollback: member should still exist
        with app.app_context():
            membership = TeamMember.query.filter_by(
                team_id=team_id, user_id=member_id
            ).first()
            assert membership is not None

    def test_remove_member_requires_auth(self, client):
        """Removing a member without a token returns 401."""
        resp = client.delete("/teams/members/1")
        assert resp.status_code == 401
