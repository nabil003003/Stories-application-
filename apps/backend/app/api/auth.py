"""StoryForge Studio — User Authentication & Session Management Router
Real registration, login, session tokens, and user profile management with SQLite persistence.
"""

from __future__ import annotations

import time
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.security import (
    create_session_token,
    get_current_user,
    hash_password,
    verify_bearer_token,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

SESSION_LIFETIME_SECONDS = 30 * 24 * 3600  # 30 days


class RegisterRequest(BaseModel):
    email: str = Field(..., pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$", max_length=120)
    username: str = Field(..., min_length=2, max_length=50)
    password: str = Field(..., min_length=6, max_length=128)


class LoginRequest(BaseModel):
    login: str = Field(..., description="Email or username")
    password: str = Field(..., min_length=1)


class UserProfileResponse(BaseModel):
    id: str
    email: str
    username: str
    role: str
    created_at: float
    total_projects: int = 0
    total_words: int = 0


class AuthResponse(BaseModel):
    token: str
    user: dict[str, Any]


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(req: RegisterRequest) -> dict[str, Any]:
    """Register a new user account with secure password hashing and session token."""
    email_clean = req.email.strip().lower()
    username_clean = req.username.strip()

    with get_db() as conn:
        cursor = conn.cursor()

        # Check existing email
        cursor.execute("SELECT id FROM users WHERE email = ?;", (email_clean,))
        if cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this email address already exists.",
            )

        # Check existing username
        cursor.execute("SELECT id FROM users WHERE username = ?;", (username_clean,))
        if cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This username is already taken. Please choose another.",
            )

        user_id = f"usr-{uuid.uuid4().hex[:12]}"
        now = time.time()
        pw_hash = hash_password(req.password)

        cursor.execute(
            """
            INSERT INTO users (id, email, username, password_hash, role, created_at, updated_at)
            VALUES (?, ?, ?, ?, 'user', ?, ?);
            """,
            (user_id, email_clean, username_clean, pw_hash, now, now),
        )

        # Generate active session token
        token = create_session_token()
        expires_at = now + SESSION_LIFETIME_SECONDS
        cursor.execute(
            """
            INSERT INTO sessions (token, user_id, expires_at, created_at)
            VALUES (?, ?, ?, ?);
            """,
            (token, user_id, expires_at, now),
        )

    return {
        "token": token,
        "user": {
            "id": user_id,
            "email": email_clean,
            "username": username_clean,
            "role": "user",
            "created_at": now,
        },
    }


@router.post("/login", response_model=AuthResponse)
def login(req: LoginRequest) -> dict[str, Any]:
    """Authenticate with email/username and password, returning an active session token."""
    login_str = req.login.strip().lower()

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, email, username, password_hash, role, created_at FROM users WHERE lower(email) = ? OR lower(username) = ?;",
            (login_str, login_str),
        )
        user_row = cursor.fetchone()

        if not user_row or not verify_password(req.password, user_row["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email/username or password.",
            )

        user_id = user_row["id"]
        now = time.time()
        token = create_session_token()
        expires_at = now + SESSION_LIFETIME_SECONDS

        cursor.execute(
            """
            INSERT INTO sessions (token, user_id, expires_at, created_at)
            VALUES (?, ?, ?, ?);
            """,
            (token, user_id, expires_at, now),
        )

    return {
        "token": token,
        "user": {
            "id": user_row["id"],
            "email": user_row["email"],
            "username": user_row["username"],
            "role": user_row["role"],
            "created_at": user_row["created_at"],
        },
    }


@router.get("/me", response_model=UserProfileResponse)
def get_me(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    """Get profile information and live project statistics for authenticated user."""
    user_id = user["id"]

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as count FROM projects WHERE user_id = ?;", (user_id,))
        total_projects = cursor.fetchone()["count"]

        cursor.execute(
            """
            SELECT l.text
            FROM lines l
            JOIN projects p ON l.project_id = p.id
            WHERE p.user_id = ?;
            """,
            (user_id,),
        )
        lines = cursor.fetchall()
        total_words = sum(len(line["text"].split()) for line in lines)

    return {
        "id": user["id"],
        "email": user["email"],
        "username": user["username"],
        "role": user.get("role", "user"),
        "created_at": user.get("created_at", 0.0),
        "total_projects": total_projects,
        "total_words": total_words,
    }


@router.post("/logout")
def logout(token: str = Depends(verify_bearer_token)) -> dict[str, str]:
    """Revoke and invalidate the active session token."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM sessions WHERE token = ?;", (token,))
    return {"message": "Session terminated successfully."}
