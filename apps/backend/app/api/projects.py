"""StoryForge Studio — Authoritative Project & Story CRUD API
Complete SQLite persistence for story projects, characters, and dialogue lines.
Includes user data isolation, transaction safety, and duplicate utilities.
"""

from __future__ import annotations

import time
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.security import get_current_user

router = APIRouter(prefix="/projects", tags=["Projects"])


class CharacterSchema(BaseModel):
    id: str | None = None
    name: str = Field(..., min_length=1)
    role: str = "Character"
    voice: str
    language: str = "en"
    pitch: float = 1.0
    speed: float = 1.0
    style: str = "Cinematic"
    sequence_order: int = 0


class LineSchema(BaseModel):
    id: str | None = None
    speaker: str = Field(..., min_length=1)
    voice: str
    language: str = "en"
    text: str = ""
    mood: str = "Cinematic"
    sequence_order: int = 0


class ProjectCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    language: str = "en"
    story_mode: str = "dialogue"
    synopsis: str = ""
    background_track: str = "none"
    music_volume: float = 0.35
    ducking_db: float = -12.0
    characters: list[CharacterSchema] = []
    lines: list[LineSchema] = []


class ProjectUpdateRequest(BaseModel):
    title: str | None = None
    language: str | None = None
    story_mode: str | None = None
    synopsis: str | None = None
    background_track: str | None = None
    music_volume: float | None = None
    ducking_db: float | None = None
    characters: list[CharacterSchema] | None = None
    lines: list[LineSchema] | None = None


class ProjectSummaryResponse(BaseModel):
    id: str
    title: str
    language: str
    story_mode: str = "dialogue"
    synopsis: str
    background_track: str
    word_count: int
    line_count: int
    character_count: int
    created_at: float
    updated_at: float


class ProjectDetailResponse(BaseModel):
    id: str
    title: str
    language: str
    story_mode: str = "dialogue"
    synopsis: str
    background_track: str
    music_volume: float
    ducking_db: float
    created_at: float
    updated_at: float
    characters: list[dict[str, Any]]
    lines: list[dict[str, Any]]


