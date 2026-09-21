"""StoryForge Studio — Authoritative SQLite Database Layer
Thread-safe, relational persistence for users, sessions, projects, characters, dialogue lines, and exports.
Uses WAL mode, foreign keys, and parameterized queries for full SQL injection protection.
"""

from __future__ import annotations

import os
import sqlite3
import time
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Generator

# Database file location: in app data / local storage directory
DB_DIR = Path(os.getenv("STORYFORGE_DATA_DIR", "storage"))
DB_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = DB_DIR / "storyforge.sqlite"


def get_connection() -> sqlite3.Connection:
    """Create and configure a SQLite connection with WAL mode and foreign keys."""
    conn = sqlite3.connect(str(DB_PATH), timeout=20.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    conn.execute("PRAGMA busy_timeout=5000;")
    return conn


@contextmanager
def get_db() -> Generator[sqlite3.Connection, None, None]:
    """Context manager for database connections with automatic commit/rollback."""
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_database() -> None:
    """Initialize database tables and indexes."""
    with get_db() as conn:
        cursor = conn.cursor()

        # 1. Users Table
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'user',
                created_at REAL NOT NULL,
                updated_at REAL NOT NULL
            );
            """
        )

        # 2. Sessions Table
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS sessions (
                token TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                expires_at REAL NOT NULL,
                created_at REAL NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            """
        )

        # 3. Projects Table
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                title TEXT NOT NULL,
                language TEXT NOT NULL DEFAULT 'en',
                story_mode TEXT NOT NULL DEFAULT 'dialogue',
                synopsis TEXT NOT NULL DEFAULT '',
                background_track TEXT NOT NULL DEFAULT 'none',
                music_volume REAL NOT NULL DEFAULT 0.35,
                ducking_db REAL NOT NULL DEFAULT -12.0,
                created_at REAL NOT NULL,
                updated_at REAL NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            """
        )

        # Migration: ensure story_mode column exists on projects
        try:
            cursor.execute("ALTER TABLE projects ADD COLUMN story_mode TEXT NOT NULL DEFAULT 'dialogue';")
        except sqlite3.OperationalError:
            pass

        # 4. Characters Table
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS characters (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                name TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'Character',
                voice TEXT NOT NULL,
                language TEXT NOT NULL DEFAULT 'en',
                pitch REAL NOT NULL DEFAULT 1.0,
                speed REAL NOT NULL DEFAULT 1.0,
                style TEXT NOT NULL DEFAULT 'Cinematic',
                sequence_order INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
            );
            """
        )

        # 5. Dialogue Lines Table
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS lines (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                speaker TEXT NOT NULL,
                voice TEXT NOT NULL,
                language TEXT NOT NULL DEFAULT 'en',
                text TEXT NOT NULL DEFAULT '',
                mood TEXT NOT NULL DEFAULT 'Cinematic',
                sequence_order INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
            );
            """
        )

        # 6. Exports Table
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS exports (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                export_type TEXT NOT NULL, -- 'audio_mp3', 'subtitles_srt', 'subtitles_vtt'
                filename TEXT NOT NULL,
                file_size INTEGER NOT NULL,
                duration_seconds REAL NOT NULL DEFAULT 0.0,
                created_at REAL NOT NULL,
                FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
            );
            """
        )

        # Indexes for fast querying
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_characters_project_id ON characters(project_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_lines_project_id ON lines(project_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);")

        # Seed default local user account if no users exist
        cursor.execute("SELECT COUNT(*) as count FROM users;")
        user_count = cursor.fetchone()["count"]
        if user_count == 0:
            now = time.time()
            from app.core.security import hash_password

            # Default creator user for offline / desktop local operation
            default_password_hash = hash_password("creator123")
            cursor.execute(
                """
                INSERT INTO users (id, email, username, password_hash, role, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?);
                """,
                (
                    "usr-default-creator",
                    "creator@storyforge.local",
                    "Creator",
                    default_password_hash,
                    "admin",
                    now,
                    now,
                ),
            )
            print("[Database] Seeded default creator account: creator@storyforge.local")


# Ensure tables are initialized on startup
init_database()
