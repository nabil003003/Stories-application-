"""StoryForge Studio — Production Audio & Subtitle Exporter
Synthesizes and stitches actual audio master files (.mp3) from dialogue lines,
generates compliant broadcast-grade Subtitles (.srt and .vtt),
and records persistent export history in SQLite database.
"""

from __future__ import annotations

import asyncio
import io
import os
import re
import subprocess
import time
import uuid
from pathlib import Path
from typing import Any
import math

import edge_tts
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel
from pydub import AudioSegment
import imageio_ffmpeg

try:
    AudioSegment.converter = imageio_ffmpeg.get_ffmpeg_exe()
except Exception:
    pass

from app.core.database import get_db
from app.core.security import get_current_user
from app.api.tts import resolve_voice_and_acoustics, preprocess_emotional_text

router = APIRouter(prefix="/exporter", tags=["Exporter"])

EXPORTS_DIR = Path(os.getenv("STORYFORGE_EXPORTS_DIR", "storage/exports"))
EXPORTS_DIR.mkdir(parents=True, exist_ok=True)


class LineTimingInput(BaseModel):
    line_id: str
    start_seconds: float
    end_seconds: float


class SubtitleExportPayload(BaseModel):
    timings: list[LineTimingInput] | None = None


class VideoExportPayload(BaseModel):
    clip_ids: list[str] | None = None
    aspect_ratio: str = "9:16"
    resolution: str = "720p"  # "720p" (default fast) or "1080p"
    burn_subtitles: bool = True
    timings: list[LineTimingInput] | None = None


def sanitize_filename(name: str) -> str:
    """Sanitize string for filesystem safety."""
    cleaned = re.sub(r'[\\/*?:"<>|]', "", name).strip()
    return cleaned.replace(" ", "_")[:60] or "story_export"


def format_srt_timestamp(seconds: float) -> str:
    """Format seconds into SRT timestamp: HH:MM:SS,mmm"""
    hrs = int(seconds // 3600)
    mins = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds - int(seconds)) * 1000)
    return f"{hrs:02d}:{mins:02d}:{secs:02d},{millis:03d}"


def format_vtt_timestamp(seconds: float) -> str:
    """Format seconds into WebVTT timestamp: HH:MM:SS.mmm"""
    hrs = int(seconds // 3600)
    mins = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds - int(seconds)) * 1000)
    return f"{hrs:02d}:{mins:02d}:{secs:02d}.{millis:03d}"


class ExportSummaryResponse(BaseModel):
    id: str
    export_type: str
    filename: str
    file_size: int
    duration_seconds: float
    created_at: float
    download_url: str


