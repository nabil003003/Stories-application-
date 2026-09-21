import contextlib
import json
import os
from collections.abc import AsyncGenerator
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import api_router
from app.core.config import settings
from app.core.database import init_database


@contextlib.asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Manage application startup and shutdown lifecycle."""
    # 1. Initialize SQLite persistence engine
    init_database()

    # 2. Write runtime connection details for Tauri supervisor
    runtime_info = {
        "port": settings.PORT,
        "token": settings.SESSION_TOKEN,
        "pid": os.getpid(),
    }
    try:
        settings.RUNTIME_FILE.write_text(json.dumps(runtime_info, indent=2))
        public_runtime = Path("../desktop/public/runtime.json")
        if public_runtime.parent.exists():
            public_runtime.write_text(json.dumps(runtime_info, indent=2))
    except OSError as e:
        print(f"[Warning] Failed to write runtime file {settings.RUNTIME_FILE}: {e}")

    yield

    # Clean up lockfile on shutdown
    if settings.RUNTIME_FILE.exists():
        with contextlib.suppress(OSError):
            settings.RUNTIME_FILE.unlink()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url=f"{settings.API_PREFIX}/docs",
    openapi_url=f"{settings.API_PREFIX}/openapi.json",
)

# Permit localhost webview origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:1420",
        "http://127.0.0.1:1420",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "tauri://localhost",
        "http://tauri.localhost",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_PREFIX)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True,
        log_level="info",
    )
