import json
import os
import socket
import threading
import time
from collections.abc import Iterator
from urllib.error import HTTPError, URLError
from urllib.request import ProxyHandler, Request, build_opener

import pytest
import uvicorn
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

os.environ["DATABASE_URL"] = "sqlite+pysqlite://"
os.environ["JWT_SECRET_KEY"] = "leadflow-test-secret-key-long-enough-for-hs256"

from app.core.database import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Lead, LeadActivity, Task, User  # noqa: E402,F401


class ApiClient:
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.opener = build_opener(ProxyHandler({}))

    def request(self, method: str, path: str, *, json_body=None, headers=None):
        request_headers = dict(headers or {})
        data = None
        if json_body is not None:
            data = json.dumps(json_body).encode("utf-8")
            request_headers["Content-Type"] = "application/json"

        request = Request(
            f"{self.base_url}{path}",
            data=data,
            headers=request_headers,
            method=method,
        )
        try:
            response = self.opener.open(request, timeout=5)
        except HTTPError as error:
            response = error
        except URLError as error:
            raise AssertionError(f"API request failed: {error}") from error

        body = response.read()
        return response.status, json.loads(body) if body else None

    def get(self, path: str, *, headers=None):
        return self.request("GET", path, headers=headers)

    def post(self, path: str, *, json_body=None, headers=None):
        return self.request("POST", path, json_body=json_body, headers=headers)

    def patch(self, path: str, *, json_body=None, headers=None):
        return self.request("PATCH", path, json_body=json_body, headers=headers)


@pytest.fixture
def client() -> Iterator[ApiClient]:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    test_session = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(engine)

    def override_get_db():
        db = test_session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    listener = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    listener.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    listener.bind(("127.0.0.1", 0))
    listener.listen(128)
    server = uvicorn.Server(uvicorn.Config(app, log_level="critical"))
    server_thread = threading.Thread(
        target=lambda: server.run(sockets=[listener]),
        daemon=True,
    )
    server_thread.start()

    try:
        deadline = time.monotonic() + 5
        while not server.started and server_thread.is_alive() and time.monotonic() < deadline:
            time.sleep(0.01)
        if not server.started:
            raise RuntimeError("Test API server did not start")
        yield ApiClient(f"http://127.0.0.1:{listener.getsockname()[1]}")
    finally:
        server.should_exit = True
        server_thread.join(timeout=5)
        listener.close()
        app.dependency_overrides.clear()
        Base.metadata.drop_all(engine)
        engine.dispose()


@pytest.fixture
def register_user():
    def register(client: ApiClient, email: str) -> dict:
        status, response = client.post(
            "/api/v1/auth/register",
            json_body={"email": email, "password": "correct-horse-123"},
        )
        assert status == 200
        return response

    return register


@pytest.fixture
def login_user():
    def login(client: ApiClient, email: str) -> dict[str, str]:
        status, response = client.post(
            "/api/v1/auth/login",
            json_body={"email": email, "password": "correct-horse-123"},
        )
        assert status == 200
        return {"Authorization": f"Bearer {response['access_token']}"}

    return login
