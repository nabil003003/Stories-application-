import { HealthResponse } from "@storyforge/shared-types";

interface BackendConnection {
  baseUrl: string;
  token: string;
}

let connectionCache: BackendConnection | null = null;

export async function resolveBackendConnection(): Promise<BackendConnection> {
  if (connectionCache && connectionCache.token !== "dev-session-token-fallback") {
    return connectionCache;
  }

  // 1. Try Tauri Native IPC first
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const info = await invoke<{ port: number; token: string }>("get_backend_info");
    connectionCache = {
      baseUrl: `http://127.0.0.1:${info.port}`,
      token: info.token,
    };
    return connectionCache;
  } catch {
    // Non-Tauri or browser mode
  }

  // 2. Try fetching static runtime.json from public directory
  try {
    const resp = await fetch("/runtime.json", { cache: "no-store" });
    if (resp.ok) {
      const info = await resp.json();
      if (info && info.port && info.token) {
        connectionCache = {
          baseUrl: `http://127.0.0.1:${info.port}`,
          token: info.token,
        };
        return connectionCache;
      }
    }
  } catch {
    // Ignore fetch error
  }

  // 3. Fallback dev mode
  return {
    baseUrl: "http://127.0.0.1:8000",
    token: "dev-session-token-fallback",
  };
}

export async function fetchHealth(): Promise<HealthResponse> {
  const { baseUrl, token } = await resolveBackendConnection();
  const response = await fetch(`${baseUrl}/api/health`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      connectionCache = null;
    }
    throw new Error(`Failed to query health: HTTP ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as HealthResponse;
}
