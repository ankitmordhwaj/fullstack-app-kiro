"""Unit tests for the tickets blueprint (GET/POST /tickets)."""

import pytest
from flask_jwt_extended import create_access_token

from extensions import db
from models.user import User
from models.team import Team, TeamMember
from models.ticket import Ticket
from models.task import Priority, Status


def _create_user(full_name: str, email: str, password: str = "pass123") -> User:
    """Helper to create and persist a user."""
    user = User(full_name=full_name, email=email)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    return user


def _create_team(name: str, owner: User) -> Team:
    """Helper to create and persist a team."""
    team = Team(name=name, owner_id=owner.id)
    db.session.add(team)
    db.session.commit()
    return team


def _add_team_member(team: Team, user: User, role: str = "member") -> TeamMember:
    """Helper to add a user as a team member."""
    member = TeamMember(team_id=team.id, user_id=user.id, role=role)
    db.session.add(member)
    db.session.commit()
    return member


def _get_token(app, user: User) -> str:
    """Generate a JWT access token for the given user."""
    with app.app_context():
        return create_access_token(identity=str(user.id))


def _auth_header(token: str) -> dict:
    """Return an Authorization header dict."""
    return {"Authorization": f"Bearer {token}"}


# --------------------------------------------------------------------------- #
# GET /tickets
# --------------------------------------------------------------------------- #


class TestGetTickets:
    """Tests for GET /tickets endpoint."""

    def test_requires_auth(self, client):
        """GET /tickets without a token returns 401."""
        resp = client.get("/tickets")
        assert resp.status_code == 401

    def test_returns_team_tickets_for_owner(self, client, app):
        """User who owns a team gets all team tickets."""
        owner = _create_user("Owner", "owner@test.com")
        team = _create_team("Team A", owner)

        # Create tickets for the team
        t1 = Ticket(
            title="Ticket 1",
            description="Desc 1",
            priority=Priority.HIGH,
            status=Status.PENDING,
            team_id=team.id,
            creator_id=owner.id,
        )
        t2 = Ticket(
            title="Ticket 2",
            description="Desc 2",
            priority=Priority.LOW,
            status=Status.INPROGRESS,
            team_id=team.id,
            creator_id=owner.id,
        )
        db.session.add_all([t1, t2])
        db.session.commit()

        token = _get_token(app, owner)
        resp = client.get("/tickets", headers=_auth_header(token))

        assert resp.status_code == 200
        data = resp.get_json()
        assert len(data) == 2
        assert {d["title"] for d in data} == {"Ticket 1", "Ticket 2"}

    def test_returns_team_tickets_for_member(self, client, app):
        """User who is a member (not owner) of a team gets all team tickets."""
        owner = _create_user("Owner", "owner@test.com")
        member = _create_user("Member", "member@test.com")
        team = _create_team("Team B", owner)
        _add_team_member(team, member)

        # Create a ticket by the owner
        t1 = Ticket(
            title="Owner Ticket",
            description="Created by owner",
            priority=Priority.MEDIUM,
            status=Status.PENDING,
            team_id=team.id,
            creator_id=owner.id,
        )
        db.session.add(t1)
        db.session.commit()

        # Member should see all team tickets
        token = _get_token(app, member)
        resp = client.get("/tickets", headers=_auth_header(token))

        assert resp.status_code == 200
        data = resp.get_json()
        assert len(data) == 1
        assert data[0]["title"] == "Owner Ticket"

    def test_returns_own_tickets_for_no_team_user(self, client, app):
        """User with no team gets only their own tickets."""
        loner = _create_user("Loner", "loner@test.com")
        other = _create_user("Other", "other@test.com")

        # Create a team for 'other' user with a ticket
        other_team = _create_team("Other Team", other)
        t_other = Ticket(
            title="Other Ticket",
            description="Not for loner",
            priority=Priority.HIGH,
            status=Status.PENDING,
            team_id=other_team.id,
            creator_id=other.id,
        )
        # Loner's own ticket (with a team association from before)
        t_loner = Ticket(
            title="Loner Ticket",
            description="My own",
            priority=Priority.LOW,
            status=Status.COMPLETED,
            team_id=other_team.id,
            creator_id=loner.id,
        )
        db.session.add_all([t_other, t_loner])
        db.session.commit()

        token = _get_token(app, loner)
        resp = client.get("/tickets", headers=_auth_header(token))

        assert resp.status_code == 200
        data = resp.get_json()
        # Loner has no team, so gets tickets where creator_id = loner.id
        assert len(data) == 1
        assert data[0]["title"] == "Loner Ticket"

    def test_returns_empty_list_when_no_tickets(self, client, app):
        """User with a team but no tickets gets an empty list."""
        owner = _create_user("Owner", "owner@test.com")
        _create_team("Empty Team", owner)

        token = _get_token(app, owner)
        resp = client.get("/tickets", headers=_auth_header(token))

        assert resp.status_code == 200
        data = resp.get_json()
        assert data == []

    def test_owner_team_takes_priority_over_membership(self, client, app):
        """If user owns a team AND is a member of another, owned team wins."""
        user = _create_user("User", "user@test.com")
        other_owner = _create_user("Other", "other@test.com")

        # User owns their own team
        own_team = _create_team("Own Team", user)
        # User is also a member of another team
        other_team = _create_team("Other Team", other_owner)
        _add_team_member(other_team, user)

        # Tickets in each team
        t_own = Ticket(
            title="Own Team Ticket",
            description="In own team",
            priority=Priority.HIGH,
            status=Status.PENDING,
            team_id=own_team.id,
            creator_id=user.id,
        )
        t_other = Ticket(
            title="Other Team Ticket",
            description="In other team",
            priority=Priority.LOW,
            status=Status.PENDING,
            team_id=other_team.id,
            creator_id=other_owner.id,
        )
        db.session.add_all([t_own, t_other])
        db.session.commit()

        token = _get_token(app, user)
        resp = client.get("/tickets", headers=_auth_header(token))

        assert resp.status_code == 200
        data = resp.get_json()
        # Should only see own team's tickets
        assert len(data) == 1
        assert data[0]["title"] == "Own Team Ticket"