@router.get("", response_model=list[ProjectSummaryResponse])
def list_projects(user: dict[str, Any] = Depends(get_current_user)) -> list[dict[str, Any]]:
    """List all story projects owned by the authenticated user with real database metrics."""
    user_id = user["id"]

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT p.id, p.title, p.language, p.story_mode, p.synopsis, p.background_track,
                   p.created_at, p.updated_at,
                   (SELECT COUNT(*) FROM characters c WHERE c.project_id = p.id) as character_count,
                   (SELECT COUNT(*) FROM lines l WHERE l.project_id = p.id) as line_count
            FROM projects p
            WHERE p.user_id = ?
            ORDER BY p.updated_at DESC;
            """,
            (user_id,),
        )
        rows = cursor.fetchall()

        results = []
        for r in rows:
            # Calculate real word count from database lines
            cursor.execute("SELECT text FROM lines WHERE project_id = ?;", (r["id"],))
            lines_rows = cursor.fetchall()
            word_count = sum(len(lr["text"].split()) for lr in lines_rows)

            results.append(
                {
                    "id": r["id"],
                    "title": r["title"],
                    "language": r["language"],
                    "story_mode": r["story_mode"] or "dialogue",
                    "synopsis": r["synopsis"],
                    "background_track": r["background_track"],
                    "word_count": word_count,
                    "line_count": r["line_count"],
                    "character_count": r["character_count"],
                    "created_at": r["created_at"],
                    "updated_at": r["updated_at"],
                }
            )

        return results


@router.post("", response_model=ProjectDetailResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    req: ProjectCreateRequest, user: dict[str, Any] = Depends(get_current_user)
) -> dict[str, Any]:
    """Create a new story project with character cast and dialogue lines in one transaction."""
    user_id = user["id"]
    proj_id = f"proj-{uuid.uuid4().hex[:12]}"
    now = time.time()

    with get_db() as conn:
        cursor = conn.cursor()

        # 1. Insert Project Header
        cursor.execute(
            """
            INSERT INTO projects (id, user_id, title, language, story_mode, synopsis, background_track, music_volume, ducking_db, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """,
            (
                proj_id,
                user_id,
                req.title.strip(),
                req.language,
                req.story_mode,
                req.synopsis.strip(),
                req.background_track,
                req.music_volume,
                req.ducking_db,
                now,
                now,
            ),
        )

        # 2. Insert Characters
        char_results = []
        for idx, char in enumerate(req.characters):
            char_id = f"char-{uuid.uuid4().hex[:10]}"
            cursor.execute(
                """
                INSERT OR REPLACE INTO characters (id, project_id, name, role, voice, language, pitch, speed, style, sequence_order)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                """,
                (
                    char_id,
                    proj_id,
                    char.name.strip(),
                    char.role,
                    char.voice,
                    char.language,
                    char.pitch,
                    char.speed,
                    char.style,
                    idx,
                ),
            )
            char_results.append(
                {
                    "id": char_id,
                    "name": char.name.strip(),
                    "role": char.role,
                    "voice": char.voice,
                    "language": char.language,
                    "pitch": char.pitch,
                    "speed": char.speed,
                    "style": char.style,
                    "sequence_order": idx,
                }
            )

        # 3. Insert Dialogue Lines
        line_results = []
        for idx, line in enumerate(req.lines):
            line_id = f"line-{uuid.uuid4().hex[:10]}"
            cursor.execute(
                """
                INSERT OR REPLACE INTO lines (id, project_id, speaker, voice, language, text, mood, sequence_order)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?);
                """,
                (
                    line_id,
                    proj_id,
                    line.speaker.strip(),
                    line.voice,
                    line.language,
                    line.text,
                    line.mood,
                    idx,
                ),
            )
            line_results.append(
                {
                    "id": line_id,
                    "speaker": line.speaker.strip(),
                    "voice": line.voice,
                    "language": line.language,
                    "text": line.text,
                    "mood": line.mood,
                    "sequence_order": idx,
                }
            )

    return {
        "id": proj_id,
        "title": req.title.strip(),
        "language": req.language,
        "story_mode": req.story_mode,
        "synopsis": req.synopsis.strip(),
        "background_track": req.background_track,
        "music_volume": req.music_volume,
        "ducking_db": req.ducking_db,
        "created_at": now,
        "updated_at": now,
        "characters": char_results,
        "lines": line_results,
    }


@router.get("/{project_id}", response_model=ProjectDetailResponse)
def get_project(
    project_id: str, user: dict[str, Any] = Depends(get_current_user)
) -> dict[str, Any]:
    """Retrieve full project details with ordered characters and dialogue lines."""
    user_id = user["id"]

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, title, language, story_mode, synopsis, background_track, music_volume, ducking_db, created_at, updated_at
            FROM projects
            WHERE id = ? AND user_id = ?;
            """,
            (project_id, user_id),
        )
        proj = cursor.fetchone()
        if not proj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found or you do not have permission to view it.",
            )

        cursor.execute(
            """
            SELECT id, name, role, voice, language, pitch, speed, style, sequence_order
            FROM characters
            WHERE project_id = ?
            ORDER BY sequence_order ASC;
            """,
            (project_id,),
        )
        characters = [dict(c) for c in cursor.fetchall()]

        cursor.execute(
            """
            SELECT id, speaker, voice, language, text, mood, sequence_order
            FROM lines
            WHERE project_id = ?
            ORDER BY sequence_order ASC;
            """,
            (project_id,),
        )
        lines = [dict(l) for l in cursor.fetchall()]

    return {
        "id": proj["id"],
        "title": proj["title"],
        "language": proj["language"],
        "story_mode": proj["story_mode"] or "dialogue",
        "synopsis": proj["synopsis"],
        "background_track": proj["background_track"],
        "music_volume": proj["music_volume"],
        "ducking_db": proj["ducking_db"],
        "created_at": proj["created_at"],
        "updated_at": proj["updated_at"],
        "characters": characters,
        "lines": lines,
    }


