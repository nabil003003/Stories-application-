/**
 * StoryForge Studio — Production Project & Story API Client
 * Connects frontend to authoritative SQLite backend for real project CRUD,
 * audio master compilation, and subtitle generation.
 */

import { resolveBackendConnection } from "./api";
import { getStoredSession, clearSession } from "./authService";

export interface ProjectCharacter {
  id?: string;
  name: string;
  role: string;
  voice: string;
  language: "en" | "ar" | "fr";
  pitch: number;
  speed: number;
  style: string;
  sequence_order?: number;
}

export interface ProjectLine {
  id?: string;
  speaker: string;
  voice: string;
  language: "en" | "ar" | "fr";
  text: string;
  mood: string;
  sequence_order?: number;
}

export interface ProjectSummary {
  id: string;
  title: string;
  language: string;
  story_mode?: "dialogue" | "story";
  synopsis: string;
  background_track: string;
  word_count: number;
  line_count: number;
  character_count: number;
  created_at: number;
  updated_at: number;
}

export interface ProjectDetail {
  id: string;
  title: string;
  language: "en" | "ar" | "fr";
  story_mode?: "dialogue" | "story";
  synopsis: string;
  background_track: string;
  music_volume: number;
  ducking_db: number;
  created_at: number;
  updated_at: number;
  characters: ProjectCharacter[];
  lines: ProjectLine[];
}

export async function authFetch(endpoint: string, init?: RequestInit): Promise<Response> {
  const { baseUrl, token } = await resolveBackendConnection();
  const fullUrl = endpoint.startsWith("http") ? endpoint : `${baseUrl}${endpoint}`;
  const session = getStoredSession();
  const effectiveToken = session?.token || token;

  const headers = new Headers(init?.headers || {});
  if (!headers.has("Content-Type") && init?.method && init.method !== "GET") {
    headers.set("Content-Type", "application/json");
  }
  headers.set("Authorization", `Bearer ${effectiveToken}`);

  let res = await fetch(fullUrl, { ...init, headers });

  // If 401 Unauthorized, clear stale session and retry with sidecar token
  if (res.status === 401) {
    if (session) {
      clearSession();
    }
    const retryHeaders = new Headers(init?.headers || {});
    if (!retryHeaders.has("Content-Type") && init?.method && init.method !== "GET") {
      retryHeaders.set("Content-Type", "application/json");
    }
    retryHeaders.set("Authorization", `Bearer ${token}`);
    res = await fetch(fullUrl, { ...init, headers: retryHeaders });
  }

  return res;
}

export async function fetchProjectList(): Promise<ProjectSummary[]> {
  const res = await authFetch("/api/projects");
  if (!res.ok) {
    throw new Error(`Failed to list projects (HTTP ${res.status})`);
  }
  return (await res.json()) as ProjectSummary[];
}

export async function fetchProjectDetail(projectId: string): Promise<ProjectDetail> {
  const res = await authFetch(`/api/projects/${projectId}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch project ${projectId} (HTTP ${res.status})`);
  }
  return (await res.json()) as ProjectDetail;
}

