from fastapi import APIRouter

from app.api.ai import router as ai_router
from app.api.auth import router as auth_router
from app.api.exporter import router as exporter_router
from app.api.health import router as health_router
from app.api.media import router as media_router
from app.api.projects import router as projects_router
from app.api.tts import router as tts_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(auth_router)
api_router.include_router(projects_router)
api_router.include_router(exporter_router)
api_router.include_router(tts_router)
api_router.include_router(media_router)
api_router.include_router(ai_router)

__all__ = ["api_router"]
