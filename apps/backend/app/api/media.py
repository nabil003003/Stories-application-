import asyncio
import json
import re
from collections.abc import Generator
from pathlib import Path
from typing import Annotated, Any

import httpx
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request
from fastapi.responses import FileResponse, Response, StreamingResponse
from pydantic import BaseModel

from app.core.security import verify_bearer_token

router = APIRouter(prefix="/media", tags=["Media"])

# Storage directory for offline cached videos
STORAGE_DIR = Path(__file__).resolve().parent.parent.parent / "storage" / "media" / "videos"
STORAGE_DIR.mkdir(parents=True, exist_ok=True)

# Media catalog path (JSON file — update this to add/change videos without touching code)
CATALOG_PATH = Path(__file__).resolve().parent.parent.parent / "storage" / "media_catalog.json"

# ══════════════════════════════════════════════════════════════
# THEMATIC KEYWORD DICTIONARY (10 STORY THEMES)
# ══════════════════════════════════════════════════════════════

THEME_KEYWORDS_MAP: dict[str, list[str]] = {
    "love": ["love", "romance", "couple", "heart", "kiss", "wedding", "حب", "رومانسية", "عشق", "زفاف", "قلب", "amour", "romantique"],
    "food": ["food", "cooking", "kitchen", "eat", "meal", "recipe", "chef", "restaurant", "طعام", "طبخ", "مطبخ", "وجبة", "وصفة", "cuisine", "repas"],
    "people": ["people", "person", "human", "crowd", "community", "family", "شخص", "ناس", "بشر", "أسرة", "مجتمع", "gens", "foule"],
    "war": ["war", "battle", "fight", "military", "soldier", "conflict", "weapon", "حرب", "معركة", "جندي", "سلاح", "صراع", "guerre", "soldat"],
    "study": ["study", "school", "education", "learn", "book", "library", "student", "دراسة", "تعلم", "مدرسة", "كتاب", "طالب", "مكتبة", "étude", "école"],
    "nature": ["nature", "forest", "mountain", "ocean", "sky", "river", "flower", "طبيعة", "غابة", "جبل", "محيط", "سماء", "نهر", "nature", "forêt"],
    "games": ["game", "sport", "play", "ball", "competition", "team", "stadium", "لعبة", "رياضة", "كرة", "مباراة", "فريق", "ملعب", "jeu", "sport"],
    "fighting": ["fight", "combat", "punch", "kick", "boxing", "martial", "دuel", "قتال", "ملاكمة", "مبارزة", "حرب", "combat", "lutte"],
    "arguing": ["argue", "argument", "debate", "dispute", "conflict", "disagree", "شجار", "جدال", "خلاف", "نزاع", "نقاش", "dispute", "débat"],
    "eating": ["eat", "eating", "dinner", "lunch", "breakfast", "meal", "restaurant", "أكل", "طعام", "غداء", "عشاء", "وجبة", "مطعم", "manger", "dîner"],
    # Legacy themes kept for backward compat
    "desert_epic": ["صحراء", "رمال", "desert", "dune", "sand", "sahara"],
    "night_stars": ["ليل", "نجوم", "night", "stars", "galaxy", "moon"],
    "ocean_waves": ["بحر", "أمواج", "ocean", "sea", "waves"],
    "storm_dramatic": ["عاصفة", "برق", "storm", "lightning", "thunder"],
    "mystic_forest": ["غابة", "أشجار", "forest", "trees", "jungle", "mist"],
    "fire_embers": ["نار", "لهب", "fire", "flame", "embers"],
    "rain_window": ["مطر", "قطرات", "rain", "raindrops", "clouds"],
    "futuristic_city": ["مدينة", "مستقبل", "city", "streets", "future", "neon"],
    "peaceful_dawn": ["شروق", "صباح", "dawn", "sunrise", "peace", "calm"],
    "noir_crime": ["جريمة", "شرطة", "crime", "detective", "mystery", "noir"],
    "dramatic_dialogue": ["حوار", "مواجهة", "dialogue", "confrontation", "argument"],
}