@router.post("/projects/{project_id}/audio", status_code=status.HTTP_200_OK)
async def export_project_audio(
    project_id: str,
    user: dict[str, Any] = Depends(get_current_user),
) -> Response:
    """Synthesize all story lines sequentially with Edge-TTS, stitch into an MP3 master,

    record export history in SQLite, and return the downloadable audio file.
    """
    user_id = user["id"]

    # 1. Fetch Project & Lines from DB
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, title, language FROM projects WHERE id = ? AND user_id = ?;",
            (project_id, user_id),
        )
        proj = cursor.fetchone()
        if not proj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found or access denied.",
            )

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

    if not lines:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot export empty story. Please add dialogue lines first.",
        )

    # 2. Sequentially synthesize audio for each line
    audio_buffer = io.BytesIO()
    total_duration_estimate = 0.0

    for line in lines:
        text = line["text"].strip()
        if not text:
            continue

        voice = line["voice"] or "en-US-ChristopherNeural"
        mood = line["mood"] or "Cinematic"

        # Conversational Speech Acting Analysis
        text_lower = text.lower()
        has_excl = "!" in text
        has_interrobang = "?!" in text or "!?" in text
        has_ellipsis = "..." in text or "…" in text
        has_cutoff = text.endswith("—") or text.endswith("-")
        words = text.split()

        # Dynamic emotion detection
        is_angry = has_interrobang or (has_excl and len(words) <= 8) or mood.lower() in ("urgent", "heatedargument") or any(k in text_lower for k in ("liar", "truth", "saw", "messages", "hiding", "حقيقة", "كاذب"))
        is_vulnerable = has_ellipsis or mood.lower() in ("emotional", "vulnerableheartbreak", "whisper") or any(k in text_lower for k in ("lonely", "honesty", "deserved", "crying", "tears", "pain", "وحيد", "دموع", "ألم"))
        is_defensive = mood.lower() == "defensivestammer" or any(k in text_lower for k in ("just a friend", "context", "didn't ask", "assumptions", "swear", "صديق", "سوء فهم"))

        if has_cutoff or (is_angry and has_excl):
            rate_str = "+20%"
            pitch_str = "+12Hz"
            volume_str = "+25%"
            pause_sec = 0.06  # snappy interruption
        elif is_angry:
            rate_str = "+16%"
            pitch_str = "+8Hz"
            volume_str = "+20%"
            pause_sec = 0.12
        elif is_vulnerable:
            rate_str = "-14%"
            pitch_str = "-8Hz"
            volume_str = "-20%"
            pause_sec = 0.75  # heavy emotional breathing silence
        elif is_defensive:
            rate_str = "-4%"
            pitch_str = "+5Hz"
            volume_str = "-2%"
            pause_sec = 0.38
        elif mood == "Suspense":
            rate_str = "-10%"
            pitch_str = "-4Hz"
            volume_str = "-5%"
            pause_sec = 0.28
        else:
            jitter = (hash(text) % 7) - 3
            rate_str = f"{'+' if jitter >= 0 else ''}{jitter}%"
            pitch_str = "+0Hz"
            volume_str = "+0%"
            pause_sec = 0.25

        # Enrich acting text with natural actor stammer if defensive
        acting_text = text
        if is_defensive:
            acting_text = acting_text.replace("I- I", "I— I").replace("I-I", "I— I")

        try:
            communicate = edge_tts.Communicate(
                text=acting_text,
                voice=voice,
                rate=rate_str,
                pitch=pitch_str,
                volume=volume_str,
            )
            line_bytes = bytearray()
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    line_bytes.extend(chunk["data"])

            if line_bytes:
                audio_buffer.write(line_bytes)
                # Word-based duration estimate plus dynamic reactive pause
                words_count = len(text.split())
                total_duration_estimate += max(1.0, words_count / 2.8) + pause_sec
        except Exception as e:
            print(f"[Warning] Failed to synthesize line '{line['id']}': {e}")
            continue

    combined_audio = audio_buffer.getvalue()
    if not combined_audio:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="TTS audio synthesis returned no data. Check network connection.",
        )

    # 3. Save to disk in storage/exports
    safe_title = sanitize_filename(proj["title"])
    export_id = f"exp-{uuid.uuid4().hex[:10]}"
    filename = f"{safe_title}_{export_id}.mp3"
    file_path = EXPORTS_DIR / filename
    file_path.write_bytes(combined_audio)

    now = time.time()

    # 4. Record in SQLite Database
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO exports (id, project_id, export_type, filename, file_size, duration_seconds, created_at)
            VALUES (?, ?, 'audio_mp3', ?, ?, ?, ?);
            """,
            (export_id, project_id, filename, len(combined_audio), total_duration_estimate, now),
        )

    headers = {
        "Content-Disposition": f'attachment; filename="{filename}"',
        "Content-Type": "audio/mpeg",
        "X-Export-Id": export_id,
        "X-Duration-Seconds": str(round(total_duration_estimate, 1)),
    }

    return Response(content=combined_audio, media_type="audio/mpeg", headers=headers)


def get_best_video_encoder(ffmpeg_exe: str) -> tuple[str, list[str]]:
    """Probe for GPU hardware acceleration (NVENC, QSV, AMF) or fall back to libx264."""
    for enc, args in [
        ("h264_nvenc", ["-preset", "p4", "-tune", "hq"]),
        ("h264_qsv", ["-preset", "veryfast"]),
        ("h264_amf", ["-quality", "speed"]),
    ]:
        try:
            res = subprocess.run(
                [ffmpeg_exe, "-hide_banner", "-f", "lavfi", "-i", "nullsrc=s=64x64:d=0.1", "-c:v", enc, "-f", "null", "-"],
                capture_output=True,
                timeout=1.5,
            )
            if res.returncode == 0:
                print(f"[Exporter] Detected GPU Hardware Acceleration: {enc}")
                return enc, args
        except Exception:
            continue

    return "libx264", ["-preset", "veryfast"]


async def _synthesize_single_line(line: dict[str, Any], lang: str) -> AudioSegment:
    """Synthesize a single dialogue line with full emotional prosody."""
    text = line.get("text", "").strip()
    if not text:
        return AudioSegment.silent(duration=300)

    voice = line.get("voice")
    mood = line.get("mood") or "Cinematic"

    actual_voice, rate_str, pitch_str, volume_str = resolve_voice_and_acoustics(
        voice, mood, None, None, None, lang
    )
    acting_text = preprocess_emotional_text(text, lang)

    try:
        communicate = edge_tts.Communicate(
            text=acting_text,
            voice=actual_voice,
            rate=rate_str,
            pitch=pitch_str,
            volume=volume_str,
        )
        line_bytes = bytearray()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                line_bytes.extend(chunk["data"])

        if line_bytes:
            ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
            dec = subprocess.run(
                [ffmpeg_exe, "-y", "-i", "pipe:0", "-f", "wav", "pipe:1"],
                input=bytes(line_bytes),
                capture_output=True,
            )
            if dec.returncode == 0 and dec.stdout:
                return AudioSegment.from_wav(io.BytesIO(dec.stdout))
    except Exception as e:
        print(f"[Warning] Failed to synthesize line: {e}")

    words_count = len(text.split())
    return AudioSegment.silent(duration=max(1200, int(words_count * 280)))


async def build_project_master_audio(
    proj: dict[str, Any], lines: list[dict[str, Any]]
) -> tuple[AudioSegment, float]:
    """Synthesize dialogue lines concurrently with full emotion and mix with background music track."""
    lang = proj.get("language", "en")
    valid_lines = [l for l in lines if l.get("text", "").strip()]

    voice_segments: list[AudioSegment] = []
    if valid_lines:
        tasks = [_synthesize_single_line(l, lang) for l in valid_lines]
        segments = await asyncio.gather(*tasks)
        for seg in segments:
            voice_segments.append(seg)
            voice_segments.append(AudioSegment.silent(duration=320))
    else:
        voice_segments.append(AudioSegment.silent(duration=3000))

    full_voice = AudioSegment.empty()
    for s in voice_segments:
        full_voice += s

    track_name = proj.get("background_track", "none")
    music_vol_pct = proj.get("music_volume", 30)

    candidate_audio_dirs = [
        Path("storage/audio"),
        Path("../apps/backend/storage/audio"),
        Path("apps/backend/storage/audio"),
        Path("apps/desktop/public/audio"),
        Path("../desktop/public/audio"),
    ]

    music_file: Path | None = None
    if track_name and track_name != "none":
        for cdir in candidate_audio_dirs:
            p = cdir / track_name
            if p.exists():
                music_file = p
                break

    if music_file and music_file.exists():
        try:
            ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
            dec_music = subprocess.run(
                [ffmpeg_exe, "-y", "-i", str(music_file), "-f", "wav", "pipe:1"],
                capture_output=True,
            )
            if dec_music.returncode == 0 and dec_music.stdout:
                music = AudioSegment.from_wav(io.BytesIO(dec_music.stdout))
            else:
                music = AudioSegment.silent(duration=3000)

            target_duration = len(full_voice) + 1200
            loops = (target_duration // max(1, len(music))) + 2
            looped = (music * loops)[:target_duration]

            vol_fraction = max(0.01, min(1.0, float(music_vol_pct) / 100.0))
            db_adjust = 20.0 * math.log10(vol_fraction)
            looped = looped + db_adjust
            looped = looped.fade_out(1500)

            mixed_audio = looped.overlay(full_voice, position=400)
        except Exception as err:
            print(f"[Warning] Music mixing failed, falling back to pure voice: {err}")
            mixed_audio = full_voice
    else:
        mixed_audio = full_voice

    duration_sec = len(mixed_audio) / 1000.0
    return mixed_audio, duration_sec


@router.post("/projects/{project_id}/mixed-audio", status_code=status.HTTP_200_OK)
async def export_project_mixed_audio(
    project_id: str,
    user: dict[str, Any] = Depends(get_current_user),
) -> Response:
    """Synthesize dialogue lines with Edge-TTS, stitch into master voice track,
    and blend background soundtrack with proper volume ducking and smooth fade-out.
    """
    user_id = user["id"]

    # 1. Fetch Project & Lines from DB
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, title, language, background_track, music_volume FROM projects WHERE id = ? AND user_id = ?;",
            (project_id, user_id),
        )
        proj = cursor.fetchone()
        if not proj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found or access denied.",
            )

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

    if not lines:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot export empty story. Please add dialogue lines first.",
        )

    proj_dict = dict(proj)
    mixed_audio, duration_sec = await build_project_master_audio(proj_dict, lines)

    out_buf = io.BytesIO()
    mixed_audio.export(out_buf, format="mp3", bitrate="192k")
    final_bytes = out_buf.getvalue()

    safe_title = sanitize_filename(proj_dict["title"])
    export_id = f"exp-{uuid.uuid4().hex[:10]}"
    filename = f"{safe_title}_master_mixed_{export_id}.mp3"
    file_path = EXPORTS_DIR / filename
    file_path.write_bytes(final_bytes)

    now = time.time()

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO exports (id, project_id, export_type, filename, file_size, duration_seconds, created_at)
            VALUES (?, ?, 'audio_master_mixed', ?, ?, ?, ?);
            """,
            (export_id, project_id, filename, len(final_bytes), duration_sec, now),
        )

    headers = {
        "Content-Disposition": f'attachment; filename="{filename}"',
        "Content-Type": "audio/mpeg",
        "X-Export-Id": export_id,
        "X-Duration-Seconds": str(round(duration_sec, 1)),
    }

    return Response(content=final_bytes, media_type="audio/mpeg", headers=headers)


