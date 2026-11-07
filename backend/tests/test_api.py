from datetime import UTC, datetime, timedelta


def test_registration_rejects_duplicate_email(client, register_user):
    register_user(client, "ana@example.com")

    status, response = client.post(
        "/api/v1/auth/register",
        json_body={"email": "ana@example.com", "password": "another-password"},
    )

    assert status == 409
    assert response["detail"] == "Email already registered"


def test_login_and_protected_route_require_valid_credentials(client, register_user, login_user):
    register_user(client, "ana@example.com")

    invalid_status, _ = client.post(
        "/api/v1/auth/login",
        json_body={"email": "ana@example.com", "password": "wrong-password"},
    )
    unauthenticated_status, _ = client.get("/api/v1/leads")
    authenticated_status, leads = client.get(
        "/api/v1/leads",
        headers=login_user(client, "ana@example.com"),
    )

    assert invalid_status == 401
    assert unauthenticated_status in (401, 403)
    assert authenticated_status == 200
    assert leads == []


def test_leads_are_isolated_and_status_change_is_recorded(client, register_user, login_user):
    register_user(client, "ana@example.com")
    register_user(client, "bia@example.com")
    ana_headers = login_user(client, "ana@example.com")
    bia_headers = login_user(client, "bia@example.com")

    created_status, created = client.post(
        "/api/v1/leads",
        headers=ana_headers,
        json_body={"name": "Lead da Ana", "source": "Site"},
    )
    hidden_status, _ = client.get(f"/api/v1/leads/{created['id']}", headers=bia_headers)
    changed_status, changed = client.patch(
        f"/api/v1/leads/{created['id']}",
        headers=ana_headers,
        json_body={"status": "WON"},
    )
    activities_status, activities = client.get(
        f"/api/v1/leads/{created['id']}/activities",
        headers=ana_headers,
    )

    assert created_status == 201
    assert hidden_status == 404
    assert changed_status == 200
    assert changed["status"] == "WON"
    assert activities_status == 200
    assert [activity["type"] for activity in activities] == ["STATUS_CHANGE"]


def test_tasks_are_scoped_to_the_owner_and_can_be_completed(client, register_user, login_user):
    register_user(client, "ana@example.com")
    register_user(client, "bia@example.com")
    ana_headers = login_user(client, "ana@example.com")
    bia_headers = login_user(client, "bia@example.com")
    _, lead = client.post(
        "/api/v1/leads",
        headers=ana_headers,
        json_body={"name": "Lead da Ana", "source": "Site"},
    )
    due_at = (datetime.now(UTC) + timedelta(days=1)).isoformat()
    task_status, task = client.post(
        "/api/v1/tasks",
        headers=ana_headers,
        json_body={"lead_id": lead["id"], "title": "  Enviar contrato  ", "due_at": due_at},
    )
    foreign_status, _ = client.post(
        "/api/v1/tasks",
        headers=bia_headers,
        json_body={"lead_id": lead["id"], "title": "Acessar lead alheio", "due_at": due_at},
    )
    hidden_status, _ = client.patch(
        f"/api/v1/tasks/{task['id']}",
        headers=bia_headers,
        json_body={"completed": True},
    )
    completed_status, completed = client.patch(
        f"/api/v1/tasks/{task['id']}",
        headers=ana_headers,
        json_body={"completed": True},
    )

    assert task_status == 201
    assert task["title"] == "Enviar contrato"
    assert foreign_status == 404
    assert hidden_status == 404
    assert completed_status == 200
    assert completed["completed"] is True
