import argparse
import hashlib
import hmac
import http.client
import ipaddress
import json
import logging
import socket
import ssl
import time
from datetime import UTC, datetime, timedelta
from urllib.parse import urlsplit

from sqlalchemy import or_, select

from app.core.database import SessionLocal
from app.models.webhook import WebhookDelivery, WebhookEndpoint

logger = logging.getLogger("leadflow.webhooks")
MAX_ATTEMPTS = 8
DELIVERY_LEASE = timedelta(minutes=2)


class WebhookDeliveryError(RuntimeError):
    def __init__(self, message: str, status_code: int | None = None):
        super().__init__(message)
        self.status_code = status_code


class PinnedHTTPSConnection(http.client.HTTPSConnection):
    def __init__(self, host: str, port: int, ip_address: str):
        super().__init__(host, port, timeout=8, context=ssl.create_default_context())
        self.ip_address = ip_address

    def connect(self):
        raw_socket = socket.create_connection(
            (self.ip_address, self.port), timeout=self.timeout
        )
        self.sock = self._context.wrap_socket(raw_socket, server_hostname=self.host)


def _public_addresses(host: str, port: int) -> list[str]:
    try:
        results = socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
    except socket.gaierror as error:
        raise ValueError("Webhook host could not be resolved") from error

    addresses = list(dict.fromkeys(result[4][0] for result in results))
    if not addresses or any(not ipaddress.ip_address(address).is_global for address in addresses):
        raise ValueError("Webhook host must resolve only to public IP addresses")
    return addresses


def _deliver(endpoint: WebhookEndpoint, delivery: WebhookDelivery) -> tuple[int, str | None]:
    parsed = urlsplit(endpoint.url)
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
        raise ValueError("Webhook URL must be an HTTPS URL without credentials")

    port = parsed.port or 443
    addresses = _public_addresses(parsed.hostname, port)
    body = json.dumps(delivery.payload, separators=(",", ":"), ensure_ascii=False).encode()
    signature = hmac.new(endpoint.secret.encode(), body, hashlib.sha256).hexdigest()
    target = parsed.path or "/"
    if parsed.query:
        target = f"{target}?{parsed.query}"

    last_error = None
    last_status_code = None
    for address in addresses:
        connection = PinnedHTTPSConnection(parsed.hostname, port, address)
        try:
            headers = {
                "Content-Type": "application/json",
                "User-Agent": "LeadFlow-Webhooks/1.0",
                "X-LeadFlow-Event": delivery.event_type,
                "X-LeadFlow-Event-Id": delivery.event_id,
                "X-LeadFlow-Signature": f"sha256={signature}",
            }
            if endpoint.auth_token:
                headers["Authorization"] = f"Bearer {endpoint.auth_token}"

            connection.request(
                "POST",
                target,
                body=body,
                headers=headers,
            )
            response = connection.getresponse()
            response.read(4096)
            if 200 <= response.status < 300:
                return response.status, None
            last_status_code = response.status
            last_error = f"Webhook returned HTTP {response.status}"
        except (OSError, ssl.SSLError, http.client.HTTPException) as error:
            last_error = str(error)[:500]
        finally:
            connection.close()

    raise WebhookDeliveryError(
        last_error or "Webhook delivery failed", status_code=last_status_code
    )


def process_one() -> bool:
    now = datetime.now(UTC)
    with SessionLocal() as db:
        delivery = db.scalar(
            select(WebhookDelivery)
            .where(
                WebhookDelivery.available_at <= now,
                or_(
                    WebhookDelivery.status == "pending",
                    WebhookDelivery.status == "processing",
                ),
            )
            .order_by(WebhookDelivery.available_at, WebhookDelivery.id)
            .with_for_update(skip_locked=True)
            .limit(1)
        )
        if delivery is None:
            return False

        endpoint = db.get(WebhookEndpoint, delivery.endpoint_id)
        if endpoint is not None and not endpoint.enabled:
            delivery.status = "pending"
            delivery.available_at = now + timedelta(minutes=1)
            db.commit()
            logger.info(
                "webhook delivery deferred delivery_id=%s endpoint_id=%s event_type=%s reason=endpoint_paused retry_in_seconds=60",
                delivery.id,
                endpoint.id,
                delivery.event_type,
            )
            return True

        delivery.status = "processing"
        delivery.attempt_count += 1
        delivery.available_at = now + DELIVERY_LEASE
        db.commit()

        if endpoint is None or not endpoint.enabled:
            delivery.status = "failed"
            delivery.last_error = "Webhook endpoint is unavailable"
            db.commit()
            logger.error(
                "webhook delivery failed delivery_id=%s endpoint_id=%s event_type=%s attempt=%s reason=endpoint_unavailable",
                delivery.id,
                delivery.endpoint_id,
                delivery.event_type,
                delivery.attempt_count,
            )
            return True

        try:
            delivery.last_status_code = None
            status_code, _ = _deliver(endpoint, delivery)
            delivery.status = "delivered"
            delivery.last_status_code = status_code
            delivery.last_error = None
            delivery.delivered_at = datetime.now(UTC)
        except Exception as error:
            delivery.last_error = str(error)[:500]
            if isinstance(error, WebhookDeliveryError) and error.status_code:
                delivery.last_status_code = error.status_code
            if delivery.attempt_count >= MAX_ATTEMPTS:
                delivery.status = "failed"
                retry_seconds = None
            else:
                delivery.status = "pending"
                retry_seconds = min(10 * (2 ** (delivery.attempt_count - 1)), 3600)
                delivery.available_at = datetime.now(UTC) + timedelta(seconds=retry_seconds)
            logger.log(
                logging.ERROR if delivery.status == "failed" else logging.WARNING,
                "webhook delivery failed delivery_id=%s endpoint_id=%s event_type=%s attempt=%s outcome=%s http_status=%s retry_in_seconds=%s error_type=%s",
                delivery.id,
                endpoint.id,
                delivery.event_type,
                delivery.attempt_count,
                delivery.status,
                delivery.last_status_code,
                retry_seconds,
                type(error).__name__,
            )

        db.commit()
        if delivery.status == "delivered":
            logger.info(
                "webhook delivery succeeded delivery_id=%s endpoint_id=%s event_type=%s attempt=%s http_status=%s",
                delivery.id,
                endpoint.id,
                delivery.event_type,
                delivery.attempt_count,
                delivery.last_status_code,
            )
    return True


def main() -> None:
    parser = argparse.ArgumentParser(description="Deliver queued LeadFlow webhooks")
    parser.add_argument("--once", action="store_true", help="Process due deliveries and exit")
    parser.add_argument("--poll-seconds", type=float, default=2.0)
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO)
    while True:
        processed = process_one()
        if args.once:
            if not processed:
                return
        elif not processed:
            time.sleep(max(args.poll_seconds, 0.2))


if __name__ == "__main__":
    main()