@router.post("/projects/{project_id}/subtitles")
def export_project_subtitles(
    project_id: str,
    format: str = Query("srt", pattern="^(srt|vtt)$"),
    payload: SubtitleExportPayload | None = None,
    user: dict[str, Any] = Depends(get_current_user),
) -> Response:
    """Generate broadcast-compliant Subtitle file (.srt or .vtt) with dialogue timings.
    Accepts client-measured actual timestamps if provided, or calculates high-accuracy cadence.
    """
    user_id = user["id"]

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, title FROM projects WHERE id = ? AND user_id = ?;",
            (project_id, user_id),
        )
        proj = cursor.fetchone()
        if not proj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found or access denied.",
            )

        cursor.execute(
            """
            SELECT id, speaker, text
            FROM lines
            WHERE project_id = ?
            ORDER BY sequence_order ASC;
            """,
            (project_id,),
        )
        lines = [dict(l) for l in cursor.fetchall()]

    if not lines:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot export subtitles for empty story.",
        )

    # Build index of measured client timings if provided
    measured_timings: dict[str, LineTimingInput] = {}
    if payload and payload.timings:
        for t in payload.timings:
            measured_timings[t.line_id] = t

    current_time = 0.5  # 500ms initial lead-in
    entries = []

    for idx, line in enumerate(lines, 1):
        text = line["text"].strip()
        if not text:
            continue

        speaker = line["speaker"].strip()
        caption_text = f"[{speaker}]: {text}" if speaker else text

        if line["id"] in measured_timings:
            t = measured_timings[line["id"]]
            start_time = t.start_seconds
            end_time = t.end_seconds
            current_time = max(current_time, end_time)
        else:
            words = len(text.split())
            duration = max(1.8, words / 2.7)
            start_time = current_time
            end_time = current_time + duration
            current_time = end_time + 0.45

        if format == "srt":
            start_str = format_srt_timestamp(start_time)
            end_str = format_srt_timestamp(end_time)
            entries.append(f"{idx}\n{start_str} --> {end_str}\n{caption_text}\n")
        else:
            start_str = format_vtt_timestamp(start_time)
            end_str = format_vtt_timestamp(end_time)
            entries.append(f"{idx}\n{start_str} --> {end_str}\n{caption_text}\n")

    if format == "vtt":
        subtitle_content = "WEBVTT - StoryForge Studio Subtitle Export\n\n" + "\n".join(entries)
        media_type = "text/vtt; charset=utf-8"
        ext = "vtt"
    else:
        subtitle_content = "\n".join(entries)
        media_type = "application/x-subrip; charset=utf-8"
        ext = "srt"

    safe_title = sanitize_filename(proj["title"])
    export_id = f"exp-{uuid.uuid4().hex[:10]}"
    filename = f"{safe_title}_{export_id}.{ext}"

    file_path = EXPORTS_DIR / filename
    file_path.write_text(subtitle_content, encoding="utf-8")

    now = time.time()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO exports (id, project_id, export_type, filename, file_size, duration_seconds, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?);
            """,
            (export_id, project_id, f"subtitles_{ext}", filename, len(subtitle_content.encode("utf-8")), current_time, now),
        )

    headers = {
        "Content-Disposition": f'attachment; filename="{filename}"',
        "Content-Type": media_type,
        "X-Export-Id": export_id,
    }

    return Response(content=subtitle_content, media_type=media_type, headers=headers)


@router.post("/projects/{project_id}/video", status_code=status.HTTP_200_OK)
async def export_project_video(
    project_id: str,
    payload: VideoExportPayload | None = None,
    user: dict[str, Any] = Depends(get_current_user),
) -> Response:
    """Render full production broadcast MP4 video:
    - Master dialogue audio synthesized & mixed with ducked soundtrack.
    - Story narrative duration divided equally across all chosen video clips.
    - Clips loop automatically if shorter than their allocated time slot.
    - Subtitles burned in the middle of frame.
    - Saved to exports storage and database, returned as downloadable MP4.
    """
    user_id = user["id"]

    # 1. Fetch Project & Lines
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, title, language, background_track, music_volume FROM projects WHERE id = ? AND user_id = ?;",
            (project_id, user_id),
        )
        proj = cursor.fetchone()
        if not proj:
            cursor.execute(
                "SELECT id, title, language, background_track, music_volume FROM projects WHERE id = ?;",
                (project_id,),
            )
            proj = cursor.fetchone()
        if not proj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found or access denied.",
            )

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

    if not lines:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot render video for empty story. Please add lines first.",
        )

    proj_dict = dict(proj)

    # 2. Synthesize Master Audio
    mixed_audio, duration_sec = await build_project_master_audio(proj_dict, lines)
    duration_sec = max(2.5, duration_sec)

    export_id = f"exp-{uuid.uuid4().hex[:10]}"
    safe_title = sanitize_filename(proj_dict["title"])
    temp_audio_file = EXPORTS_DIR / f"temp_{export_id}_audio.mp3"
    mixed_audio.export(str(temp_audio_file), format="mp3", bitrate="192k")

    # 3. Resolve Video Clips & AI Scene Images
    candidate_media_dirs = [
        Path(__file__).resolve().parent.parent.parent / "storage" / "media" / "videos",
        Path(__file__).resolve().parent.parent.parent / "storage" / "media" / "scenes",
        Path("storage/media/videos"),
        Path("storage/media/scenes"),
        Path("apps/backend/storage/media/videos"),
        Path("apps/backend/storage/media/scenes"),
        Path("../storage/media/videos"),
        Path("../storage/media/scenes"),
    ]

    requested_clips = [c.strip() for c in (payload.clip_ids if payload and payload.clip_ids else []) if c and c.strip()]
    if not requested_clips:
        requested_clips = [str(l["video_id"]) for l in lines if l.get("video_id")]
    if not requested_clips:
        requested_clips = ["vid-war-01"]

    resolved_clip_paths: list[Path] = []
    for cid in requested_clips:
        found_path: Path | None = None
        for mdir in candidate_media_dirs:
            for ext in [".mp4", ".jpg", ".jpeg", ".png", ".webp"]:
                candidate = mdir / f"{cid}{ext}"
                if candidate.exists() and candidate.stat().st_size > 0:
                    found_path = candidate
                    break
            if found_path:
                break
        if found_path:
            resolved_clip_paths.append(found_path)

    # Fallback to any available clip if specific ones not found
    if not resolved_clip_paths:
        for mdir in candidate_media_dirs:
            if mdir.exists():
                all_vids = list(mdir.glob("*.mp4"))
                if all_vids:
                    resolved_clip_paths = [all_vids[0]]
                    break

    if not resolved_clip_paths:
        if temp_audio_file.exists():
            temp_audio_file.unlink(missing_ok=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No local background videos or scenes available to render.",
        )

    num_clips = len(resolved_clip_paths)
    clip_slot_seconds = duration_sec / num_clips

    # 4. Generate Centered Subtitles File (.srt)
    measured_map = {t.line_id: t for t in payload.timings} if payload and payload.timings else {}
    current_time = 0.4
    srt_lines = []
    for idx, line in enumerate(lines, 1):
        txt = line["text"].strip()
        if not txt:
            continue
        spk = line.get("speaker", "").strip()
        cap = f"[{spk}]: {txt}" if spk else txt

        if line["id"] in measured_map:
            t = measured_map[line["id"]]
            start_s = t.start_seconds
            end_s = t.end_seconds
            current_time = max(current_time, end_s)
        else:
            wcount = len(txt.split())
            dur = max(1.8, wcount / 2.7)
            start_s = current_time
            end_s = current_time + dur
            current_time = end_s + 0.35

        srt_lines.append(f"{idx}\n{format_srt_timestamp(start_s)} --> {format_srt_timestamp(end_s)}\n{cap}\n")

    temp_srt_file = EXPORTS_DIR / f"temp_{export_id}.srt"
    temp_srt_file.write_text("\n".join(srt_lines), encoding="utf-8")

    # 5. Build FFmpeg Assembly Command
    is_16_9 = payload and payload.aspect_ratio == "16:9"
    is_1080p = payload and payload.resolution == "1080p"
    if is_16_9:
        target_w, target_h = (1920, 1080) if is_1080p else (1280, 720)
    else:
        target_w, target_h = (1080, 1920) if is_1080p else (720, 1280)

    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    out_filename = f"{safe_title}_{export_id}.mp4"
    out_file_path = EXPORTS_DIR / out_filename

    filter_chains = []
    for i in range(num_clips):
        filter_chains.append(
            f"[{i}:v]scale={target_w}:{target_h}:force_original_aspect_ratio=increase,crop={target_w}:{target_h},setsar=1,fps=30[v{i}]"
        )
    concat_inputs = "".join(f"[v{i}]" for i in range(num_clips))
    filter_chains.append(f"{concat_inputs}concat=n={num_clips}:v=1:a=0[vraw]")

    clean_srt_path = temp_srt_file.resolve().as_posix().replace(":", r"\:")
    font_size = 28 if is_1080p else 22
    filter_chains_with_sub = list(filter_chains)
    filter_chains_with_sub.append(
        f"[vraw]subtitles='{clean_srt_path}':force_style='Alignment=10,FontSize={font_size},PrimaryColour=&H0000FFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=3,Shadow=1.5,Fontname=Arial,Bold=1'[vout]"
    )

    encoder, encoder_args = get_best_video_encoder(ffmpeg_exe)

    base_cmd = [ffmpeg_exe, "-y"]
    for cp in resolved_clip_paths:
        is_still_image = cp.suffix.lower() in [".jpg", ".jpeg", ".png", ".webp"]
        if is_still_image:
            # Still images require -loop 1 for infinite frames clamped by -t
            base_cmd.extend(["-loop", "1", "-t", f"{clip_slot_seconds:.3f}", "-i", str(cp)])
        else:
            # Video loops use -stream_loop -1
            base_cmd.extend(["-stream_loop", "-1", "-t", f"{clip_slot_seconds:.3f}", "-i", str(cp)])
    base_cmd.extend(["-i", str(temp_audio_file)])

    cmd_with_subtitles = base_cmd + [
        "-filter_complex", ";".join(filter_chains_with_sub),
        "-map", "[vout]",
        "-map", f"{num_clips}:a:0",
        "-c:v", encoder,
    ] + encoder_args + [
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        "-movflags", "+faststart",
        str(out_file_path),
    ]

    # Run FFmpeg rendering
    res = subprocess.run(cmd_with_subtitles, capture_output=True, text=True)
    if res.returncode != 0:
        print(f"[Exporter] Hardware or subtitle burn failed, executing fallback CPU render: {res.stderr[-250:]}")
        cmd_fallback = base_cmd + [
            "-filter_complex", ";".join(filter_chains),
            "-map", "[vraw]",
            "-map", f"{num_clips}:a:0",
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac",
            "-b:a", "192k",
            "-shortest",
            "-movflags", "+faststart",
            str(out_file_path),
        ]
        res_fb = subprocess.run(cmd_fallback, capture_output=True, text=True)
        if res_fb.returncode != 0:
            temp_audio_file.unlink(missing_ok=True)
            temp_srt_file.unlink(missing_ok=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"FFmpeg video render failed: {res_fb.stderr[-300:]}",
            )

    # Clean up temp working files
    temp_audio_file.unlink(missing_ok=True)
    temp_srt_file.unlink(missing_ok=True)

    if not out_file_path.exists() or out_file_path.stat().st_size == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Rendered video file was empty.",
        )

    file_bytes = out_file_path.read_bytes()
    now = time.time()

    # 6. Record in Database
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO exports (id, project_id, export_type, filename, file_size, duration_seconds, created_at)
            VALUES (?, ?, 'video_mp4', ?, ?, ?, ?);
            """,
            (export_id, project_id, out_filename, len(file_bytes), duration_sec, now),
        )

    headers = {
        "Content-Disposition": f'attachment; filename="{out_filename}"',
        "Content-Type": "video/mp4",
        "X-Export-Id": export_id,
        "X-Duration-Seconds": str(round(duration_sec, 1)),
        "X-Clips-Count": str(num_clips),
    }

    return Response(content=file_bytes, media_type="video/mp4", headers=headers)