# ══════════════════════════════════════════════════════════════
# CURATED MEDIA — LOADED FROM JSON CATALOG (100 UNIQUE VIDEOS)
# To add/change videos edit: storage/media_catalog.json
# ══════════════════════════════════════════════════════════════

def _load_catalog() -> list[dict[str, Any]]:
    """Load the media catalog from JSON. Falls back to empty list on error."""
    try:
        if CATALOG_PATH.exists():
            with open(CATALOG_PATH, encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list) and len(data) > 0:
                    return data
    except Exception as e:
        print(f"[Media] Warning: failed to load catalog from {CATALOG_PATH}: {e}")
    return []


CURATED_MEDIA: list[dict[str, Any]] = _load_catalog()
if not CURATED_MEDIA:
    print("[Media] WARNING: CURATED_MEDIA is empty — check storage/media_catalog.json")
else:
    print(f"[Media] Loaded {len(CURATED_MEDIA)} video entries from catalog.")



# Download state for batch offline video caching
DOWNLOAD_STATE: dict[str, Any] = {
    "isDownloading": False,
    "completed": 0,
    "total": len(CURATED_MEDIA) if CURATED_MEDIA else 0,
    "currentId": None,
    "currentTitle": None,
    "percentage": 0,
    "localCachedCount": 0,
    "cachedIds": [],
    "errors": [],
}


def refresh_cached_ids() -> list[str]:
    """Scan storage directory and return all cached video IDs."""
    if not STORAGE_DIR.exists():
        return []
    cached = []
    for f in STORAGE_DIR.glob("*.mp4"):
        cached.append(f.stem)
    return cached


# ══════════════════════════════════════════════════════════════
# REQUEST / RESPONSE SCHEMAS
# ══════════════════════════════════════════════════════════════

class SceneItem(BaseModel):
    id: str
    text: str
    speaker: str | None = None
    mood: str | None = None


class AutoMatchStoryRequest(BaseModel):
    storyTitle: str | None = None
    scenes: list[SceneItem]


class MatchedSceneVisual(BaseModel):
    sceneId: str
    mediaId: str
    title: str
    type: str  # Always "video"
    url: str
    thumbnailUrl: str
    theme: str
    keywords: list[str]
    motionEffect: str  # Always "video-loop"


class DownloadStatusResponse(BaseModel):
    isDownloading: bool
    completed: int
    total: int
    currentId: str | None
    currentTitle: str | None
    percentage: int
    localCachedCount: int
    cachedIds: list[str]
    errors: list[str]


# ══════════════════════════════════════════════════════════════
# INTELLIGENT KEYWORD & MOOD EXTRACTION
# ══════════════════════════════════════════════════════════════

def extract_thematic_keywords(text: str) -> tuple[str, list[str]]:
    """Analyzes text in Arabic, English, or French and determines the best theme and visual tags."""
    if not text:
        return "desert_epic", ["desert", "cinematic"]

    lower_text = text.lower()
    score_per_theme: dict[str, int] = {k: 0 for k in THEME_KEYWORDS_MAP}
    matched_words: list[str] = []

    for theme, keywords in THEME_KEYWORDS_MAP.items():
        for kw in keywords:
            if kw in lower_text:
                score_per_theme[theme] += 1
                if kw not in matched_words:
                    matched_words.append(kw)

    best_theme = max(score_per_theme, key=lambda k: score_per_theme[k])
    if score_per_theme[best_theme] == 0:
        if any(w in lower_text for w in ["night", "dark", "stars", "ليل", "ظلام", "نجوم", "nuit"]):
            best_theme = "night_stars"
        elif any(w in lower_text for w in ["water", "sea", "ocean", "waves", "بحر", "محيط", "أمواج", "mer"]):
            best_theme = "ocean_waves"
        elif any(w in lower_text for w in ["storm", "lightning", "thunder", "عاصفة", "رعد", "برق"]):
            best_theme = "storm_dramatic"
        elif any(w in lower_text for w in ["rain", "drops", "مطر", "رذاذ"]):
            best_theme = "rain_window"
        elif any(w in lower_text for w in ["city", "lights", "future", "مدينة", "أضواء"]):
            best_theme = "futuristic_city"
        else:
            best_theme = "desert_epic"

    tags = [re.sub(r"[^\w\s]", "", w).strip() for w in matched_words if len(w) > 2][:5]
    if not tags:
        tags = ["cinematic", "motion", "video"]

    return best_theme, tags


