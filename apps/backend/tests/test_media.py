from fastapi.testclient import TestClient

from app.api.media import extract_thematic_keywords
from app.core.config import settings
from app.main import app

client = TestClient(app)
AUTH_HEADERS = {"Authorization": f"Bearer {settings.SESSION_TOKEN}"}


def test_get_curated_media() -> None:
    response = client.get("/api/media/curated", headers=AUTH_HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 100
    # Strictly pure videos, zero static images
    assert all(item["type"] == "video" for item in data)
    assert any(item["theme"] == "love" for item in data)
    assert any(item["theme"] == "nature" for item in data)
    assert any(item["theme"] == "food" for item in data)


def test_search_media() -> None:
    response = client.get("/api/media/search?query=love", headers=AUTH_HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    for item in data:
        assert item["type"] == "video"


def test_download_status_and_trigger() -> None:
    status_resp = client.get("/api/media/download-status", headers=AUTH_HEADERS)
    assert status_resp.status_code == 200
    status_data = status_resp.json()
    assert "total" in status_data
    assert status_data["total"] >= 100
    assert "isDownloading" in status_data

    trigger_resp = client.post("/api/media/download-all-videos", headers=AUTH_HEADERS)
    assert trigger_resp.status_code == 200
    trigger_data = trigger_resp.json()
    assert "total" in trigger_data or "message" in trigger_data


def test_keyword_extraction_arabic_and_english() -> None:
    # Arabic desert story
    theme_ar, tags_ar = extract_thematic_keywords("في ليلة عاصفة هبّت فيها رياح الصحراء والرمال")
    assert theme_ar in ["desert_epic", "storm_dramatic"]

    # English sea story
    theme_en, _tags_en = extract_thematic_keywords("The wooden ship sailed into the stormy ocean waves at midnight")
    assert theme_en in ["ocean_waves", "storm_dramatic", "night_stars"]


def test_auto_match_story() -> None:
    payload = {
        "storyTitle": "The Secret Vault",
        "scenes": [
            {"id": "s1", "text": "في الصحراء الشاسعة، انطلقت الرحلة."},
            {"id": "s2", "text": "وصلنا إلى أطلال المعبد القديم المجهول."},
            {"id": "s3", "text": "Under the starry night sky, the fire embers glowed."},
        ],
    }
    response = client.post("/api/media/auto-match-story", json=payload, headers=AUTH_HEADERS)
    assert response.status_code == 200
    visuals = response.json()
    assert len(visuals) == 3
    assert visuals[0]["sceneId"] == "s1"
    assert visuals[1]["sceneId"] == "s2"
    assert visuals[2]["sceneId"] == "s3"
    assert all(v["type"] == "video" for v in visuals)
    assert all("url" in v and v["motionEffect"] == "video-loop" for v in visuals)


def test_generate_and_serve_ai_scene() -> None:
    # 1. Generate an AI scene
    resp = client.post(
        "/api/media/generate-scene",
        json={"prompt": "ancient cybernetic temple in rain", "aspect_ratio": "9:16"},
        headers=AUTH_HEADERS,
    )
    assert resp.status_code == 200
    data = resp.json()
    scene_id = data["id"]
    assert scene_id.startswith("scene-ai-")

    # 2. Test serving via /api/media/scene/{scene_id}
    scene_resp = client.get(f"/api/media/scene/{scene_id}")
    assert scene_resp.status_code == 200
    assert "image" in scene_resp.headers.get("content-type", "")

    # 3. Test serving via /api/media/local/{scene_id} (used by VideoPlayer)
    local_resp = client.get(f"/api/media/local/{scene_id}")
    assert local_resp.status_code == 200
    assert "image" in local_resp.headers.get("content-type", "")


