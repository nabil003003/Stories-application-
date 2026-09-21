import { Plus, X, BookOpen, FileText, Loader2, AlertCircle } from "lucide-react";
import { useStudioStore } from "../store/useStudioStore";

interface NewProjectModalProps {
  onCreateProject: () => void;
  isCreating?: boolean;
  errorMessage?: string | null;
}

export function NewProjectModal({ onCreateProject, isCreating, errorMessage }: NewProjectModalProps): React.JSX.Element | null {
  const newProjectModalOpen = useStudioStore((s) => s.newProjectModalOpen);
  const setNewProjectModalOpen = useStudioStore((s) => s.setNewProjectModalOpen);
  const newProjectTitle = useStudioStore((s) => s.newProjectTitle);
  const setNewProjectTitle = useStudioStore((s) => s.setNewProjectTitle);
  const newProjectLang = useStudioStore((s) => s.newProjectLang);
  const setNewProjectLang = useStudioStore((s) => s.setNewProjectLang);
  const newProjectMode = useStudioStore((s) => s.newProjectMode);
  const setNewProjectMode = useStudioStore((s) => s.setNewProjectMode);
  const videoAspectRatio = useStudioStore((s) => s.videoAspectRatio);
  const setVideoAspectRatio = useStudioStore((s) => s.setVideoAspectRatio);

  if (!newProjectModalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 animate-fade-in"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
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
            <Plus className="w-4 h-4" style={{ color: "var(--gold)" }} />
            <span>New Project</span>
          </div>
          <button
            type="button"
            onClick={() => setNewProjectModalOpen(false)}
            className="p-1 rounded-lg transition-colors duration-200 cursor-pointer"
            style={{ color: "var(--fg-muted)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[13px] font-bold" style={{ color: "var(--fg-primary)" }}>
              Production Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                id="new-project-mode-story"
                onClick={() => setNewProjectMode("story")}
                className="p-3 rounded-xl text-left transition-all duration-200 cursor-pointer"
                style={{
                  background: newProjectMode === "story" ? "var(--green-soft)" : "var(--bg-elevated)",
                  border: newProjectMode === "story" ? "2px solid var(--green)" : "1px solid var(--border-subtle)",
                  color: newProjectMode === "story" ? "var(--green)" : "var(--fg-secondary)",
                }}
              >
                <div className="flex items-center space-x-2 font-bold text-[13px]">
                  <BookOpen className="w-4 h-4" />
                  <span>Story Narration</span>
                </div>
                <div className="text-[11px] mt-1 text-stone-500">
                  Solo Story, Lore, Bedtime Tale & Audiobook
                </div>
              </button>

              <button
                type="button"
                id="new-project-mode-dialogue"
                onClick={() => setNewProjectMode("dialogue")}
                className="p-3 rounded-xl text-left transition-all duration-200 cursor-pointer"
                style={{
                  background: newProjectMode === "dialogue" ? "var(--gold-soft)" : "var(--bg-elevated)",
                  border: newProjectMode === "dialogue" ? "2px solid var(--gold)" : "1px solid var(--border-subtle)",
                  color: newProjectMode === "dialogue" ? "var(--gold)" : "var(--fg-secondary)",
                }}
              >
                <div className="flex items-center space-x-2 font-bold text-[13px]">
                  <FileText className="w-4 h-4" />
                  <span>Dramatic Dialogue</span>
                </div>
                <div className="text-[11px] mt-1 text-stone-500">
                  Multi-Actor Screenplay, Drama & Arguments
                </div>
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-bold" style={{ color: "var(--fg-primary)" }}>
              Title
            </label>
            <input
              id="new-project-title"
              type="text"
              value={newProjectTitle}
              onChange={(e) => setNewProjectTitle(e.target.value)}
              placeholder={
                newProjectMode === "story"
                  ? "e.g. The Whispering Coast, سر واحة النخيل..."
                  : "e.g. The Truth Between Us, سر القلعة..."
              }
              className="w-full rounded-lg p-2.5 text-[13px] outline-none"
              style={{
                background: "var(--bg-elevated)",
                color: "var(--fg-primary)",
                border: "1px solid var(--border-subtle)",
              }}
            />
            <div className="flex flex-wrap gap-1 pt-1">
              <span className="text-[10px] text-stone-500 mr-1 self-center">Presets:</span>
              {(newProjectMode === "story"
                ? ["The Whispering Coast", "سر واحة النخيل", "Le Dernier Gardien du Phare", "Echoes of the Cosmos"]
                : ["The Truth Between Us", "The Midnight Confession", "سر القلعة العتيقة", "Protocol Zero"]
              ).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setNewProjectTitle(preset)}
                  className="text-[10px] px-2 py-0.5 rounded transition-colors cursor-pointer"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--fg-secondary)",
                  }}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-bold" style={{ color: "var(--fg-primary)" }}>
              Language
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "ar" as const, label: "Arabic" },
                { id: "en" as const, label: "English" },
                { id: "fr" as const, label: "Français" },
              ].map((lang) => (
                <button
                  key={lang.id}
                  type="button"
                  onClick={() => setNewProjectLang(lang.id)}
                  className="p-2.5 rounded-lg text-[13px] text-center transition-all duration-200 cursor-pointer"
                  style={{
                    background: newProjectLang === lang.id ? "var(--gold-soft)" : "var(--bg-elevated)",
                    color: newProjectLang === lang.id ? "var(--gold)" : "var(--fg-muted)",
                    border: newProjectLang === lang.id ? "1px solid rgba(212,168,50,0.3)" : "1px solid var(--border-subtle)",
                    fontWeight: newProjectLang === lang.id ? 700 : 500,
                  }}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          {/* Target Video Form: TikTok (9:16) vs Landscape (16:9) */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-bold" style={{ color: "var(--fg-primary)" }}>
              Video Format / Template
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                id="modal-format-tiktok"
                onClick={() => setVideoAspectRatio("9:16")}
                className="p-2.5 rounded-xl text-left transition-all duration-200 cursor-pointer"
                style={{
                  background: videoAspectRatio === "9:16" ? "var(--gold-soft)" : "var(--bg-elevated)",
                  border: videoAspectRatio === "9:16" ? "2px solid var(--gold)" : "1px solid var(--border-subtle)",
                  color: videoAspectRatio === "9:16" ? "var(--gold)" : "var(--fg-secondary)",
                }}
              >
                <div className="font-bold text-[12px] flex items-center space-x-1.5">
                  <span>📱</span>
                  <span>TikTok / Reels (9:16)</span>
                </div>
                <div className="text-[10px] text-stone-500 mt-0.5">
                  Viral vertical video with centered punchy captions
                </div>
              </button>

              <button
                type="button"
                id="modal-format-widescreen"
                onClick={() => setVideoAspectRatio("16:9")}
                className="p-2.5 rounded-xl text-left transition-all duration-200 cursor-pointer"
                style={{
                  background: videoAspectRatio === "16:9" ? "var(--gold-soft)" : "var(--bg-elevated)",
                  border: videoAspectRatio === "16:9" ? "2px solid var(--gold)" : "1px solid var(--border-subtle)",
                  color: videoAspectRatio === "16:9" ? "var(--gold)" : "var(--fg-secondary)",
                }}
              >
                <div className="font-bold text-[12px] flex items-center space-x-1.5">
                  <span>🖥️</span>
                  <span>Landscape (16:9)</span>
                </div>
                <div className="text-[10px] text-stone-500 mt-0.5">
                  YouTube & widescreen cinema layout
                </div>
              </button>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-[12px] flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="pt-2 flex justify-end space-x-2">
          <button
            type="button"
            onClick={() => setNewProjectModalOpen(false)}
            disabled={isCreating}
            className="px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors duration-200 cursor-pointer"
            style={{ color: "var(--fg-muted)" }}
          >
            Cancel
          </button>
          <button
            type="button"
            id="create-project-btn"
            onClick={onCreateProject}
            disabled={!newProjectTitle.trim() || isCreating}
            className="px-5 py-2 rounded-lg text-[13px] font-bold text-white transition-all duration-200 active:scale-[0.98] cursor-pointer flex items-center space-x-2"
            style={{
              background: newProjectMode === "story" ? "var(--green)" : "var(--gold)",
              opacity: newProjectTitle.trim() && !isCreating ? 1 : 0.5,
            }}
          >
            {isCreating && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{isCreating ? "Creating..." : "Create Project"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