@router.get("/history", response_model=list[ExportSummaryResponse])
def list_exports(user: dict[str, Any] = Depends(get_current_user)) -> list[dict[str, Any]]:
    """List recent export records created by the user with direct download URLs."""
    user_id = user["id"]

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT e.id, e.export_type, e.filename, e.file_size, e.duration_seconds, e.created_at
            FROM exports e
            JOIN projects p ON e.project_id = p.id
            WHERE p.user_id = ?
            ORDER BY e.created_at DESC
            LIMIT 50;
            """,
            (user_id,),
        )
        rows = cursor.fetchall()

    return [
        {
            "id": r["id"],
            "export_type": r["export_type"],
            "filename": r["filename"],
            "file_size": r["file_size"],
            "duration_seconds": r["duration_seconds"],
            "created_at": r["created_at"],
            "download_url": f"/api/exporter/file/{r['filename']}",
        }
        for r in rows
    ]


@router.get("/file/{filename}")
def download_export_file(
    filename: str, user: dict[str, Any] = Depends(get_current_user)
) -> Response:
    """Download an existing exported video, audio, or subtitle file."""
    # Prevent directory traversal
    clean_name = Path(filename).name
    file_path = EXPORTS_DIR / clean_name

    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exported file not found.",
        )

    content = file_path.read_bytes()
    if clean_name.endswith(".mp4"):
        media_type = "video/mp4"
    elif clean_name.endswith(".mp3"):
        media_type = "audio/mpeg"
    else:
        media_type = "text/plain; charset=utf-8"

    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{clean_name}"'},
    )


@router.post("/open-folder")
def open_exports_folder(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, str]:
    """Open the exports directory in the native desktop file explorer."""
    try:
        if os.name == "nt":
            os.startfile(str(EXPORTS_DIR.resolve()))
        else:
            subprocess.Popen(["xdg-open", str(EXPORTS_DIR.resolve())])
        return {"status": "ok", "path": str(EXPORTS_DIR.resolve())}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to open folder: {e}")


@router.post("/open-file/{filename}")
def open_export_file_in_explorer(filename: str, user: dict[str, Any] = Depends(get_current_user)) -> dict[str, str]:
    """Select and highlight the exported file in Windows Explorer."""
    clean_name = Path(filename).name
    target = EXPORTS_DIR / clean_name
    if not target.exists():
        raise HTTPException(status_code=404, detail="Exported file not found.")

    try:
        if os.name == "nt":
            subprocess.Popen(f'explorer /select,"{target.resolve()}"')
        else:
            subprocess.Popen(["xdg-open", str(target.resolve())])
        return {"status": "ok", "file": str(target.resolve())}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to open file: {e}")

