import React, { useEffect, useState } from "react";
import {
  FileText,
  User,
  Music,
  Video,
  Play,
  Pause,
  Plus,
  Save,
  Settings,
  Database,
  Mic,
  Check,
  CheckCircle2,
  Search,
  Sparkles,
  Loader2,
} from "lucide-react";
import { useStudioStore } from "./store/useStudioStore";
import { useAutoSave } from "./hooks/useAutoSave";
import { StepScript } from "./components/StepScript";
import { StepCast } from "./components/StepCast";
import { StepSoundtrack } from "./components/StepSoundtrack";
import { StepVideo } from "./components/StepVideo";
import { ProjectsPanel } from "./components/ProjectsPanel";
import { NewProjectModal } from "./components/NewProjectModal";
import { AuthModal } from "./components/AuthModal";
import { audioEngine } from "./services/audioEngine";

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}
import { CATALOG_VOICES } from "./services/voiceCatalog";
import {
  createNewProject,
  updateExistingProject,
  fetchProjectList,
} from "./services/projectService";
import { fetchCurrentUser } from "./services/authService";
import { fetchHealth } from "./services/api";

const WORKFLOW_STEPS = [
  { id: "script" as const, num: "1", title: "Script & Text", titleAr: "النص والحوار", icon: FileText },
  { id: "characters" as const, num: "2", title: "Voices & Cast", titleAr: "الأصوات والشخصيات", icon: User },
  { id: "audio" as const, num: "3", title: "Soundtrack", titleAr: "الموسيقى", icon: Music },
  { id: "video" as const, num: "4", title: "Video & Export", titleAr: "الفيديو والتصدير", icon: Video },
];

