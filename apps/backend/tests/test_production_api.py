import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.database import init_database
from app.main import app


@pytest.fixture(autouse=True)
def setup_db():
    init_database()


@pytest.fixture
def client():
    return TestClient(app)


def test_auth_registration_and_login(client: TestClient):
    # Register new user
    reg_payload = {
        "email": "testauthor@example.com",
        "username": "TestAuthor",
        "password": "StrongPassword123!",
    }
    resp = client.post("/api/auth/register", json=reg_payload)
    assert resp.status_code in (201, 400)
    if resp.status_code == 201:
        data = resp.json()
        assert "token" in data
        assert data["user"]["email"] == "testauthor@example.com"

    # Login
    login_payload = {
        "login": "testauthor@example.com",
        "password": "StrongPassword123!",
    }
    resp_login = client.post("/api/auth/login", json=login_payload)
    assert resp_login.status_code == 200
    token = resp_login.json()["token"]

    # Check /api/auth/me
    resp_me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp_me.status_code == 200
    assert resp_me.json()["username"] == "TestAuthor"


def test_project_lifecycle_crud(client: TestClient):
    auth_header = {"Authorization": f"Bearer {settings.SESSION_TOKEN}"}

    # 1. Create project
    create_payload = {
        "title": "The Truth Between Us",
        "language": "en",
        "synopsis": "A dramatic confrontation between Adam and Sara.",
        "background_track": "none",
        "characters": [
            {
                "name": "Adam",
                "role": "Male Lead",
                "voice": "en-US-ChristopherNeural",
                "language": "en",
                "pitch": 1.0,
                "speed": 1.0,
                "style": "Suspense",
            },
            {
                "name": "Sara",
                "role": "Female Lead",
                "voice": "en-US-JennyNeural",
                "language": "en",
                "pitch": 1.0,
                "speed": 1.0,
                "style": "Dramatic",
            },
        ],
        "lines": [
            {
                "speaker": "Adam",
                "voice": "en-US-ChristopherNeural",
                "language": "en",
                "text": "Just tell me the truth, Sara. I already know what happened.",
                "mood": "Suspense",
            },
            {
                "speaker": "Sara",
                "voice": "en-US-JennyNeural",
                "language": "en",
                "text": "You don't know anything. You're just making assumptions.",
                "mood": "Urgent",
            },
        ],
    }

    resp = client.post("/api/projects", json=create_payload, headers=auth_header)
    assert resp.status_code == 201
    proj = resp.json()
    proj_id = proj["id"]
    assert proj["title"] == "The Truth Between Us"
    assert len(proj["characters"]) == 2
    assert len(proj["lines"]) == 2

    # 2. List projects
    resp_list = client.get("/api/projects", headers=auth_header)
    assert resp_list.status_code == 200
    summaries = resp_list.json()
    assert any(s["id"] == proj_id for s in summaries)

    # 3. Get project
    resp_get = client.get(f"/api/projects/{proj_id}", headers=auth_header)
    assert resp_get.status_code == 200
    assert resp_get.json()["id"] == proj_id

    # 4. Update project
    update_payload = {"title": "The Truth Between Us (Remastered)"}
    resp_put = client.put(f"/api/projects/{proj_id}", json=update_payload, headers=auth_header)
    assert resp_put.status_code == 200
    assert resp_put.json()["title"] == "The Truth Between Us (Remastered)"

    # 5. Export Subtitles
    resp_sub = client.post(f"/api/exporter/projects/{proj_id}/subtitles?format=srt", headers=auth_header)
    assert resp_sub.status_code == 200
    assert "Adam" in resp_sub.text
    assert "Sara" in resp_sub.text

    # 6. Delete project
    resp_del = client.delete(f"/api/projects/{proj_id}", headers=auth_header)
    assert resp_del.status_code == 200

    # Verify 404 after deletion
    resp_get2 = client.get(f"/api/projects/{proj_id}", headers=auth_header)
    assert resp_get2.status_code == 404


def test_ai_story_generation(client: TestClient):
    auth_header = {"Authorization": f"Bearer {settings.SESSION_TOKEN}"}
    payload = {
        "prompt": "Two astronauts discover an ancient structure on Mars.",
        "language": "en",
        "genre": "scifi",
    }
    resp = client.post("/api/ai/generate-story", json=payload, headers=auth_header)
    assert resp.status_code == 200
    data = resp.json()
    assert "script" in data
    assert ":" in data["script"]
    assert len(data["script"].splitlines()) >= 3


def test_subtitles_with_measured_timings(client: TestClient):
    auth_header = {"Authorization": f"Bearer {settings.SESSION_TOKEN}"}
    create_payload = {
        "title": "Timing Test",
        "language": "en",
        "lines": [
            {
                "speaker": "SpeakerA",
                "voice": "en-US-ChristopherNeural",
                "language": "en",
                "text": "First line with exact timing.",
                "mood": "Cinematic",
            }
        ],
    }
    resp = client.post("/api/projects", json=create_payload, headers=auth_header)
    assert resp.status_code == 201
    proj_id = resp.json()["id"]
    line_id = resp.json()["lines"][0]["id"]

    timing_payload = {
        "timings": [
            {
                "line_id": line_id,
                "start_seconds": 1.25,
                "end_seconds": 3.75,
            }
        ]
    }

    sub_resp = client.post(
        f"/api/exporter/projects/{proj_id}/subtitles?format=srt",
        json=timing_payload,
        headers=auth_header,
    )
    assert sub_resp.status_code == 200
    assert "00:00:01,250 --> 00:00:03,750" in sub_resp.text

    client.delete(f"/api/projects/{proj_id}", headers=auth_header)

