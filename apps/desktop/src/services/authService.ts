/**
 * StoryForge Studio — Production User Authentication Service
 * Communicates with backend /api/auth endpoints, manages session tokens, and caches current user.
 */

import { resolveBackendConnection } from "./api";

export interface UserAccount {
  id: string;
  email: string;
  username: string;
  role: string;
  created_at?: number;
  total_projects?: number;
  total_words?: number;
}

export interface AuthSession {
  token: string;
  user: UserAccount;
}

const AUTH_STORAGE_KEY = "storyforge_auth_session";

export function getStoredSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // Ignore
  }
  return null;
}

export function saveSession(session: AuthSession): void {
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Ignore
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // Ignore
  }
}

export async function loginUser(loginStr: string, passwordStr: string): Promise<AuthSession> {
  const { baseUrl } = await resolveBackendConnection();
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login: loginStr, password: passwordStr }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Login failed." }));
    throw new Error(err.detail || `Login error (${res.status})`);
  }

  const data = (await res.json()) as AuthSession;
  saveSession(data);
  return data;
}

export async function registerUser(emailStr: string, usernameStr: string, passwordStr: string): Promise<AuthSession> {
  const { baseUrl } = await resolveBackendConnection();
  const res = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: emailStr, username: usernameStr, password: passwordStr }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Registration failed." }));
    throw new Error(err.detail || `Registration error (${res.status})`);
  }

  const data = (await res.json()) as AuthSession;
  saveSession(data);
  return data;
}

export async function fetchCurrentUser(): Promise<UserAccount | null> {
  try {
    const session = getStoredSession();
    const { baseUrl, token } = await resolveBackendConnection();
    const effectiveToken = session?.token || token;

    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${effectiveToken}` },
    });

    if (res.ok) {
      const user = (await res.json()) as UserAccount;
      if (session) {
        saveSession({ token: session.token, user });
      }
      return user;
    }
  } catch {
    // Ignore fetch error
  }
  return null;
}

export async function logoutUser(): Promise<void> {
  try {
    const session = getStoredSession();
    if (session) {
      const { baseUrl } = await resolveBackendConnection();
      await fetch(`${baseUrl}/api/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.token}` },
      });
    }
  } catch {
    // Ignore
  } finally {
    clearSession();
  }
}