# --------------------------------------------------------------------------- #
# POST /tickets
# --------------------------------------------------------------------------- #


class TestCreateTicket:
    """Tests for POST /tickets endpoint."""

    def test_requires_auth(self, client):
        """POST /tickets without a token returns 401."""
        resp = client.post("/tickets", json={"title": "Test"})
        assert resp.status_code == 401

    def test_creates_ticket_successfully(self, client, app):
        """Valid payload creates a ticket with 201."""
        owner = _create_user("Owner", "owner@test.com")
        team = _create_team("Team", owner)

        token = _get_token(app, owner)
        payload = {
            "title": "New Ticket",
            "description": "A detailed description",
            "priority": "HIGH",
        }
        resp = client.post(
            "/tickets",
            json=payload,
            headers=_auth_header(token),
        )

        assert resp.status_code == 201
        data = resp.get_json()
        assert data["title"] == "New Ticket"
        assert data["description"] == "A detailed description"
        assert data["priority"] == "HIGH"
        assert data["status"] == "PENDING"  # default
        assert data["team_id"] == team.id
        assert data["creator_id"] == owner.id
        assert data["assignee_id"] is None

    def test_creates_ticket_with_assignee(self, client, app):
        """Ticket can be assigned to a team member."""
        owner = _create_user("Owner", "owner@test.com")
        member = _create_user("Member", "member@test.com")
        team = _create_team("Team", owner)
        _add_team_member(team, member)

        token = _get_token(app, owner)
        payload = {
            "title": "Assigned Ticket",
            "description": "Assigned to member",
            "priority": "MEDIUM",
            "assignee_id": member.id,
        }
        resp = client.post(
            "/tickets",
            json=payload,
            headers=_auth_header(token),
        )

        assert resp.status_code == 201
        data = resp.get_json()
        assert data["assignee_id"] == member.id
        assert data["assignee_name"] == "Member"

    def test_creates_ticket_assigned_to_owner(self, client, app):
        """Ticket can be assigned to the team owner."""
        owner = _create_user("Owner", "owner@test.com")
        team = _create_team("Team", owner)

        token = _get_token(app, owner)
        payload = {
            "title": "Self-assigned",
            "description": "Assigned to myself",
            "priority": "LOW",
            "assignee_id": owner.id,
        }
        resp = client.post(
            "/tickets",
            json=payload,
            headers=_auth_header(token),
        )

        assert resp.status_code == 201
        data = resp.get_json()
        assert data["assignee_id"] == owner.id

    def test_creates_ticket_with_explicit_status(self, client, app):
        """Ticket can specify a status other than PENDING."""
        owner = _create_user("Owner", "owner@test.com")
        _create_team("Team", owner)

        token = _get_token(app, owner)
        payload = {
            "title": "In Progress Ticket",
            "description": "Already started",
            "priority": "HIGH",
            "status": "INPROGRESS",
        }
        resp = client.post(
            "/tickets",
            json=payload,
            headers=_auth_header(token),
        )

        assert resp.status_code == 201
        data = resp.get_json()
        assert data["status"] == "INPROGRESS"

    def test_rejects_missing_title(self, client, app):
        """Missing title returns 400 with error."""
        owner = _create_user("Owner", "owner@test.com")
        _create_team("Team", owner)

        token = _get_token(app, owner)
        payload = {
            "description": "Has description",
            "priority": "HIGH",
        }
        resp = client.post(
            "/tickets",
            json=payload,
            headers=_auth_header(token),
        )

        assert resp.status_code == 400
        errors = resp.get_json()["errors"]
        assert "title" in errors
        assert errors["title"] == "Title is required."

    def test_rejects_missing_description(self, client, app):
        """Missing description returns 400 with error."""
        owner = _create_user("Owner", "owner@test.com")
        _create_team("Team", owner)

        token = _get_token(app, owner)
        payload = {
            "title": "Has title",
            "priority": "HIGH",
        }
        resp = client.post(
            "/tickets",
            json=payload,
            headers=_auth_header(token),
        )

        assert resp.status_code == 400
        errors = resp.get_json()["errors"]
        assert "description" in errors

    def test_rejects_missing_priority(self, client, app):
        """Missing priority returns 400 with error."""
        owner = _create_user("Owner", "owner@test.com")
        _create_team("Team", owner)

        token = _get_token(app, owner)
        payload = {
            "title": "Has title",
            "description": "Has description",
        }
        resp = client.post(
            "/tickets",
            json=payload,
            headers=_auth_header(token),
        )

        assert resp.status_code == 400
        errors = resp.get_json()["errors"]
        assert "priority" in errors

    def test_rejects_invalid_priority(self, client, app):
        """Invalid priority value returns 400."""
        owner = _create_user("Owner", "owner@test.com")
        _create_team("Team", owner)

        token = _get_token(app, owner)
        payload = {
            "title": "Ticket",
            "description": "Desc",
            "priority": "CRITICAL",
        }
        resp = client.post(
            "/tickets",
            json=payload,
            headers=_auth_header(token),
        )

        assert resp.status_code == 400
        errors = resp.get_json()["errors"]
        assert "priority" in errors

    def test_rejects_invalid_status(self, client, app):
        """Invalid status value returns 400."""
        owner = _create_user("Owner", "owner@test.com")
        _create_team("Team", owner)

        token = _get_token(app, owner)
        payload = {
            "title": "Ticket",
            "description": "Desc",
            "priority": "HIGH",
            "status": "INVALID",
        }
        resp = client.post(
            "/tickets",
            json=payload,
            headers=_auth_header(token),
        )

        assert resp.status_code == 400
        errors = resp.get_json()["errors"]
        assert "status" in errors

    def test_rejects_assignee_not_in_team(self, client, app):
        """Assignee who is not a team member returns 400."""
        owner = _create_user("Owner", "owner@test.com")
        outsider = _create_user("Outsider", "outsider@test.com")
        _create_team("Team", owner)

        token = _get_token(app, owner)
        payload = {
            "title": "Ticket",
            "description": "Desc",
            "priority": "HIGH",
            "assignee_id": outsider.id,
        }
        resp = client.post(
            "/tickets",
            json=payload,
            headers=_auth_header(token),
        )

        assert resp.status_code == 400
        errors = resp.get_json()["errors"]
        assert "assignee_id" in errors
        assert errors["assignee_id"] == "Assignee must be a member of the team."

    def test_rejects_user_with_no_team(self, client, app):
        """User without a team cannot create tickets."""
        loner = _create_user("Loner", "loner@test.com")

        token = _get_token(app, loner)
        payload = {
            "title": "Ticket",
            "description": "Desc",
            "priority": "HIGH",
        }
        resp = client.post(
            "/tickets",
            json=payload,
            headers=_auth_header(token),
        )

        assert resp.status_code == 400
        data = resp.get_json()
        assert "error" in data
        assert "team" in data["error"].lower()

    def test_collects_all_validation_errors(self, client, app):
        """Multiple invalid fields return all errors at once."""
        owner = _create_user("Owner", "owner@test.com")
        _create_team("Team", owner)

        token = _get_token(app, owner)
        payload = {}  # all fields missing
        resp = client.post(
            "/tickets",
            json=payload,
            headers=_auth_header(token),
        )

        assert resp.status_code == 400
        errors = resp.get_json()["errors"]
        assert "title" in errors
        assert "description" in errors
        assert "priority" in errors

    def test_title_too_long(self, client, app):
        """Title exceeding 200 chars returns error."""
        owner = _create_user("Owner", "owner@test.com")
        _create_team("Team", owner)

        token = _get_token(app, owner)
        payload = {
            "title": "x" * 201,
            "description": "Valid desc",
            "priority": "HIGH",
        }
        resp = client.post(
            "/tickets",
            json=payload,
            headers=_auth_header(token),
        )

        assert resp.status_code == 400
        errors = resp.get_json()["errors"]
        assert "title" in errors
        assert "200" in errors["title"]

    def test_description_too_long(self, client, app):
        """Description exceeding 1000 chars returns error."""
        owner = _create_user("Owner", "owner@test.com")
        _create_team("Team", owner)

        token = _get_token(app, owner)
        payload = {
            "title": "Valid title",
            "description": "x" * 1001,
            "priority": "HIGH",
        }
        resp = client.post(
            "/tickets",
            json=payload,
            headers=_auth_header(token),
        )

        assert resp.status_code == 400
        errors = resp.get_json()["errors"]
        assert "description" in errors
        assert "1000" in errors["description"]