export default function App(): React.JSX.Element {
  // Global Store State
  const currentView = useStudioStore((s) => s.currentView);
  const setCurrentView = useStudioStore((s) => s.setCurrentView);
  const studioStep = useStudioStore((s) => s.studioStep);
  const setStudioStep = useStudioStore((s) => s.setStudioStep);

  const activeProjectId = useStudioStore((s) => s.activeProjectId);
  const setActiveProjectId = useStudioStore((s) => s.setActiveProjectId);
  const storyTitle = useStudioStore((s) => s.storyTitle);
  const setStoryTitle = useStudioStore((s) => s.setStoryTitle);
  const storySynopsis = useStudioStore((s) => s.storySynopsis);
  const primaryLang = useStudioStore((s) => s.primaryLang);
  const setPrimaryLang = useStudioStore((s) => s.setPrimaryLang);
  const storyMode = useStudioStore((s) => s.storyMode);
  const setStoryMode = useStudioStore((s) => s.setStoryMode);
  const backgroundTrack = useStudioStore((s) => s.backgroundTrack);
  const musicVolume = useStudioStore((s) => s.musicVolume);
  const lines = useStudioStore((s) => s.lines);
  const setLines = useStudioStore((s) => s.setLines);
  const characters = useStudioStore((s) => s.characters);
  const setCharacters = useStudioStore((s) => s.setCharacters);

  const isPlaying = useStudioStore((s) => s.isPlaying);
  const setIsPlaying = useStudioStore((s) => s.setIsPlaying);
  const playingLineId = useStudioStore((s) => s.playingLineId);
  const setPlayingLineId = useStudioStore((s) => s.setPlayingLineId);
  const playbackSeconds = useStudioStore((s) => s.playbackSeconds);
  const setPlaybackSeconds = useStudioStore((s) => s.setPlaybackSeconds);
  const isMusicPlaying = useStudioStore((s) => s.isMusicPlaying);
  const saveStatusMessage = useStudioStore((s) => s.saveStatusMessage);
  const setSaveStatusMessage = useStudioStore((s) => s.setSaveStatusMessage);

  const currentUser = useStudioStore((s) => s.currentUser);
  const setCurrentUser = useStudioStore((s) => s.setCurrentUser);
  const setAuthModalOpen = useStudioStore((s) => s.setAuthModalOpen);
  const setNewProjectModalOpen = useStudioStore((s) => s.setNewProjectModalOpen);
  const newProjectTitle = useStudioStore((s) => s.newProjectTitle);
  const newProjectLang = useStudioStore((s) => s.newProjectLang);
  const newProjectMode = useStudioStore((s) => s.newProjectMode);
  const setSavedDbProjects = useStudioStore((s) => s.setSavedDbProjects);
  const savedDbProjects = useStudioStore((s) => s.savedDbProjects);

  const undo = useStudioStore((s) => s.undo);
  const redo = useStudioStore((s) => s.redo);

  const [systemHealth, setSystemHealth] = useState<{ status: string; port: number; database: string } | null>(null);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [createProjectError, setCreateProjectError] = useState<string | null>(null);
  const [voiceAuditionLang, setVoiceAuditionLang] = useState<"all" | "en" | "ar" | "fr">("all");
  const [voiceAuditionSearch, setVoiceAuditionSearch] = useState("");
  const [auditioningVoiceId, setAuditioningVoiceId] = useState<string | null>(null);
  const updateCharacter = useStudioStore((s) => s.updateCharacter);

  // Fix 6: 30-Second Debounced Autosave Hook
  useAutoSave();

  // Fix 7: Undo / Redo Global Shortcuts (Ctrl+Z / Ctrl+Y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.shiftKey && e.key === "Z"))) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  // Fix 14: Arabic RTL UI Direction Sync
  useEffect(() => {
    document.documentElement.dir = primaryLang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = primaryLang;
  }, [primaryLang]);

  // Startup session & health check
  useEffect(() => {
    fetchCurrentUser().then((u) => {
      if (u) setCurrentUser(u);
    });
    fetchHealth().then((h) => {
      if (h) setSystemHealth({ status: h.status, port: 8000, database: "SQLite 3.x" });
    });
    fetchProjectList().then((list) => {
      if (list) setSavedDbProjects(list);
    });
  }, [setCurrentUser, setSavedDbProjects]);

  // Play Full Story Handler
  const handlePlayFullStory = async () => {
    if (isPlaying) {
      audioEngine.stopSpeech();
      setIsPlaying(false);
      setPlayingLineId(null);
      return;
    }

    setIsPlaying(true);
    setPlaybackSeconds(0);

    if (backgroundTrack !== "none") {
      audioEngine.setMusicVolume(musicVolume / 100);
      audioEngine.playMusic(backgroundTrack);
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      setPlayingLineId(line.id);

      await new Promise<void>((resolve) => {
        audioEngine.speak({
          text: line.text,
          voice: line.voice,
          language: line.language,
          onEnd: () => resolve(),
        });
      });
    }

    setIsPlaying(false);
    setPlayingLineId(null);
  };

  const handleSaveProject = async () => {
    const payload = {
      title: storyTitle,
      language: primaryLang,
      story_mode: storyMode,
      synopsis: storySynopsis,
      background_track: backgroundTrack,
      music_volume: musicVolume,
      lines,
      characters,
    };

    try {
      if (activeProjectId) {
        await updateExistingProject(activeProjectId, payload);
      } else {
        const created = await createNewProject(payload);
        setActiveProjectId(created.id);
      }
      setSaveStatusMessage("Saved to SQLite DB");
      const list = await fetchProjectList();
      setSavedDbProjects(list);
      setTimeout(() => setSaveStatusMessage(null), 3500);
    } catch (err) {
      console.warn("Save project failed:", err);
    }
  };

  const handleCreateProject = async () => {
    setIsCreatingProject(true);
    setCreateProjectError(null);
    const payload = {
      title: newProjectTitle || "Untitled Story",
      language: newProjectLang,
      story_mode: newProjectMode,
      background_track: "beethoven_moonlight.ogg",
      music_volume: 0.30,
      lines: [
        {
          speaker: newProjectMode === "story" ? "Narrator" : "Speaker 1",
          voice: newProjectLang === "ar" ? "ar-SA-HamedNeural" : "en-US-ChristopherNeural",
          language: newProjectLang,
          text:
            newProjectLang === "ar"
              ? "في تلك الليلة الهادئة، بدأت المغامرة الحقيقية..."
              : "On that quiet evening, the true journey began...",
          mood: "Cinematic",
        },
      ],
      characters: [
        {
          name: newProjectMode === "story" ? "Narrator" : "Speaker 1",
          role: "Lead",
          voice: newProjectLang === "ar" ? "ar-SA-HamedNeural" : "en-US-ChristopherNeural",
          language: newProjectLang,
          pitch: 1.0,
          speed: 1.0,
          style: "Cinematic",
        },
      ],
    };

    try {
      const created = await createNewProject(payload);
      setActiveProjectId(created.id);
      setStoryTitle(created.title);
      setPrimaryLang(created.language as "en" | "ar" | "fr");
      setStoryMode(created.story_mode || "story");
      setLines(
        created.lines.map((l, i) => ({
          id: l.id || `line-${i}`,
          speaker: l.speaker,
          voice: l.voice,
          language: l.language,
          mood: l.mood || "Cinematic",
          text: l.text,
        }))
      );
      setCharacters(
        created.characters.map((c, i) => ({
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
      setNewProjectModalOpen(false);
      setCurrentView("studio");
      setStudioStep("script");
      setSaveStatusMessage(`Project "${created.title}" created & saved!`);
      setTimeout(() => setSaveStatusMessage(null), 3500);
      fetchProjectList().then(setSavedDbProjects).catch(() => {});
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create project";
      setCreateProjectError(msg);
      console.warn("Create project error:", err);
    } finally {
      setIsCreatingProject(false);
    }
  };

  return (
    <div
      className="flex h-screen w-screen overflow-hidden studio-layout"
      style={{
        background: "var(--bg-deep)",
        color: "var(--fg-primary)",
        fontFamily: "'Inter', sans-serif",
        fontSize: "14px",
      }}
    >
      {/* ═══════════════════════════════
          SIDEBAR
          ═══════════════════════════════ */}
      <aside
        className="w-60 flex flex-col justify-between shrink-0 left-sidebar"
        style={{ background: "var(--bg-base)", borderRight: "1px solid var(--border-subtle)" }}
      >
        <div>
          {/* Brand */}
          <div
            className="h-14 px-4 flex items-center space-x-3"
            style={{ borderBottom: "1px solid var(--border-subtle)" }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center font-extrabold text-sm"
              style={{
                background: "var(--gold)",
                color: "#ffffff",
                boxShadow: "0 2px 10px rgba(143,105,27,0.25)",
              }}
            >
              SF
            </div>
            <div>
              <div className="font-bold text-sm leading-none" style={{ color: "var(--fg-primary)" }}>
                StoryForge
              </div>
              <div className="text-[10px] mt-0.5 font-semibold tracking-wide" style={{ color: "var(--gold)" }}>
                Studio
              </div>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="p-3 space-y-1">
            {[
              { id: "studio" as const, label: primaryLang === "ar" ? "إنشاء قصة" : "Create Story", icon: FileText },
              {
                id: "voices" as const,
                label:
                  primaryLang === "ar"
                    ? `مكتبة الأصوات (${CATALOG_VOICES.length})`
                    : `Voice Audition (${CATALOG_VOICES.length})`,
                icon: Mic,
              },
              {
                id: "stories" as const,
                label:
                  primaryLang === "ar"
                    ? `المشاريع (${savedDbProjects.length})`
                    : `Projects (${savedDbProjects.length})`,
                icon: Database,
              },
              { id: "settings" as const, label: primaryLang === "ar" ? "النظام والحساب" : "System & Account", icon: Settings },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-${item.id}`}
                  type="button"
                  onClick={() => setCurrentView(item.id)}
                  className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-[13px] transition-all duration-200 cursor-pointer"
                  style={{
                    background: isActive ? "var(--gold-soft)" : "transparent",
                    color: isActive ? "var(--gold-light)" : "var(--fg-secondary)",
                    fontWeight: isActive ? 600 : 500,
                    border: isActive ? "1px solid rgba(143,105,27,0.25)" : "1px solid transparent",
                  }}
                >
                  <Icon className="w-4 h-4" style={{ color: isActive ? "var(--gold)" : "var(--fg-muted)" }} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-3" style={{ borderTop: "1px solid var(--border-subtle)" }}>
          <button
            id="sidebar-new-project"
            type="button"
            onClick={() => setNewProjectModalOpen(true)}
            className="w-full py-2.5 rounded-lg font-bold text-[13px] flex items-center justify-center space-x-1.5 transition-all duration-200 active:scale-[0.98] text-white cursor-pointer"
            style={{
              background: "var(--gold)",
              boxShadow: "0 2px 12px rgba(143,105,27,0.25)",
            }}
          >
            <Plus className="w-4 h-4" />
            <span>{primaryLang === "ar" ? "مشروع جديد" : "New Project"}</span>
          </button>
        </div>
      </aside>

      {/* ═══════════════════════════════
          MAIN WORKSPACE
          ═══════════════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden main-content">
        {/* Top Header Bar */}
        <header
          className="h-14 px-6 flex items-center justify-between shrink-0"
          style={{ background: "var(--bg-base)", borderBottom: "1px solid var(--border-subtle)" }}
        >
          <div className="flex items-center space-x-3 min-w-0">
            <h1 className="font-semibold text-sm truncate" style={{ color: "var(--fg-primary)" }}>
              {storyTitle || "Untitled Project"}
            </h1>
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
              style={{
                background: "var(--gold-soft)",
                color: "var(--gold)",
                border: "1px solid rgba(143,105,27,0.2)",
              }}
            >
              {primaryLang.toUpperCase()}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {/* User Account Button */}
            <button
              id="header-user-profile"
              type="button"
              onClick={() => setAuthModalOpen(true)}
              className="px-3 py-1.5 rounded-lg text-[12px] font-medium flex items-center space-x-1.5 transition-all duration-200 cursor-pointer"
              style={{
                background: "var(--bg-elevated)",
                color: "var(--fg-primary)",
                border: "1px solid var(--border-subtle)",
              }}
              title="User Account & Security"
            >
              <User className="w-3.5 h-3.5" style={{ color: "var(--gold)" }} />
              <span>{currentUser ? currentUser.username : "Sign In"}</span>
            </button>

            {/* Save Button */}
            <button
              id="header-save"
              type="button"
              onClick={handleSaveProject}
              className="px-3 py-1.5 rounded-lg text-[13px] font-medium flex items-center space-x-1.5 transition-all duration-200 cursor-pointer"
              style={{
                background: "var(--bg-elevated)",
                color: "var(--fg-primary)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <Save className="w-3.5 h-3.5" style={{ color: "var(--gold)" }} />
              <span>{primaryLang === "ar" ? "حفظ" : "Save to DB"}</span>
            </button>

            {/* Export Studio Button */}
            <button
              id="header-export"
              type="button"
              onClick={() => {
                setStudioStep("video");
                setCurrentView("studio");
              }}
              className="px-4 py-1.5 rounded-lg font-bold text-[13px] flex items-center space-x-1.5 transition-all duration-200 active:scale-[0.98] text-white cursor-pointer"
              style={{
                background: "var(--gold)",
                boxShadow: "0 2px 12px rgba(143,105,27,0.25)",
              }}
            >
              <Video className="w-3.5 h-3.5" />
              <span>{primaryLang === "ar" ? "تصدير الوسائط" : "Export Studio"}</span>
            </button>
          </div>
        </header>

        {/* ═════════════════════════════
            WORKFLOW STEPPER
            ═════════════════════════════ */}
        {currentView === "studio" && (
          <div
            className="px-6 py-3 flex items-center justify-between workflow-steps"
            style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border-subtle)" }}
          >
            <div className="flex items-center space-x-1">
              {WORKFLOW_STEPS.map((step, idx) => {
                const isActive = studioStep === step.id;
                const stepIdx = WORKFLOW_STEPS.findIndex((s) => s.id === studioStep);
                const isComplete = idx < stepIdx;
                const Icon = step.icon;
                return (
                  <React.Fragment key={step.id}>
                    {idx > 0 && (
                      <div
                        className="w-8 h-[2px] mx-1 rounded-full transition-all duration-300"
                        style={{ background: isComplete || isActive ? "var(--gold)" : "var(--border-subtle)" }}
                      />
                    )}
                    <button
                      id={`step-${step.id}`}
                      type="button"
                      onClick={() => setStudioStep(step.id)}
                      className="flex items-center space-x-2 px-3 py-1.5 rounded-lg text-[13px] transition-all duration-200 cursor-pointer"
                      style={{
                        background: isActive ? "var(--gold)" : "transparent",
                        color: isActive ? "#ffffff" : isComplete ? "var(--gold)" : "var(--fg-muted)",
                        fontWeight: isActive ? 700 : 500,
                      }}
                    >
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-200"
                        style={{
                          background: isActive ? "var(--bg-deep)" : isComplete ? "var(--gold-soft)" : "var(--bg-elevated)",
                          color: isActive ? "var(--gold)" : isComplete ? "var(--gold)" : "var(--fg-muted)",
                        }}
                      >
                        {isComplete ? <Check className="w-3 h-3 stroke-[2.5]" /> : step.num}
                      </span>
                      <Icon className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{primaryLang === "ar" ? step.titleAr : step.title}</span>
                    </button>
                  </React.Fragment>
                );
              })}
            </div>

            {isMusicPlaying && (
              <div
                className="hidden md:flex items-center space-x-2 text-[11px] px-2.5 py-1 rounded-md animate-fade-in"
                style={{
                  background: "var(--gold-soft)",
                  color: "var(--gold)",
                  border: "1px solid rgba(143,105,27,0.25)",
                }}
              >
                <Music className="w-3 h-3 animate-pulse" />
                <span>Pure Instrument Playing</span>
              </div>
            )}
          </div>
        )}

        {/* ═════════════════════════════
            VIEW CONTENT ROUTING
            ═════════════════════════════ */}
        <div className="flex-1 overflow-y-auto p-6">
          {currentView === "studio" && (
            <>
              {studioStep === "script" && <StepScript />}
              {studioStep === "characters" && <StepCast />}
              {studioStep === "audio" && <StepSoundtrack />}
              {studioStep === "video" && <StepVideo />}
            </>
          )}

          {currentView === "stories" && (
            <ProjectsPanel onNewProjectClick={() => setNewProjectModalOpen(true)} />
          )}

          {currentView === "voices" && (
            <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
              {/* Header & Description */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b" style={{ borderColor: "var(--border-subtle)" }}>
                <div>
                  <h2 className="text-xl font-bold flex items-center space-x-2" style={{ color: "var(--fg-primary)" }}>
                    <Mic className="w-5 h-5" style={{ color: "var(--gold)" }} />
                    <span>
                      {primaryLang === "ar"
                        ? "مكتبة الأصوات العصبية الذكية"
                        : "Studio Voice Library & Neural Readers"}
                    </span>
                    <span
                      className="text-[11px] font-mono font-normal px-2.5 py-0.5 rounded-full"
                      style={{
                        background: "var(--gold-soft)",
                        color: "var(--gold)",
                        border: "1px solid rgba(143,105,27,0.25)",
                      }}
                    >
                      {CATALOG_VOICES.length} Tested Readers
                    </span>
                  </h2>
                  <p className="text-[12px] mt-1" style={{ color: "var(--fg-muted)" }}>
                    {primaryLang === "ar"
                      ? "أصوات عصبية احترافية خالية من الأخطاء مصنفة حسب اللهجات والمناطق والأنماط التعبيرية."
                      : "Verified neural readers categorized by dialect, tone, and region for flawless cinematic storytelling."}
                  </p>
                </div>

                {/* Search Box */}
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    placeholder={
                      primaryLang === "ar"
                        ? "بحث بالاسم أو اللهجة أو النبرة..."
                        : "Search voice, dialect, or style..."
                    }
                    value={voiceAuditionSearch}
                    onChange={(e) => setVoiceAuditionSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-[12px] rounded-xl outline-none"
                    style={{
                      background: "var(--bg-surface)",
                      color: "var(--fg-primary)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  />
                  {voiceAuditionSearch && (
                    <button
                      type="button"
                      onClick={() => setVoiceAuditionSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-200"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Language Filter Tabs */}
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { id: "all" as const, label: `All Languages (${CATALOG_VOICES.length})` },
                  {
                    id: "ar" as const,
                    label: `🇸🇦 🇪🇬 العربية (${CATALOG_VOICES.filter((v) => v.lang === "ar").length})`,
                  },
                  {
                    id: "en" as const,
                    label: `🇺🇸 🇬🇧 English (${CATALOG_VOICES.filter((v) => v.lang === "en").length})`,
                  },
                  {
                    id: "fr" as const,
                    label: `🇫🇷 🇨🇦 Français (${CATALOG_VOICES.filter((v) => v.lang === "fr").length})`,
                  },
                ].map((tab) => {
                  const isActive = voiceAuditionLang === tab.id;
                  const isStoryMatch = (tab.id as string) === primaryLang;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setVoiceAuditionLang(tab.id)}
                      className="px-3.5 py-1.5 rounded-lg text-[12px] font-semibold flex items-center space-x-1.5 transition-all cursor-pointer"
                      style={{
                        background: isActive
                          ? "var(--gold)"
                          : isStoryMatch
                          ? "var(--gold-soft)"
                          : "var(--bg-surface)",
                        color: isActive
                          ? "#ffffff"
                          : isStoryMatch
                          ? "var(--gold)"
                          : "var(--fg-secondary)",
                        border: isActive
                          ? "1px solid var(--gold)"
                          : isStoryMatch
                          ? "1px solid rgba(143,105,27,0.3)"
                          : "1px solid var(--border-subtle)",
                      }}
                    >
                      <span>{tab.label}</span>
                      {isStoryMatch && tab.id !== "all" && (
                        <span className="text-[10px] uppercase font-bold opacity-80">(Story)</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Voice Cards Grid */}
              {(() => {
                const filteredVoices = CATALOG_VOICES.filter((v) => {
                  if (voiceAuditionLang !== "all" && v.lang !== voiceAuditionLang) return false;
                  if (voiceAuditionSearch.trim()) {
                    const q = voiceAuditionSearch.toLowerCase();
                    return (
                      v.name.toLowerCase().includes(q) ||
                      v.region.toLowerCase().includes(q) ||
                      v.style.toLowerCase().includes(q) ||
                      v.gender.toLowerCase().includes(q) ||
                      v.category.toLowerCase().includes(q)
                    );
                  }
                  return true;
                });

                if (filteredVoices.length === 0) {
                  return (
                    <div
                      className="p-12 text-center rounded-2xl space-y-3"
                      style={{ background: "var(--bg-surface)", border: "1px dashed var(--border-subtle)" }}
                    >
                      <Mic className="w-8 h-8 mx-auto text-stone-500" />
                      <div className="font-semibold text-sm" style={{ color: "var(--fg-primary)" }}>
                        No voices match "{voiceAuditionSearch}"
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setVoiceAuditionSearch("");
                          setVoiceAuditionLang("all");
                        }}
                        className="px-4 py-1.5 rounded-lg text-xs font-bold"
                        style={{ background: "var(--gold-soft)", color: "var(--gold)" }}
                      >
                        Reset Filters
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {filteredVoices.map((v) => {
                      const isPreviewing = auditioningVoiceId === v.id;
                      const isCurrentNarrator = characters.some((c) => c.voice === v.id);

                      return (
                        <div
                          key={v.id}
                          className="p-4 rounded-xl space-y-3 transition-all duration-200"
                          style={{
                            background: "var(--bg-surface)",
                            border: isCurrentNarrator
                              ? "1px solid var(--gold)"
                              : "1px solid var(--border-subtle)",
                            boxShadow: isCurrentNarrator
                              ? "0 0 12px rgba(143,105,27,0.15)"
                              : "none",
                          }}
                        >
                          {/* Card Header: Flag, Name, Badges */}
                          <div className="flex items-start justify-between">
                            <div className="space-y-0.5">
                              <div className="font-bold text-[14px] flex items-center space-x-1.5" style={{ color: "var(--fg-primary)" }}>
                                <span className="text-base">{v.flagEmoji}</span>
                                <span>{v.name}</span>
                              </div>
                              <div className="text-[11px] font-medium" style={{ color: "var(--fg-muted)" }}>
                                {v.region}
                              </div>
                            </div>

                            <div className="flex items-center space-x-1">
                              <span
                                className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full"
                                style={{
                                  background: "var(--bg-elevated)",
                                  color: "var(--fg-secondary)",
                                  border: "1px solid var(--border-subtle)",
                                }}
                              >
                                {v.gender}
                              </span>
                              {isCurrentNarrator && (
                                <span
                                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                  style={{
                                    background: "var(--gold-soft)",
                                    color: "var(--gold)",
                                    border: "1px solid rgba(143,105,27,0.3)",
                                  }}
                                >
                                  In Story
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Style Description */}
                          <div
                            className="text-[11px] px-2.5 py-1.5 rounded-lg flex items-center space-x-1.5"
                            style={{ background: "var(--bg-elevated)", color: "var(--fg-secondary)" }}
                          >
                            <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                            <span className="truncate">{v.style}</span>
                          </div>

                          {/* Action Buttons */}
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <button
                              type="button"
                              disabled={isPreviewing}
                              onClick={() => {
                                setAuditioningVoiceId(v.id);
                                audioEngine.speak({
                                  text:
                                    v.lang === "ar"
                                      ? "هذا صوت نقي وطبيعي من استوديو ستوري فورج، جاهز لقراءة قصتك بأعلى جودة."
                                      : v.lang === "fr"
                                      ? "Voici une voix naturelle et expressive avec StoryForge Studio, parfaite pour votre récit."
                                      : "This is a clean, cinematic neural voice from StoryForge Studio, ready for your story.",
                                  voice: v.id,
                                  language: v.lang as "en" | "ar" | "fr",
                                  onEnd: () => setAuditioningVoiceId(null),
                                });
                              }}
                              className="py-2 rounded-lg text-[11px] font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer active:scale-95"
                              style={{
                                background: isPreviewing ? "var(--gold)" : "var(--bg-elevated)",
                                color: isPreviewing ? "#ffffff" : "var(--gold)",
                                border: "1px solid var(--border-subtle)",
                              }}
                            >
                              {isPreviewing ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>Playing...</span>
                                </>
                              ) : (
                                <>
                                  <Play className="w-3 h-3 fill-current" />
                                  <span>Audition</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (characters.length > 0) {
                                  updateCharacter(characters[0].id, {
                                    voice: v.id,
                                    language: v.lang as "en" | "ar" | "fr",
                                  });
                                }
                                setLines(
                                  lines.map((l) => ({
                                    ...l,
                                    voice: v.id,
                                    language: v.lang as "en" | "ar" | "fr",
                                  }))
                                );
                                setStudioStep("video");
                                setCurrentView("studio");
                              }}
                              className="py-2 rounded-lg text-[11px] font-bold flex items-center justify-center space-x-1 transition-all cursor-pointer active:scale-95"
                              style={{
                                background: isCurrentNarrator ? "var(--bg-elevated)" : "var(--gold-soft)",
                                color: "var(--gold)",
                                border: "1px solid rgba(143,105,27,0.25)",
                              }}
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>{isCurrentNarrator ? "Selected" : "Use Voice"}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {currentView === "settings" && (
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="font-bold text-lg pb-3 border-b" style={{ borderColor: "var(--border-subtle)" }}>
                System Diagnostics & Technical Engine
              </div>
              <div className="p-5 rounded-xl space-y-3" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}>
                <div className="font-bold text-[14px]">Authoritative System Status</div>
                <div className="space-y-2 text-[12px]">
                  <div className="flex justify-between py-1 border-b" style={{ borderColor: "var(--border-subtle)" }}>
                    <span style={{ color: "var(--fg-secondary)" }}>Backend Sidecar</span>
                    <span className="font-semibold text-emerald-700 flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{systemHealth ? `Online (Port ${systemHealth.port})` : "Active"}</span>
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b" style={{ borderColor: "var(--border-subtle)" }}>
                    <span style={{ color: "var(--fg-secondary)" }}>Authoritative Database</span>
                    <span className="font-mono">SQLite 3.x (WAL Journaling Enabled)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b" style={{ borderColor: "var(--border-subtle)" }}>
                    <span style={{ color: "var(--fg-secondary)" }}>TTS Speech Synthesis</span>
                    <span className="font-mono">Edge-TTS 7.2 + IndexedDB Persistent Cache</span>
                  </div>
                  <div className="flex justify-between py-1 border-b" style={{ borderColor: "var(--border-subtle)" }}>
                    <span style={{ color: "var(--fg-secondary)" }}>Audio Mixing Pipeline</span>
                    <span className="font-mono">Pydub + FFmpeg x64 Native Master</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ═════════════════════════════════════════
            BOTTOM PLAYER BAR
            ═════════════════════════════════════════ */}
        <footer
          className="h-14 px-6 flex items-center justify-between shrink-0 z-30"
          style={{ background: "var(--bg-base)", borderTop: "1px solid var(--border-subtle)" }}
        >
          <div className="flex items-center space-x-3">
            <button
              id="footer-play"
              type="button"
              onClick={handlePlayFullStory}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 shrink-0 text-white cursor-pointer"
              style={{
                background: "var(--gold)",
                boxShadow: "0 2px 10px rgba(143,105,27,0.25)",
              }}
            >
              {isPlaying ? (
                <Pause className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
              )}
            </button>

            <div>
              <div className="font-semibold text-[13px]" style={{ color: "var(--fg-primary)" }}>
                {storyTitle || "Untitled"}
              </div>
              <div className="text-[11px] flex items-center space-x-2" style={{ color: "var(--fg-muted)" }}>
                <span>
                  {isPlaying
                    ? playingLineId
                      ? `Line #${lines.findIndex((l) => l.id === playingLineId) + 1}`
                      : "Playing..."
                    : "Stopped"}
                </span>
                <span>•</span>
                <span className="font-mono" style={{ color: "var(--gold)" }}>
                  {formatTime(playbackSeconds)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div
              className="flex items-center space-x-2 px-3 py-1.5 rounded-lg text-[11px]"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}
            >
              <Music className="w-3.5 h-3.5" style={{ color: isMusicPlaying ? "var(--gold)" : "var(--fg-muted)" }} />
              <span style={{ color: "var(--fg-secondary)" }}>
                {backgroundTrack === "none" ? "No Music" : backgroundTrack.replace(".ogg", "").replace(".wav", "")}
              </span>
            </div>

            <button
              id="footer-play-full"
              type="button"
              onClick={handlePlayFullStory}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-lg text-[12px] font-bold transition-all duration-200 active:scale-[0.98] text-white cursor-pointer"
              style={{
                background: storyMode === "story" ? "var(--green)" : "var(--gold)",
                boxShadow: "0 2px 10px rgba(26,84,53,0.25)",
              }}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isPlaying ? "Pause" : storyMode === "story" ? "Play Story Narration" : "Play Dialogue"}</span>
            </button>
          </div>
        </footer>
      </div>

      {/* Fix 17: Save Status Toast Notification */}
      {saveStatusMessage && (
        <div
          className="fixed bottom-18 right-6 z-50 px-4 py-2.5 rounded-xl text-[12px] font-semibold flex items-center space-x-2 animate-slide-up shadow-xl"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            color: "var(--fg-primary)",
            boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
          }}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveStatusMessage}</span>
        </div>
      )}

      {/* Modals */}
      <NewProjectModal
        onCreateProject={handleCreateProject}
        isCreating={isCreatingProject}
        errorMessage={createProjectError}
      />
      <AuthModal />
    </div>
  );
}