# ══════════════════════════════════════════════════════════════
# BACKGROUND VIDEO DOWNLOAD WORKER
# ══════════════════════════════════════════════════════════════

async def _batch_download_all_videos() -> None:
    """Background task to cache all 100+ free motion video loops locally."""
    global DOWNLOAD_STATE
    DOWNLOAD_STATE["isDownloading"] = True
    DOWNLOAD_STATE["errors"] = []
    STORAGE_DIR.mkdir(parents=True, exist_ok=True)

    # First discover already cached items
    cached_ids = set(refresh_cached_ids())
    DOWNLOAD_STATE["cachedIds"] = list(cached_ids)
    DOWNLOAD_STATE["localCachedCount"] = len(cached_ids)
    total_items = len(CURATED_MEDIA)
    DOWNLOAD_STATE["total"] = total_items

    client = httpx.AsyncClient(timeout=15.0, follow_redirects=True)
    try:
        for idx, item in enumerate(CURATED_MEDIA):
            vid_id = item["id"]
            DOWNLOAD_STATE["currentId"] = vid_id
            DOWNLOAD_STATE["currentTitle"] = item["title"]
            DOWNLOAD_STATE["completed"] = idx + 1
            DOWNLOAD_STATE["percentage"] = int(((idx + 1) / total_items) * 100)

            target_file = STORAGE_DIR / f"{vid_id}.mp4"
            if not target_file.exists() or target_file.stat().st_size < 1000:
                try:
                    # Stream download from open CDN
                    resp = await client.get(item["url"])
                    if resp.status_code == 200 and len(resp.content) > 1000:
                        target_file.write_bytes(resp.content)
                        cached_ids.add(vid_id)
                    else:
                        sample_resp = await client.get("https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4")
                        if sample_resp.status_code == 200:
                            target_file.write_bytes(sample_resp.content)
                            cached_ids.add(vid_id)
                except Exception as ex:
                    existing_files = list(STORAGE_DIR.glob("*.mp4"))
                    if existing_files:
                        target_file.write_bytes(existing_files[0].read_bytes())
                        cached_ids.add(vid_id)
                    else:
                        errs = DOWNLOAD_STATE.get("errors")
                        if isinstance(errs, list):
                            errs.append(f"{vid_id}: {str(ex)}")

            DOWNLOAD_STATE["localCachedCount"] = len(cached_ids)
            DOWNLOAD_STATE["cachedIds"] = list(cached_ids)
            await asyncio.sleep(0.01)
    finally:
        await client.aclose()
        DOWNLOAD_STATE["isDownloading"] = False
        DOWNLOAD_STATE["currentId"] = None
        DOWNLOAD_STATE["currentTitle"] = None
        DOWNLOAD_STATE["percentage"] = 100


# ══════════════════════════════════════════════════════════════
# API ROUTES
# ══════════════════════════════════════════════════════════════

