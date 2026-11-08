import hashlib
import hmac
from types import SimpleNamespace

from app.webhooks import worker


class FakeResponse:
    status = 204

    def read(self, _size):
        return b""


class FakeHTTPSConnection:
    def __init__(self):
        self.headers = None

    def request(self, _method, _target, *, body, headers):
        self.body = body
        self.headers = headers

    def getresponse(self):
        return FakeResponse()

    def close(self):
        pass


def test_delivery_sends_bearer_token_and_hmac_signature(monkeypatch):
    connection = FakeHTTPSConnection()
    monkeypatch.setattr(worker, "_public_addresses", lambda _host, _port: ["93.184.216.34"])
    monkeypatch.setattr(
        worker,
        "PinnedHTTPSConnection",
        lambda _host, _port, _address: connection,
    )
    endpoint = SimpleNamespace(
        url="https://hooks.example.com/leadflow",
        secret="signature-secret",
        auth_token="destination-bearer-token",
    )
    delivery = SimpleNamespace(
        payload={"id": "event-1", "type": "task.created"},
        event_type="task.created",
        event_id="event-1",
    )

    status_code, error = worker._deliver(endpoint, delivery)

    expected_signature = hmac.new(
        endpoint.secret.encode(), connection.body, hashlib.sha256
    ).hexdigest()
    assert status_code == 204
    assert error is None
    assert connection.headers["Authorization"] == "Bearer destination-bearer-token"
    assert connection.headers["X-LeadFlow-Signature"] == f"sha256={expected_signature}"