# --------------------------------------------------------------------------- #
# PUT /tickets/<id>
# --------------------------------------------------------------------------- #


class TestUpdateTicket:
    """Tests for PUT /tickets/<id> endpoint."""

    def test_requires_auth(self, client):
        """PUT /tickets/1 without a token returns 401."""
        resp = client.put("/tickets/1", json={"status": "COMPLETED"})
        assert resp.status_code == 401

    def test_returns_404_for_nonexistent_ticket(self, client, app):
        """PUT on a nonexistent ticket returns 404."""
        owner = _create_user("Owner", "owner@test.com")
        token = _get_token(app, owner)

        resp = client.put(
            "/tickets/999",
            json={"status": "COMPLETED"},
            headers=_auth_header(token),
        )
        assert resp.status_code == 404
        assert resp.get_json()["error"] == "Ticket not found."

    def test_returns_403_for_non_owner(self, client, app):
        """Non-creator cannot update a ticket (403)."""
        owner = _create_user("Owner", "owner@test.com")
        member = _create_user("Member", "member@test.com")
        team = _create_team("Team", owner)
        _add_team_member(team, member)

        ticket = Ticket(
            title="Test",
            description="Desc",
            priority=Priority.HIGH,
            status=Status.PENDING,
            team_id=team.id,
            creator_id=owner.id,
        )
        db.session.add(ticket)
        db.session.commit()

        # Member tries to update
        token = _get_token(app, member)
        resp = client.put(
            f"/tickets/{ticket.id}",
            json={"status": "COMPLETED"},
            headers=_auth_header(token),
        )
        assert resp.status_code == 403
        assert "permission" in resp.get_json()["error"].lower()

    def test_updates_status_only(self, client, app):
        """Partial update with just status works (drag-and-drop use case)."""
        owner = _create_user("Owner", "owner@test.com")
        team = _create_team("Team", owner)

        ticket = Ticket(
            title="Original Title",
            description="Original Desc",
            priority=Priority.HIGH,
            status=Status.PENDING,
            team_id=team.id,
            creator_id=owner.id,
        )
        db.session.add(ticket)
        db.session.commit()

        token = _get_token(app, owner)
        resp = client.put(
            f"/tickets/{ticket.id}",
            json={"status": "INPROGRESS"},
            headers=_auth_header(token),
        )

        assert resp.status_code == 200
        data = resp.get_json()
        assert data["status"] == "INPROGRESS"
        # Other fields remain unchanged
        assert data["title"] == "Original Title"
        assert data["description"] == "Original Desc"
        assert data["priority"] == "HIGH"

    def test_updates_all_fields(self, client, app):
        """Full update with all fields works."""
        owner = _create_user("Owner", "owner@test.com")
        member = _create_user("Member", "member@test.com")
        team = _create_team("Team", owner)
        _add_team_member(team, member)

        ticket = Ticket(
            title="Old Title",
            description="Old Desc",
            priority=Priority.LOW,
            status=Status.PENDING,
            team_id=team.id,
            creator_id=owner.id,
        )
        db.session.add(ticket)
        db.session.commit()

        token = _get_token(app, owner)
        payload = {
            "title": "New Title",
            "description": "New Description",
            "priority": "HIGH",
            "status": "COMPLETED",
            "assignee_id": member.id,
        }
        resp = client.put(
            f"/tickets/{ticket.id}",
            json=payload,
            headers=_auth_header(token),
        )

        assert resp.status_code == 200
        data = resp.get_json()
        assert data["title"] == "New Title"
        assert data["description"] == "New Description"
        assert data["priority"] == "HIGH"
        assert data["status"] == "COMPLETED"
        assert data["assignee_id"] == member.id

    def test_rejects_invalid_status(self, client, app):
        """Invalid status value returns 400."""
        owner = _create_user("Owner", "owner@test.com")
        team = _create_team("Team", owner)

        ticket = Ticket(
            title="Test",
            description="Desc",
            priority=Priority.HIGH,
            status=Status.PENDING,
            team_id=team.id,
            creator_id=owner.id,
        )
        db.session.add(ticket)
        db.session.commit()

        token = _get_token(app, owner)
        resp = client.put(
            f"/tickets/{ticket.id}",
            json={"status": "INVALID"},
            headers=_auth_header(token),
        )

        assert resp.status_code == 400
        errors = resp.get_json()["errors"]
        assert "status" in errors

    def test_rejects_invalid_priority(self, client, app):
        """Invalid priority value returns 400."""
        owner = _create_user("Owner", "owner@test.com")
        team = _create_team("Team", owner)

        ticket = Ticket(
            title="Test",
            description="Desc",
            priority=Priority.HIGH,
            status=Status.PENDING,
            team_id=team.id,
            creator_id=owner.id,
        )
        db.session.add(ticket)
        db.session.commit()

        token = _get_token(app, owner)
        resp = client.put(
            f"/tickets/{ticket.id}",
            json={"priority": "CRITICAL"},
            headers=_auth_header(token),
        )

        assert resp.status_code == 400
        errors = resp.get_json()["errors"]
        assert "priority" in errors

    def test_rejects_assignee_not_in_team(self, client, app):
        """Assignee who is not a team member returns 400."""
        owner = _create_user("Owner", "owner@test.com")
        outsider = _create_user("Outsider", "outsider@test.com")
        team = _create_team("Team", owner)

        ticket = Ticket(
            title="Test",
            description="Desc",
            priority=Priority.HIGH,
            status=Status.PENDING,
            team_id=team.id,
            creator_id=owner.id,
        )
        db.session.add(ticket)
        db.session.commit()

        token = _get_token(app, owner)
        resp = client.put(
            f"/tickets/{ticket.id}",
            json={"assignee_id": outsider.id},
            headers=_auth_header(token),
        )

        assert resp.status_code == 400
        errors = resp.get_json()["errors"]
        assert "assignee_id" in errors

    def test_rejects_empty_title(self, client, app):
        """Empty title in update returns 400."""
        owner = _create_user("Owner", "owner@test.com")
        team = _create_team("Team", owner)

        ticket = Ticket(
            title="Test",
            description="Desc",
            priority=Priority.HIGH,
            status=Status.PENDING,
            team_id=team.id,
            creator_id=owner.id,
        )
        db.session.add(ticket)
        db.session.commit()

        token = _get_token(app, owner)
        resp = client.put(
            f"/tickets/{ticket.id}",
            json={"title": ""},
            headers=_auth_header(token),
        )

        assert resp.status_code == 400
        errors = resp.get_json()["errors"]
        assert "title" in errors

    def test_allows_null_assignee_id(self, client, app):
        """Setting assignee_id to null (unassign) is valid."""
        owner = _create_user("Owner", "owner@test.com")
        member = _create_user("Member", "member@test.com")
        team = _create_team("Team", owner)
        _add_team_member(team, member)

        ticket = Ticket(
            title="Test",
            description="Desc",
            priority=Priority.HIGH,
            status=Status.PENDING,
            team_id=team.id,
            creator_id=owner.id,
            assignee_id=member.id,
        )
        db.session.add(ticket)
        db.session.commit()

        token = _get_token(app, owner)
        resp = client.put(
            f"/tickets/{ticket.id}",
            json={"assignee_id": None},
            headers=_auth_header(token),
        )

        assert resp.status_code == 200
        data = resp.get_json()
        assert data["assignee_id"] is None


