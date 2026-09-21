from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app

client = TestClient(app)


def test_health_without_auth_fails() -> None:
    """Unauthenticated requests must be rejected with HTTP 401."""
    response = client.get("/api/health")
    assert response.status_code == 401
    assert "detail" in response.json()


def test_health_with_invalid_auth_fails() -> None:
    """Requests with incorrect token must be rejected with HTTP 401."""
    response = client.get(
        "/api/health",
        headers={"Authorization": "Bearer invalid_secret_token_123"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid authentication token"


def test_health_with_valid_auth_succeeds() -> None:
    """Authenticated requests must return valid system diagnostics."""
    response = client.get(
        "/api/health",
        headers={"Authorization": f"Bearer {settings.SESSION_TOKEN}"},
    )
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "storyforge-backend"
    assert data["version"] == settings.VERSION
    assert data["uptime_seconds"] >= 0.0

    specs = data["specs"]
    assert len(specs["os"]) > 0
    assert specs["cpu_cores_physical"] >= 1
    assert specs["cpu_cores_logical"] >= 1
    assert specs["ram_total_bytes"] > 0
    assert specs["ram_available_bytes"] > 0
    assert specs["disk_total_bytes"] > 0
    assert specs["disk_free_bytes"] > 0
