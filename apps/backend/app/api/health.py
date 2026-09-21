import time
from typing import Annotated

from fastapi import APIRouter, Depends

from app.core.config import settings
from app.core.security import verify_bearer_token
from app.schemas.health import HealthResponse
from app.services.system import get_system_specs

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse)
async def health_check(
    _token: Annotated[str, Depends(verify_bearer_token)],
) -> HealthResponse:
    """Return backend status and detected host hardware capabilities."""
    specs = get_system_specs()
    uptime = max(0.0, time.time() - settings.START_TIME)

    return HealthResponse(
        status="ok",
        service="storyforge-backend",
        version=settings.VERSION,
        uptime_seconds=round(uptime, 2),
        specs=specs,
    )