# --------------------------------------------------------------------------- #
# DELETE /tickets/<id>
# --------------------------------------------------------------------------- #


class TestDeleteTicket:
    """Tests for DELETE /tickets/<id> endpoint."""

    def test_requires_auth(self, client):
        """DELETE /tickets/1 without a token returns 401."""
        resp = client.delete("/tickets/1")
        assert resp.status_code == 401

    def test_returns_404_for_nonexistent_ticket(self, client, app):
        """DELETE on a nonexistent ticket returns 404."""
        owner = _create_user("Owner", "owner@test.com")
        token = _get_token(app, owner)

        resp = client.delete("/tickets/999", headers=_auth_header(token))
        assert resp.status_code == 404
        assert resp.get_json()["error"] == "Ticket not found."

    def test_returns_403_for_non_owner(self, client, app):
        """Non-creator cannot delete a ticket (403)."""
        owner = _create_user("Owner", "owner@test.com")
        member = _create_user("Member", "member@test.com")
        team = _create_team("Team", owner)
        _add_team_member(team, member)

        ticket = Ticket(
            title="Test",
            description="Desc",
            priority=Priority.HIGH,
            status=Status.PENDING,
            team_id=team.id,
            creator_id=owner.id,
        )
        db.session.add(ticket)
        db.session.commit()

        # Member tries to delete
        token = _get_token(app, member)
        resp = client.delete(
            f"/tickets/{ticket.id}",
            headers=_auth_header(token),
        )
        assert resp.status_code == 403
        assert "permission" in resp.get_json()["error"].lower()

    def test_deletes_ticket_successfully(self, client, app):
        """Owner can delete their ticket, returns 200 with success message."""
        owner = _create_user("Owner", "owner@test.com")
        team = _create_team("Team", owner)

        ticket = Ticket(
            title="To Delete",
            description="Will be deleted",
            priority=Priority.LOW,
            status=Status.PENDING,
            team_id=team.id,
            creator_id=owner.id,
        )
        db.session.add(ticket)
        db.session.commit()
        ticket_id = ticket.id

        token = _get_token(app, owner)
        resp = client.delete(
            f"/tickets/{ticket_id}",
            headers=_auth_header(token),
        )

        assert resp.status_code == 200
        data = resp.get_json()
        assert data["message"] == f"Ticket {ticket_id} deleted successfully."

        # Verify ticket is actually gone
        assert db.session.get(Ticket, ticket_id) is None


