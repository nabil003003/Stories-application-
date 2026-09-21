import React, { useState } from "react";
import { ShieldCheck, X, RefreshCw } from "lucide-react";
import { useStudioStore } from "../store/useStudioStore";
import { loginUser, registerUser } from "../services/authService";

export function AuthModal(): React.JSX.Element | null {
  const authModalOpen = useStudioStore((s) => s.authModalOpen);
  const setAuthModalOpen = useStudioStore((s) => s.setAuthModalOpen);
  const setCurrentUser = useStudioStore((s) => s.setCurrentUser);

  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authLoginInput, setAuthLoginInput] = useState("");
  const [authUsernameInput, setAuthUsernameInput] = useState("");
  const [authPasswordInput, setAuthPasswordInput] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  if (!authModalOpen) return null;

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    try {
      if (authMode === "login") {
        const session = await loginUser(authLoginInput, authPasswordInput);
        setCurrentUser(session.user);
        setAuthModalOpen(false);
      } else {
        const session = await registerUser(authLoginInput, authUsernameInput, authPasswordInput);
        setCurrentUser(session.user);
        setAuthModalOpen(false);
      }
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : "Authentication error");
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 animate-fade-in"
      style={{ background: "rgba(0,0,0,0.78)", backdropFilter: "blur(8px)" }}
    >
      <div
        className="w-full max-w-md p-6 space-y-5 rounded-2xl animate-scale-in"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        <div className="flex items-center justify-between pb-3" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <div className="flex items-center space-x-2 font-bold" style={{ color: "var(--fg-primary)" }}>
            <ShieldCheck className="w-4 h-4" style={{ color: "var(--gold)" }} />
            <span>{authMode === "login" ? "Creator Sign In" : "Register Account"}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setAuthModalOpen(false);
              setAuthError(null);
            }}
            className="p-1 rounded-lg transition-colors duration-200 cursor-pointer"
            style={{ color: "var(--fg-muted)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {authError && (
          <div
            className="p-3 rounded-xl text-[12px] animate-fade-in"
            style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#b91c1c" }}
          >
            {authError}
          </div>
        )}

        <form onSubmit={handleAuthSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[12px] font-bold" style={{ color: "var(--fg-primary)" }}>
              {authMode === "login" ? "Email or Username" : "Email Address"}
            </label>
            <input
              type="text"
              required
              value={authLoginInput}
              onChange={(e) => setAuthLoginInput(e.target.value)}
              placeholder={authMode === "login" ? "creator@storyforge.local" : "you@example.com"}
              className="w-full rounded-lg p-2.5 text-[13px] outline-none"
              style={{
                background: "var(--bg-elevated)",
                color: "var(--fg-primary)",
                border: "1px solid var(--border-subtle)",
              }}
            />
          </div>

          {authMode === "register" && (
            <div className="space-y-1.5">
              <label className="text-[12px] font-bold" style={{ color: "var(--fg-primary)" }}>
                Username
              </label>
              <input
                type="text"
                required
                value={authUsernameInput}
                onChange={(e) => setAuthUsernameInput(e.target.value)}
                placeholder="creator"
                className="w-full rounded-lg p-2.5 text-[13px] outline-none"
                style={{
                  background: "var(--bg-elevated)",
                  color: "var(--fg-primary)",
                  border: "1px solid var(--border-subtle)",
                }}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[12px] font-bold" style={{ color: "var(--fg-primary)" }}>
              Password
            </label>
            <input
              type="password"
              required
              value={authPasswordInput}
              onChange={(e) => setAuthPasswordInput(e.target.value)}
              placeholder="••••••••••••"
              className="w-full rounded-lg p-2.5 text-[13px] outline-none"
              style={{
                background: "var(--bg-elevated)",
                color: "var(--fg-primary)",
                border: "1px solid var(--border-subtle)",
              }}
            />
          </div>

          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setAuthMode(authMode === "login" ? "register" : "login");
                setAuthError(null);
              }}
              className="text-[12px] underline transition-colors cursor-pointer"
              style={{ color: "var(--gold)" }}
            >
              {authMode === "login" ? "Need an account? Register" : "Already registered? Sign In"}
            </button>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => {
                  setAuthModalOpen(false);
                  setAuthError(null);
                }}
                className="px-3.5 py-2 rounded-lg text-[12px] font-semibold cursor-pointer"
                style={{ background: "var(--bg-elevated)", color: "var(--fg-primary)" }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={authLoading}
                className="px-5 py-2 rounded-lg text-[12px] font-bold transition-all duration-200 active:scale-95 flex items-center space-x-1.5 cursor-pointer text-white"
                style={{ background: "var(--gold)" }}
              >
                {authLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{authMode === "login" ? "Sign In" : "Create Account"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
