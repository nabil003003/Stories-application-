import React, { useEffect } from "react";
import { FolderGit2, Plus, ChevronRight, Trash2, Loader2, BookOpen } from "lucide-react";
import { useStudioStore } from "../store/useStudioStore";
import {
  fetchProjectList,
  fetchProjectDetail,
  deleteExistingProject,
} from "../services/projectService";

interface ProjectsPanelProps {
  onNewProjectClick: () => void;
}

export function ProjectsPanel({ onNewProjectClick }: ProjectsPanelProps): React.JSX.Element {
  const primaryLang = useStudioStore((s) => s.primaryLang);
  const savedDbProjects = useStudioStore((s) => s.savedDbProjects);
  const setSavedDbProjects = useStudioStore((s) => s.setSavedDbProjects);
  const isLoadingDbProjects = useStudioStore((s) => s.isLoadingDbProjects);
  const setIsLoadingDbProjects = useStudioStore((s) => s.setIsLoadingDbProjects);
  const setActiveProjectId = useStudioStore((s) => s.setActiveProjectId);
  const setStoryTitle = useStudioStore((s) => s.setStoryTitle);
  const setStorySynopsis = useStudioStore((s) => s.setStorySynopsis);
  const setStoryMode = useStudioStore((s) => s.setStoryMode);
  const setPrimaryLang = useStudioStore((s) => s.setPrimaryLang);
  const setBackgroundTrack = useStudioStore((s) => s.setBackgroundTrack);
  const setMusicVolume = useStudioStore((s) => s.setMusicVolume);
  const setLines = useStudioStore((s) => s.setLines);
  const setCharacters = useStudioStore((s) => s.setCharacters);
  const setCurrentView = useStudioStore((s) => s.setCurrentView);
  const setStudioStep = useStudioStore((s) => s.setStudioStep);

  const loadProjects = async () => {
    setIsLoadingDbProjects(true);
    try {
      const list = await fetchProjectList();
      setSavedDbProjects(list);
    } catch (err) {
      console.warn("Failed to load projects:", err);
    } finally {
      setIsLoadingDbProjects(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleOpenProject = async (projectId: string) => {
    try {
      const detail = await fetchProjectDetail(projectId);
      setActiveProjectId(detail.id);
      setStoryTitle(detail.title);
      setStorySynopsis(detail.synopsis || "");
      setStoryMode(detail.story_mode || "dialogue");
      setPrimaryLang(detail.language as "en" | "ar" | "fr");
      setBackgroundTrack(detail.background_track || "beethoven_moonlight.ogg");
      setMusicVolume(detail.music_volume ?? 30);

      if (detail.characters && detail.characters.length > 0) {
        setCharacters(
          detail.characters.map((c, i) => ({
            id: c.id || `c-${i}`,
            name: c.name,
            role: c.role,
            voice: c.voice,
            language: c.language,
            pitch: c.pitch,
            speed: c.speed,
            style: c.style,
          }))
        );
      }

      if (detail.lines && detail.lines.length > 0) {
        setLines(
          detail.lines.map((l, i) => ({
            id: l.id || `line-${i}`,
            speaker: l.speaker,
            voice: l.voice,
            language: l.language,
            mood: l.mood || "Cinematic",
            text: l.text,
          }))
        );
      }

      setCurrentView("studio");
      setStudioStep("script");
    } catch (err) {
      console.warn("Failed to open project:", err);
    }
  };

  const handleDelete = async (projectId: string) => {
    if (!confirm("Are you sure you want to delete this project?")) return;
    try {
      await deleteExistingProject(projectId);
      await loadProjects();
    } catch (err) {
      console.warn("Failed to delete project:", err);
    }
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto max-w-5xl mx-auto w-full space-y-6 animate-fade-in">
      <div className="flex items-center justify-between pb-4" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <div>
          <div className="flex items-center space-x-2">
            <FolderGit2 className="w-5 h-5" style={{ color: "var(--gold)" }} />
            <h2 className="text-lg font-bold" style={{ color: "var(--fg-primary)" }}>
              {primaryLang === "ar" ? "المشاريع المحفوظة" : "Saved Production Projects"}
            </h2>
          </div>
          <p className="text-[13px] mt-0.5" style={{ color: "var(--fg-secondary)" }}>
            Authoritative SQLite persistent database records with dialogue casting and audio settings.
          </p>
        </div>

        <button
          type="button"
          onClick={onNewProjectClick}
          className="px-4 py-2 rounded-lg text-[13px] font-bold flex items-center space-x-2 transition-all duration-200 active:scale-95 text-white cursor-pointer"
          style={{ background: "var(--gold)" }}
        >
          <Plus className="w-4 h-4" />
          <span>{primaryLang === "ar" ? "مشروع جديد" : "New Project"}</span>
        </button>
      </div>

      {isLoadingDbProjects ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--gold)" }} />
          <span className="text-[13px]" style={{ color: "var(--fg-muted)" }}>
            Loading database projects...
          </span>
        </div>
      ) : savedDbProjects.length === 0 ? (
        <div
          className="py-16 text-center rounded-2xl p-8 space-y-3"
          style={{ background: "var(--bg-surface)", border: "1px dashed var(--border-subtle)" }}
        >
          <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center" style={{ background: "var(--bg-elevated)", color: "var(--gold)" }}>
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="font-bold text-[15px]" style={{ color: "var(--fg-primary)" }}>
            No Saved Projects Found
          </div>
          <p className="text-[13px] max-w-sm mx-auto" style={{ color: "var(--fg-muted)" }}>
            Create your first story narration or screenplay to save it to your local SQLite database.
          </p>
          <button
            type="button"
            onClick={onNewProjectClick}
            className="px-4 py-2 rounded-lg text-[12px] font-bold text-white cursor-pointer"
            style={{ background: "var(--gold)" }}
          >
            Create New Project
          </button>
        </div>
      ) : (
        <div className="space-y-3 stagger-children">
          {savedDbProjects.map((p) => (
            <div
              key={p.id}
              onClick={() => handleOpenProject(p.id)}
              className="p-4 rounded-xl transition-all duration-200 flex items-center justify-between cursor-pointer animate-slide-up"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-[14px]" style={{ color: "var(--fg-primary)" }}>
                    {p.title}
                  </span>
                  <span
                    className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                    style={{
                      background: p.story_mode === "story" ? "var(--green-soft)" : "var(--gold-soft)",
                      color: p.story_mode === "story" ? "var(--green)" : "var(--gold)",
                      border: "1px solid rgba(143,105,27,0.2)",
                    }}
                  >
                    {p.story_mode === "story" ? "Solo Story" : "Dialogue"}
                  </span>
                  <span
                    className="text-[10px] font-mono px-2 py-0.5 rounded"
                    style={{ background: "var(--bg-elevated)", color: "var(--fg-secondary)" }}
                  >
                    {p.language.toUpperCase()}
                  </span>
                </div>

                <div className="text-[12px] flex items-center space-x-3" style={{ color: "var(--fg-muted)" }}>
                  <span>{p.line_count} lines</span>
                  <span>•</span>
                  <span>{p.character_count} characters</span>
                  <span>•</span>
                  <span>{p.word_count} words</span>
                  <span>•</span>
                  <span>{new Date(p.updated_at * 1000).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => handleOpenProject(p.id)}
                  className="px-3.5 py-1.5 rounded-lg text-[12px] font-bold transition-all cursor-pointer"
                  style={{ background: "var(--gold-soft)", color: "var(--gold)" }}
                >
                  Open in Studio
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(p.id)}
                  className="p-2 rounded-lg text-stone-400 hover:text-red-500 transition-colors cursor-pointer"
                  title="Delete project"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <ChevronRight className="w-4 h-4" style={{ color: "var(--fg-muted)" }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
