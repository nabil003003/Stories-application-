/**
 * StoryForge Studio — Shared TypeScript Definitions
 * Automatically synchronized with Backend Pydantic Schemas
 */

export interface SystemSpecs {
  os: string;
  os_version: string;
  cpu_model: string;
  cpu_cores_physical: number;
  cpu_cores_logical: number;
  ram_total_bytes: number;
  ram_available_bytes: number;
  gpu_available: boolean;
  gpu_name: string | null;
  vram_total_bytes: number | null;
  vram_free_bytes: number | null;
  cuda_available: boolean;
  cuda_version: string | null;
  disk_total_bytes: number;
  disk_free_bytes: number;
}

export interface HealthResponse {
  status: "ok" | "degraded" | "error";
  service: "storyforge-backend";
  version: string;
  uptime_seconds: number;
  specs: SystemSpecs;
}

export interface RuntimeConfig {
  port: number;
  token: string;
  pid: number;
}
