from typing import Literal

from pydantic import BaseModel


class SystemSpecs(BaseModel):
    os: str
    os_version: str
    cpu_model: str
    cpu_cores_physical: int
    cpu_cores_logical: int
    ram_total_bytes: int
    ram_available_bytes: int
    gpu_available: bool
    gpu_name: str | None = None
    vram_total_bytes: int | None = None
    vram_free_bytes: int | None = None
    cuda_available: bool
    cuda_version: str | None = None
    disk_total_bytes: int
    disk_free_bytes: int


class HealthResponse(BaseModel):
    status: Literal["ok", "degraded", "error"]
    service: Literal["storyforge-backend"]
    version: str
    uptime_seconds: float
    specs: SystemSpecs
