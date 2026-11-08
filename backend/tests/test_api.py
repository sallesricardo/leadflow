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


def test_webhook_bearer_token_is_write_only(client, register_user, login_user):
    register_user(client, "webhook-owner@example.com")
    headers = login_user(client, "webhook-owner@example.com")
    token = "destination-secret-value"

    created_status, created = client.post(
        "/api/v1/webhooks",
        headers=headers,
        json_body={
            "url": "https://hooks.example.com/leadflow",
            "events": ["lead.created", "task.created"],
            "auth_token": token,
        },
    )
    listed_status, listed = client.get("/api/v1/webhooks", headers=headers)
    updated_status, updated = client.patch(
        f"/api/v1/webhooks/{created['id']}",
        headers=headers,
        json_body={"auth_token": None},
    )

    assert created_status == 201
    assert created["has_auth_token"] is True
    assert created["secret"]
    assert token not in str(created)
    assert "auth_token" not in created
    assert listed_status == 200
    assert listed[0]["has_auth_token"] is True
    assert token not in str(listed)
    assert updated_status == 200
    assert updated["has_auth_token"] is False


def test_webhook_delivery_summary_is_scoped_to_the_authenticated_user(
    client,
    register_user,
    login_user,
):
    register_user(client, "webhook-summary-owner@example.com")
    register_user(client, "webhook-summary-other@example.com")
    owner_headers = login_user(client, "webhook-summary-owner@example.com")
    other_headers = login_user(client, "webhook-summary-other@example.com")
    endpoint_status, endpoint = client.post(
        "/api/v1/webhooks",
        headers=owner_headers,
        json_body={
            "url": "https://hooks.example.com/summary",
            "events": ["lead.created"],
        },
    )
    lead_status, _ = client.post(
        "/api/v1/leads",
        headers=owner_headers,
        json_body={"name": "Lead com entrega pendente"},
    )

    owner_status, owner_summary = client.get(
        "/api/v1/webhooks/summary",
        headers=owner_headers,
    )
    other_status, other_summary = client.get(
        "/api/v1/webhooks/summary",
        headers=other_headers,
    )
    unauthenticated_status, _ = client.get("/api/v1/webhooks/summary")

    assert endpoint_status == 201
    assert lead_status == 201
    assert owner_status == 200
    assert owner_summary["pending"] == 1
    assert owner_summary["paused_pending"] == 0
    assert owner_summary["processing"] == 0
    assert owner_summary["delivered"] == 0
    assert owner_summary["failed"] == 0
    assert owner_summary["total"] == 1
    assert owner_summary["oldest_pending_at"] is not None
    assert owner_summary["oldest_due_pending_at"] is not None
    assert owner_summary["stale_pending"] is False
    assert owner_summary["latest_delivery_at"] is not None
    assert set(owner_summary) == {
        "pending",
        "paused_pending",
        "processing",
        "delivered",
        "failed",
        "total",
        "oldest_pending_at",
        "oldest_due_pending_at",
        "stale_pending",
        "latest_delivery_at",
        "worker_active",
        "worker_last_heartbeat_at",
    }
    assert owner_summary["worker_active"] is False
    assert owner_summary["worker_last_heartbeat_at"] is None
    assert other_status == 200
    assert other_summary["total"] == 0
    assert other_summary["latest_delivery_at"] is None
    assert unauthenticated_status in (401, 403)

    paused_status, _ = client.patch(
        f"/api/v1/webhooks/{endpoint['id']}",
        headers=owner_headers,
        json_body={"enabled": False},
    )
    _, paused_summary = client.get(
        "/api/v1/webhooks/summary",
        headers=owner_headers,
    )
    assert paused_status == 200
    assert paused_summary["pending"] == 1
    assert paused_summary["paused_pending"] == 1
    assert paused_summary["oldest_due_pending_at"] is None
    assert paused_summary["stale_pending"] is False


def test_status_automation_creates_task_and_webhook_events(
    client,
    register_user,
    login_user,
):
    register_user(client, "automation-owner@example.com")
    headers = login_user(client, "automation-owner@example.com")
    _, endpoint = client.post(
        "/api/v1/webhooks",
        headers=headers,
        json_body={
            "url": "https://hooks.example.com/tasks",
            "events": ["lead.status_changed", "task.created", "task.completed"],
        },
    )
    rule_status, rule = client.post(
        "/api/v1/automations",
        headers=headers,
        json_body={
            "name": "Acompanhar qualificados",
            "trigger_status": "QUALIFIED",
            "task_title": "Enviar proposta",
            "task_description": "Preparar proposta comercial",
            "due_in_days": 2,
        },
    )
    _, lead = client.post(
        "/api/v1/leads",
        headers=headers,
        json_body={"name": "Lead qualificado"},
    )
    changed_status, changed = client.patch(
        f"/api/v1/leads/{lead['id']}",
        headers=headers,
        json_body={"status": "QUALIFIED"},
    )
    tasks_status, tasks = client.get("/api/v1/tasks", headers=headers)
    deliveries_status, deliveries = client.get(
        f"/api/v1/webhooks/{endpoint['id']}/deliveries",
        headers=headers,
    )

    assert rule_status == 201
    assert rule["enabled"] is True
    assert changed_status == 200
    assert changed["status"] == "QUALIFIED"
    assert tasks_status == 200
    assert len(tasks) == 1
    assert tasks[0]["lead_id"] == lead["id"]
    assert tasks[0]["title"] == "Enviar proposta"
    assert deliveries_status == 200
    assert {item["event_type"] for item in deliveries} == {
        "lead.status_changed",
        "task.created",
    }

    completed_status, completed = client.patch(
        f"/api/v1/tasks/{tasks[0]['id']}",
        headers=headers,
        json_body={"completed": True},
    )
    _, refreshed_deliveries = client.get(
        f"/api/v1/webhooks/{endpoint['id']}/deliveries",
        headers=headers,
    )
    assert completed_status == 200
    assert completed["completed"] is True
    assert "task.completed" in {item["event_type"] for item in refreshed_deliveries}