# --------------------------------------------------------------------------- #
# GET /tickets/members
# --------------------------------------------------------------------------- #


class TestGetTeamMembers:
    """Tests for GET /tickets/members endpoint."""

    def test_requires_auth(self, client):
        """GET /tickets/members without a token returns 401."""
        resp = client.get("/tickets/members")
        assert resp.status_code == 401

    def test_returns_empty_list_for_no_team_user(self, client, app):
        """User with no team gets empty list."""
        loner = _create_user("Loner", "loner@test.com")
        token = _get_token(app, loner)

        resp = client.get("/tickets/members", headers=_auth_header(token))
        assert resp.status_code == 200
        assert resp.get_json() == []

    def test_returns_owner_and_members(self, client, app):
        """Returns both team owner and team members."""
        owner = _create_user("Owner", "owner@test.com")
        member1 = _create_user("Member One", "m1@test.com")
        member2 = _create_user("Member Two", "m2@test.com")
        team = _create_team("Team", owner)
        _add_team_member(team, member1)
        _add_team_member(team, member2)

        token = _get_token(app, owner)
        resp = client.get("/tickets/members", headers=_auth_header(token))

        assert resp.status_code == 200
        data = resp.get_json()
        assert len(data) == 3

        ids = {m["id"] for m in data}
        assert owner.id in ids
        assert member1.id in ids
        assert member2.id in ids

        # Check response shape
        for member in data:
            assert "id" in member
            assert "full_name" in member
            assert "email" in member

    def test_member_sees_same_team_members(self, client, app):
        """A team member (non-owner) also sees the full team."""
        owner = _create_user("Owner", "owner@test.com")
        member = _create_user("Member", "member@test.com")
        team = _create_team("Team", owner)
        _add_team_member(team, member)

        token = _get_token(app, member)
        resp = client.get("/tickets/members", headers=_auth_header(token))

        assert resp.status_code == 200
        data = resp.get_json()
        assert len(data) == 2
        ids = {m["id"] for m in data}
        assert owner.id in ids
        assert member.id in ids

    def test_returns_correct_fields(self, client, app):
        """Each member has id, full_name, and email only."""
        owner = _create_user("John Doe", "john@test.com")
        _create_team("Team", owner)

        token = _get_token(app, owner)
        resp = client.get("/tickets/members", headers=_auth_header(token))

        assert resp.status_code == 200
        data = resp.get_json()
        assert len(data) == 1
        member = data[0]
        assert member["id"] == owner.id
        assert member["full_name"] == "John Doe"
        assert member["email"] == "john@test.com"
        # Should NOT include password or other fields
        assert "password" not in member
        assert "created_at" not in member