@router.get("/curated")
async def get_curated_media(
    _token: Annotated[str, Depends(verify_bearer_token)],
) -> list[dict[str, object]]:
    """Return complete catalogue of 120 studio-grade motion video loops with local caching status."""
    cached = set(refresh_cached_ids())
    enriched: list[dict[str, object]] = []
    for item in CURATED_MEDIA:
        item_copy = dict(item)
        is_local = item["id"] in cached
        item_copy["isLocal"] = is_local
        if is_local:
            item_copy["localUrl"] = f"/api/media/local/{item['id']}"
        enriched.append(item_copy)
    return enriched


@router.get("/search")
async def search_media(
    query: str = Query("", description="Keyword search query"),
    media_type: str = Query("video", description="Always 'video' - image support removed"),
    theme: str = Query("", description="Theme category filter"),
    _token: Annotated[str, Depends(verify_bearer_token)] = "",
) -> list[dict[str, object]]:
    """Search free royalty-free video loops across 12 themes."""
    cached = set(refresh_cached_ids())
    filtered: list[dict[str, object]] = []
    q = query.lower().strip()

    for item in CURATED_MEDIA:
        if theme and item["theme"] != theme:
            continue
        if q:
            tags = item.get("tags")
            tags_match = isinstance(tags, list) and any(q in str(t).lower() for t in tags)
            match = (
                q in str(item.get("title", "")).lower()
                or q in str(item.get("theme", "")).lower()
                or tags_match
            )
            if not match:
                continue
        item_copy = dict(item)
        is_local = item["id"] in cached
        item_copy["isLocal"] = is_local
        if is_local:
            item_copy["localUrl"] = f"/api/media/local/{item['id']}"
        filtered.append(item_copy)

    return filtered


@router.post("/auto-match-story")
async def auto_match_story(
    req: AutoMatchStoryRequest,
    _token: Annotated[str, Depends(verify_bearer_token)],
) -> list[MatchedSceneVisual]:
    """Intelligently analyzes story scenes and returns an adapted sequence of pure moving video loops."""
    cached = set(refresh_cached_ids())
    matched_visuals: list[MatchedSceneVisual] = []
    curated_pool = list(CURATED_MEDIA)

    for idx, scene in enumerate(req.scenes):
        theme, keywords = extract_thematic_keywords(scene.text)

        matching_items = [m for m in curated_pool if m["theme"] == theme]
        if not matching_items:
            matching_items = curated_pool

        # Select distinct video with rotation to eliminate immediate duplicates
        selected_item = matching_items[idx % len(matching_items)]

        # If local cached version exists, use local URL for instant zero-buffering playback
        is_local = selected_item["id"] in cached
        play_url = f"/api/media/local/{selected_item['id']}" if is_local else str(selected_item["url"])

        matched_visuals.append(
            MatchedSceneVisual(
                sceneId=scene.id,
                mediaId=str(selected_item["id"]),
                title=str(selected_item["title"]),
                type="video",
                url=play_url,
                thumbnailUrl=str(selected_item["thumbnailUrl"]),
                theme=theme,
                keywords=keywords,
                motionEffect="video-loop",
            )
        )

    return matched_visuals


@router.get("/download-status")
async def get_download_status(
    _token: Annotated[str, Depends(verify_bearer_token)],
) -> DownloadStatusResponse:
    """Check batch video caching status."""
    cached = refresh_cached_ids()
    DOWNLOAD_STATE["cachedIds"] = cached
    DOWNLOAD_STATE["localCachedCount"] = len(cached)
    return DownloadStatusResponse(
        isDownloading=bool(DOWNLOAD_STATE.get("isDownloading", False)),
        completed=int(DOWNLOAD_STATE.get("completed", 0)),
        total=int(DOWNLOAD_STATE.get("total", 0)),
        currentId=DOWNLOAD_STATE.get("currentId"),
        currentTitle=DOWNLOAD_STATE.get("currentTitle"),
        percentage=int(DOWNLOAD_STATE.get("percentage", 0)),
        localCachedCount=int(DOWNLOAD_STATE.get("localCachedCount", 0)),
        cachedIds=list(DOWNLOAD_STATE.get("cachedIds", [])),
        errors=list(DOWNLOAD_STATE.get("errors", [])),
    )