export async function createNewProject(payload: {
  title: string;
  language: string;
  story_mode?: "dialogue" | "story";
  synopsis?: string;
  background_track?: string;
  music_volume?: number;
  ducking_db?: number;
  characters?: ProjectCharacter[];
  lines?: ProjectLine[];
}): Promise<ProjectDetail> {
  // Normalize music volume (0.0 to 1.0)
  const vol = payload.music_volume !== undefined
    ? (payload.music_volume > 1 ? payload.music_volume / 100 : payload.music_volume)
    : 0.35;

  const res = await authFetch("/api/projects", {
    method: "POST",
    body: JSON.stringify({
      title: payload.title,
      language: payload.language || "en",
      story_mode: payload.story_mode || "dialogue",
      synopsis: payload.synopsis || "",
      background_track: payload.background_track || "none",
      music_volume: vol,
      ducking_db: payload.ducking_db ?? -12.0,
      characters: payload.characters || [],
      lines: payload.lines || [],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Creation failed." }));
    throw new Error(err.detail || `Create project error (HTTP ${res.status})`);
  }
  return (await res.json()) as ProjectDetail;
}

export async function updateExistingProject(
  projectId: string,
  updates: Partial<ProjectDetail>
): Promise<ProjectDetail> {
  const normalizedUpdates = { ...updates };
  if (normalizedUpdates.music_volume !== undefined && normalizedUpdates.music_volume > 1) {
    normalizedUpdates.music_volume = normalizedUpdates.music_volume / 100;
  }

  const res = await authFetch(`/api/projects/${projectId}`, {
    method: "PUT",
    body: JSON.stringify(normalizedUpdates),
  });

  if (!res.ok) {
    throw new Error(`Failed to update project (HTTP ${res.status})`);
  }
  return (await res.json()) as ProjectDetail;
}

export async function deleteExistingProject(projectId: string): Promise<void> {
  const res = await authFetch(`/api/projects/${projectId}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    throw new Error(`Failed to delete project (HTTP ${res.status})`);
  }
}

/**
 * Trigger real backend Edge-TTS audio master compilation and initiate file download.
 */
export async function downloadProjectAudioMaster(projectId: string, storyTitle: string): Promise<void> {
  const res = await authFetch(`/api/exporter/projects/${projectId}/audio`, {
    method: "POST",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Audio compilation failed." }));
    throw new Error(err.detail || "Failed to generate audio master.");
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${storyTitle.replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, "_")}_AudioMaster.mp3`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

/**
 * Trigger backend mixed audio export (dialogue stitched + background music blended).
 */
export async function downloadProjectMixedAudio(projectId: string, storyTitle: string): Promise<void> {
  const res = await authFetch(`/api/exporter/projects/${projectId}/mixed-audio`, {
    method: "POST",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Mixed audio compilation failed." }));
    throw new Error(err.detail || "Failed to generate mixed audio.");
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${storyTitle.replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, "_")}_Master_Mixed.mp3`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export interface LineTimingPayload {
  line_id: string;
  start_seconds: number;
  end_seconds: number;
}

/**
 * Generate broadcast-grade Subtitles (.srt or .vtt) from backend with optional measured timings.
 */
export async function downloadProjectSubtitles(
  projectId: string,
  format: "srt" | "vtt",
  storyTitle: string,
  timings?: LineTimingPayload[]
): Promise<void> {
  const res = await authFetch(`/api/exporter/projects/${projectId}/subtitles?format=${format}`, {
    method: "POST",
    body: timings && timings.length > 0 ? JSON.stringify({ timings }) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Subtitle generation failed." }));
    throw new Error(err.detail || "Failed to generate subtitles.");
  }

  const text = await res.text();
  const blob = new Blob([text], {
    type: format === "vtt" ? "text/vtt;charset=utf-8" : "application/x-subrip;charset=utf-8",
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${storyTitle.replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, "_")}.${format}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

/**
 * Render and download broadcast production MP4 video from backend.
 * Stitches chosen video clips with equal time division, mixes master audio,
 * burns centered subtitles, and prompts direct file download.
 */
export async function downloadProjectVideo(
  projectId: string,
  storyTitle: string,
  clipIds: string[],
  aspectRatio: string = "9:16",
  burnSubtitles: boolean = true,
  timings?: LineTimingPayload[]
): Promise<void> {
  const res = await authFetch(`/api/exporter/projects/${projectId}/video`, {
    method: "POST",
    body: JSON.stringify({
      clip_ids: clipIds,
      aspect_ratio: aspectRatio,
      burn_subtitles: burnSubtitles,
      timings: timings && timings.length > 0 ? timings : undefined,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Production video render failed." }));
    throw new Error(err.detail || "Failed to render production video.");
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const cleanTitle = (storyTitle || "StoryForge").replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, "_");
  a.download = `${cleanTitle}_Production.mp4`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    try {
      document.body.removeChild(a);
    } catch {
      // ignore
    }
    window.URL.revokeObjectURL(url);
  }, 45000);
}

/**
 * Request AI dialogue screenplay generation from prompt.
 */
export async function generateAiStory(prompt: string, language: string = "en", genre: string = "drama"): Promise<string> {
  const res = await authFetch("/api/ai/generate-story", {
    method: "POST",
    body: JSON.stringify({ prompt, language, genre }),
  });
  if (!res.ok) {
    throw new Error(`AI story generation failed (HTTP ${res.status})`);
  }
  const data = await res.json();
  return data.script || "";
}