@router.put("/{project_id}", response_model=ProjectDetailResponse)
def update_project(
    project_id: str,
    req: ProjectUpdateRequest,
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """Update project metadata, characters, and dialogue lines in the database."""
    user_id = user["id"]

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id FROM projects WHERE id = ? AND user_id = ?;",
            (project_id, user_id),
        )
        if not cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found or access denied.",
            )

        now = time.time()

        # Update Project fields
        updates = []
        params: list[Any] = []

        if req.title is not None:
            updates.append("title = ?")
            params.append(req.title.strip())
        if req.language is not None:
            updates.append("language = ?")
            params.append(req.language)
        if req.story_mode is not None:
            updates.append("story_mode = ?")
            params.append(req.story_mode)
        if req.synopsis is not None:
            updates.append("synopsis = ?")
            params.append(req.synopsis.strip())
        if req.background_track is not None:
            updates.append("background_track = ?")
            params.append(req.background_track)
        if req.music_volume is not None:
            updates.append("music_volume = ?")
            params.append(req.music_volume)
        if req.ducking_db is not None:
            updates.append("ducking_db = ?")
            params.append(req.ducking_db)

        updates.append("updated_at = ?")
        params.append(now)

        params.extend([project_id, user_id])
        cursor.execute(
            f"UPDATE projects SET {', '.join(updates)} WHERE id = ? AND user_id = ?;",
            params,
        )

        # Sync characters if provided
        if req.characters is not None:
            cursor.execute("DELETE FROM characters WHERE project_id = ?;", (project_id,))
            for idx, char in enumerate(req.characters):
                char_id = char.id or f"char-{uuid.uuid4().hex[:10]}"
                cursor.execute(
                    """
                    INSERT OR REPLACE INTO characters (id, project_id, name, role, voice, language, pitch, speed, style, sequence_order)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                    """,
                    (
                        char_id,
                        project_id,
                        char.name.strip(),
                        char.role,
                        char.voice,
                        char.language,
                        char.pitch,
                        char.speed,
                        char.style,
                        idx,
                    ),
                )

        # Sync lines if provided
        if req.lines is not None:
            cursor.execute("DELETE FROM lines WHERE project_id = ?;", (project_id,))
            for idx, line in enumerate(req.lines):
                line_id = line.id or f"line-{uuid.uuid4().hex[:10]}"
                cursor.execute(
                    """
                    INSERT OR REPLACE INTO lines (id, project_id, speaker, voice, language, text, mood, sequence_order)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?);
                    """,
                    (
                        line_id,
                        project_id,
                        line.speaker.strip(),
                        line.voice,
                        line.language,
                        line.text,
                        line.mood,
                        idx,
                    ),
                )

    return get_project(project_id, user)


@router.delete("/{project_id}", status_code=status.HTTP_200_OK)
def delete_project(
    project_id: str, user: dict[str, Any] = Depends(get_current_user)
) -> dict[str, str]:
    """Permanently delete project and cascade delete characters, lines, and export records."""
    user_id = user["id"]

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id FROM projects WHERE id = ? AND user_id = ?;",
            (project_id, user_id),
        )
        if not cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found or access denied.",
            )

        cursor.execute("DELETE FROM projects WHERE id = ? AND user_id = ?;", (project_id, user_id))

    return {"message": f"Project '{project_id}' deleted successfully."}


@router.post("/{project_id}/duplicate", response_model=ProjectDetailResponse)
def duplicate_project(
    project_id: str, user: dict[str, Any] = Depends(get_current_user)
) -> dict[str, Any]:
    """Clone an existing project into a new one with all characters and lines."""
    orig = get_project(project_id, user)

    create_req = ProjectCreateRequest(
        title=f"{orig['title']} (Copy)",
        language=orig["language"],
        story_mode=orig.get("story_mode", "dialogue"),
        synopsis=orig["synopsis"],
        background_track=orig["background_track"],
        music_volume=orig["music_volume"],
        ducking_db=orig["ducking_db"],
        characters=[CharacterSchema(**c) for c in orig["characters"]],
        lines=[LineSchema(**l) for l in orig["lines"]],
    )

    return create_project(create_req, user)