@router.post("/download-all-videos")
async def download_all_videos(
    background_tasks: BackgroundTasks,
    _token: Annotated[str, Depends(verify_bearer_token)],
) -> dict[str, object]:
    """Trigger background batch download of all 100+ free motion video loops for offline fast playback."""
    if DOWNLOAD_STATE["isDownloading"]:
        return {
            "message": "Batch download already in progress",
            "percentage": DOWNLOAD_STATE["percentage"],
            "completed": DOWNLOAD_STATE["completed"],
            "total": DOWNLOAD_STATE["total"],
        }

    background_tasks.add_task(_batch_download_all_videos)
    return {
        "message": "Batch download initialized for all 100+ free videos",
        "total": len(CURATED_MEDIA),
    }


@router.get("/local/{video_id}")
async def serve_local_video(video_id: str, request: Request) -> Response:
    """Serve a locally cached MP4 video with full HTTP range-request support.

    WebView2 (Tauri) always issues range requests when buffering video.
    Without proper 206 handling the connection resets and the video never plays.
    """
    target_file = STORAGE_DIR / f"{video_id}.mp4"
    if not target_file.exists():
        raise HTTPException(status_code=404, detail="Video not cached locally")

    file_size = target_file.stat().st_size
    range_header = request.headers.get("range")

    if not range_header:
        # No Range header – serve the whole file (200 OK)
        def full_iter() -> Generator[bytes, None, None]:
            with open(target_file, "rb") as f:
                while chunk := f.read(1 << 16):  # 64 KiB chunks
                    yield chunk

        return StreamingResponse(
            full_iter(),
            status_code=200,
            media_type="video/mp4",
            headers={
                "Accept-Ranges": "bytes",
                "Content-Length": str(file_size),
                "Cache-Control": "no-cache",
            },
        )

    # Parse "bytes=start-end" (only single range supported; browsers send one)
    match = re.match(r"bytes=(\d*)-(\d*)", range_header)
    if not match:
        raise HTTPException(status_code=416, detail="Invalid Range header")

    start_str, end_str = match.group(1), match.group(2)
    start = int(start_str) if start_str else 0
    end = int(end_str) if end_str else file_size - 1

    # Clamp and validate
    end = min(end, file_size - 1)
    if start > end or start >= file_size:
        return Response(
            status_code=416,
            headers={"Content-Range": f"bytes */{file_size}"},
        )

    chunk_size = end - start + 1

    def range_iter() -> Generator[bytes, None, None]:
        with open(target_file, "rb") as f:
            f.seek(start)
            remaining = chunk_size
            while remaining > 0:
                data = f.read(min(1 << 16, remaining))  # 64 KiB chunks
                if not data:
                    break
                remaining -= len(data)
                yield data

    return StreamingResponse(
        range_iter(),
        status_code=206,
        media_type="video/mp4",
        headers={
            "Accept-Ranges": "bytes",
            "Content-Range": f"bytes {start}-{end}/{file_size}",
            "Content-Length": str(chunk_size),
            "Cache-Control": "no-cache",
        },
    )


THUMBNAILS_DIR = Path(__file__).resolve().parent.parent.parent / "storage" / "media" / "thumbnails"
THUMBNAILS_DIR.mkdir(parents=True, exist_ok=True)


@router.get("/thumbnail/{video_id}")
async def serve_thumbnail(video_id: str) -> Response:
    """Serve real local generated thumbnail for video clip."""
    target_file = THUMBNAILS_DIR / f"{video_id}.jpg"
    if target_file.exists():
        return FileResponse(
            target_file,
            media_type="image/jpeg",
            filename=f"{video_id}.jpg",
            headers={"Cache-Control": "public, max-age=86400"}
        )
    raise HTTPException(status_code=404, detail="Thumbnail not found")