import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { ProjectSummary } from "../services/projectService";
import { UserAccount } from "../services/authService";

export interface StoryLine {
  id: string;
  speaker: string;
  voice: string;
  language: "en" | "ar" | "fr";
  text: string;
  mood: string;
  cameraShot?: "close-up" | "medium" | "over-the-shoulder" | "two-shot" | "reaction";
  visualCue?: string;
  videoId?: string;
}

export interface CharacterDef {
  id: string;
  name: string;
  role: string;
  voice: string;
  language: "en" | "ar" | "fr";
  pitch: number;
  speed: number;
  style: string;
}

export interface HistorySnapshot {
  lines: StoryLine[];
  characters: CharacterDef[];
}

export interface StudioState {
  // Navigation
  currentView: "studio" | "voices" | "stories" | "plugins" | "settings";
  studioStep: "script" | "characters" | "audio" | "video";
  setCurrentView: (v: StudioState["currentView"]) => void;
  setStudioStep: (s: StudioState["studioStep"]) => void;

  // Modals & Dialogs
  newProjectModalOpen: boolean;
  setNewProjectModalOpen: (open: boolean) => void;
  newProjectTitle: string;
  setNewProjectTitle: (t: string) => void;
  newProjectLang: "ar" | "en" | "fr";
  setNewProjectLang: (l: "ar" | "en" | "fr") => void;
  newProjectMode: "story" | "dialogue";
  setNewProjectMode: (m: "story" | "dialogue") => void;
  storyBeatDensity: "cinematic" | "sentence" | "paragraph";
  setStoryBeatDensity: (d: "cinematic" | "sentence" | "paragraph") => void;

  // Active Story & Project
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;
  storyTitle: string;
  setStoryTitle: (t: string) => void;
  storySynopsis: string;
  setStorySynopsis: (s: string) => void;
  primaryLang: "ar" | "en" | "fr";
  setPrimaryLang: (l: "ar" | "en" | "fr") => void;
  storyMode: "dialogue" | "story";
  setStoryMode: (m: "dialogue" | "story") => void;

  // Characters & Lines
  characters: CharacterDef[];
  lines: StoryLine[];
  setCharacters: (chars: CharacterDef[]) => void;
  setLines: (lines: StoryLine[]) => void;
  updateLine: (lineId: string, updates: Partial<StoryLine>) => void;
  deleteLine: (lineId: string) => void;
  addLine: (line: StoryLine) => void;
  clearAllLines: () => void;
  splitLine: (lineId: string) => void;
  mergeLine: (lineId: string) => void;
  assignVideoToLine: (lineId: string, videoId: string) => void;
  assignVideoToAllLines: (videoId: string) => void;
  updateCharacter: (charId: string, updates: Partial<CharacterDef>) => void;
  addCharacter: (char: CharacterDef) => void;
  deleteCharacter: (charId: string) => void;

  // Expanded Line Settings
  expandedLineId: string | null;
  setExpandedLineId: (id: string | null) => void;

  // Prosody & Human Acting (Default true)
  humanActingProsodyEnabled: boolean;
  setHumanActingProsodyEnabled: (enabled: boolean | ((prev: boolean) => boolean)) => void;

  // Audio & Soundtrack
  backgroundTrack: string;
  setBackgroundTrack: (t: string) => void;
  musicVolume: number;
  setMusicVolume: (v: number) => void;
  isMusicPlaying: boolean;
  setIsMusicPlaying: (p: boolean) => void;
  previewingVoiceId: string | null;
  setPreviewingVoiceId: (id: string | null) => void;

  // Video Captions & Styling
  videoAspectRatio: "9:16" | "16:9";
  setVideoAspectRatio: (r: "9:16" | "16:9") => void;
  selectedVideoId: string;
  setSelectedVideoId: (id: string) => void;
  videoSequence: string[];
  setVideoSequence: (seq: string[]) => void;
  subtitleStyle: string;
  setSubtitleStyle: (s: string) => void;
  wordsPerFrame: number;
  setWordsPerFrame: (n: number) => void;
  captionProgress: number;
  setCaptionProgress: (p: number) => void;
  currentWordIndex: number;
  setCurrentWordIndex: (idx: number) => void;

  // Playback State
  isPlaying: boolean;
  setIsPlaying: (p: boolean) => void;
  playingLineId: string | null;
  setPlayingLineId: (id: string | null) => void;
  playbackSeconds: number;
  setPlaybackSeconds: (s: number | ((prev: number) => number)) => void;

  // User Auth & Session
  currentUser: UserAccount | null;
  setCurrentUser: (u: UserAccount | null) => void;
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;

  // Saved Projects List
  savedDbProjects: ProjectSummary[];
  setSavedDbProjects: (projects: ProjectSummary[]) => void;
  isLoadingDbProjects: boolean;
  setIsLoadingDbProjects: (loading: boolean) => void;

  // Notifications & Toasts
  saveStatusMessage: string | null;
  setSaveStatusMessage: (msg: string | null) => void;
  scriptNotification: string | null;
  setScriptNotification: (msg: string | null) => void;

  // Undo / Redo Command Stack
  past: HistorySnapshot[];
  future: HistorySnapshot[];
  pushUndo: () => void;
  undo: () => void;
  redo: () => void;
}

const INITIAL_CHARACTERS: CharacterDef[] = [
  {
    id: "c-narrator",
    name: "Narrator",
    role: "Narrator",
    voice: "en-US-ChristopherNeural",
    language: "en",
    pitch: 1.0,
    speed: 1.0,
    style: "Cinematic",
  },
];

const INITIAL_LINES: StoryLine[] = [
  {
    id: "line-1",
    speaker: "Narrator",
    voice: "en-US-ChristopherNeural",
    language: "en",
    mood: "Cinematic",
    text: "The journey began under the quiet expanse of the starry night.",
    cameraShot: "close-up",
    videoId: "vid-desert-01",
  },
];

export const useStudioStore = create<StudioState>()(
  persist(
    (set, get) => ({
  // Navigation
  currentView: "studio",
  studioStep: "script",
  setCurrentView: (currentView) => set({ currentView }),
  setStudioStep: (studioStep) => set({ studioStep }),

  // Modals
  newProjectModalOpen: false,
  setNewProjectModalOpen: (newProjectModalOpen) => set({ newProjectModalOpen }),
  newProjectTitle: "",
  setNewProjectTitle: (newProjectTitle) => set({ newProjectTitle }),
  newProjectLang: "en",
  setNewProjectLang: (newProjectLang) => set({ newProjectLang }),
  newProjectMode: "story",
  setNewProjectMode: (newProjectMode) => set({ newProjectMode }),
  storyBeatDensity: "cinematic",
  setStoryBeatDensity: (storyBeatDensity) => set({ storyBeatDensity }),

  // Story & Project
  activeProjectId: null,
  setActiveProjectId: (activeProjectId) => set({ activeProjectId }),
  storyTitle: "My Story",
  setStoryTitle: (storyTitle) => set({ storyTitle }),
  storySynopsis: "A cinematic narrative story.",
  setStorySynopsis: (storySynopsis) => set({ storySynopsis }),
  primaryLang: "en",
  setPrimaryLang: (primaryLang) => set({ primaryLang }),
  storyMode: "story",
  setStoryMode: (storyMode) => {
    get().pushUndo();
    if (storyMode === "story") {
      set((state) => ({
        storyMode,
        lines: state.lines.map((l) => ({ ...l, speaker: "Narrator" })),
      }));
    } else {
      set({ storyMode });
    }
  },

  // Characters & Lines
  characters: INITIAL_CHARACTERS,
  lines: INITIAL_LINES,
  setCharacters: (characters) => {
    get().pushUndo();
    set({ characters });
  },
  setLines: (lines) => {
    get().pushUndo();
    set({ lines });
  },
  updateLine: (lineId, updates) => {
    set((state) => ({
      lines: state.lines.map((l) => (l.id === lineId ? { ...l, ...updates } : l)),
    }));
  },
  deleteLine: (lineId) => {
    get().pushUndo();
    set((state) => ({
      lines: state.lines.filter((l) => l.id !== lineId),
    }));
  },
  addLine: (line) => {
    get().pushUndo();
    set((state) => ({
      lines: [...state.lines, line],
    }));
  },
  clearAllLines: () => {
    get().pushUndo();
    set({ lines: [] });
  },
  splitLine: (lineId) => {
    get().pushUndo();
    const { lines } = get();
    const idx = lines.findIndex((l) => l.id === lineId);
    if (idx === -1) return;
    const target = lines[idx];
    const text = target.text.trim();
    const words = text.split(/\s+/);
    if (words.length <= 1) {
      const newLine: StoryLine = {
        ...target,
        id: `line-${Date.now()}`,
        text: "",
      };
      const updated = [...lines];
      updated.splice(idx + 1, 0, newLine);
      set({ lines: updated });
      return;
    }
    const mid = Math.ceil(words.length / 2);
    const firstHalf = words.slice(0, mid).join(" ");
    const secondHalf = words.slice(mid).join(" ");
    const updatedLine1: StoryLine = { ...target, text: firstHalf };
    const newLine2: StoryLine = {
      ...target,
      id: `line-${Date.now()}`,
      text: secondHalf,
    };
    const updated = [...lines];
    updated.splice(idx, 1, updatedLine1, newLine2);
    set({ lines: updated });
  },
  mergeLine: (lineId) => {
    get().pushUndo();
    const { lines } = get();
    const idx = lines.findIndex((l) => l.id === lineId);
    if (idx === -1 || idx >= lines.length - 1) return;
    const line1 = lines[idx];
    const line2 = lines[idx + 1];
    const mergedText = `${line1.text.trim()} ${line2.text.trim()}`.trim();
    const mergedLine: StoryLine = { ...line1, text: mergedText };
    const updated = [...lines];
    updated.splice(idx, 2, mergedLine);
    set({ lines: updated });
  },
  assignVideoToLine: (lineId, videoId) => {
    get().pushUndo();
    set((state) => ({
      lines: state.lines.map((l) => (l.id === lineId ? { ...l, videoId } : l)),
    }));
  },
  assignVideoToAllLines: (videoId) => {
    get().pushUndo();
    set((state) => ({
      selectedVideoId: videoId,
      lines: state.lines.map((l) => ({ ...l, videoId })),
    }));
  },
  updateCharacter: (charId, updates) => {
    get().pushUndo();
    set((state) => ({
      characters: state.characters.map((c) => (c.id === charId ? { ...c, ...updates } : c)),
    }));
  },
  addCharacter: (char) => {
    get().pushUndo();
    set((state) => ({
      characters: [...state.characters, char],
    }));
  },
  deleteCharacter: (charId) => {
    get().pushUndo();
    set((state) => ({
      characters: state.characters.filter((c) => c.id !== charId),
    }));
  },

  // Expanded Line
  expandedLineId: null,
  setExpandedLineId: (expandedLineId) => set({ expandedLineId }),

  // Prosody (Enabled by default as per Fix 12)
  humanActingProsodyEnabled: true,
  setHumanActingProsodyEnabled: (val) =>
    set((state) => ({
      humanActingProsodyEnabled:
        typeof val === "function" ? val(state.humanActingProsodyEnabled) : val,
    })),

  // Audio
  backgroundTrack: "beethoven_moonlight.ogg",
  setBackgroundTrack: (backgroundTrack) => set({ backgroundTrack }),
  musicVolume: 30,
  setMusicVolume: (musicVolume) => set({ musicVolume }),
  isMusicPlaying: false,
  setIsMusicPlaying: (isMusicPlaying) => set({ isMusicPlaying }),
  previewingVoiceId: null,
  setPreviewingVoiceId: (previewingVoiceId) => set({ previewingVoiceId }),

  // Video Captions & Styling
  videoAspectRatio: "9:16",
  setVideoAspectRatio: (videoAspectRatio) => set({ videoAspectRatio }),
  selectedVideoId: "vid-desert-01",
  setSelectedVideoId: (selectedVideoId) => set({ selectedVideoId }),
  videoSequence: ["vid-desert-01", "vid-war-01"],
  setVideoSequence: (videoSequence) => set({ videoSequence }),
  subtitleStyle: "gold-contrast",
  setSubtitleStyle: (subtitleStyle) => set({ subtitleStyle }),
  wordsPerFrame: 4,
  setWordsPerFrame: (wordsPerFrame) => set({ wordsPerFrame }),
  captionProgress: 0,
  setCaptionProgress: (captionProgress) => set({ captionProgress }),
  currentWordIndex: -1,
  setCurrentWordIndex: (currentWordIndex) => set({ currentWordIndex }),

  // Playback
  isPlaying: false,
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  playingLineId: null,
  setPlayingLineId: (playingLineId) => set({ playingLineId }),
  playbackSeconds: 0,
  setPlaybackSeconds: (val) =>
    set((state) => ({
      playbackSeconds: typeof val === "function" ? val(state.playbackSeconds) : val,
    })),

  // User Auth
  currentUser: null,
  setCurrentUser: (currentUser) => set({ currentUser }),
  authModalOpen: false,
  setAuthModalOpen: (authModalOpen) => set({ authModalOpen }),

  // Saved Projects List
  savedDbProjects: [],
  setSavedDbProjects: (savedDbProjects) => set({ savedDbProjects }),
  isLoadingDbProjects: false,
  setIsLoadingDbProjects: (isLoadingDbProjects) => set({ isLoadingDbProjects }),

  // Notifications
  saveStatusMessage: null,
  setSaveStatusMessage: (saveStatusMessage) => set({ saveStatusMessage }),
  scriptNotification: null,
  setScriptNotification: (scriptNotification) => set({ scriptNotification }),

  // Undo / Redo History (30 steps)
  past: [],
  future: [],
  pushUndo: () => {
    const current = {
      lines: get().lines,
      characters: get().characters,
    };
    set((state) => ({
      past: [...state.past.slice(-30), current],
      future: [],
    }));
  },
  undo: () => {
    const { past, future, lines, characters } = get();
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    set({
      past: past.slice(0, -1),
      future: [{ lines, characters }, ...future],
      lines: previous.lines,
      characters: previous.characters,
    });
  },
  redo: () => {
    const { past, future, lines, characters } = get();
    if (future.length === 0) return;
    const next = future[0];
    set({
      past: [...past, { lines, characters }],
      future: future.slice(1),
      lines: next.lines,
      characters: next.characters,
    });
  },
    }),
    {
      name: "storyforge_studio_storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentView: state.currentView,
        studioStep: state.studioStep,
        activeProjectId: state.activeProjectId,
        storyTitle: state.storyTitle,
        storySynopsis: state.storySynopsis,
        primaryLang: state.primaryLang,
        storyMode: state.storyMode,
        characters: state.characters,
        lines: state.lines,
        videoSequence: state.videoSequence,
        humanActingProsodyEnabled: state.humanActingProsodyEnabled,
        backgroundTrack: state.backgroundTrack,
        musicVolume: state.musicVolume,
        videoAspectRatio: state.videoAspectRatio,
        selectedVideoId: state.selectedVideoId,
        subtitleStyle: state.subtitleStyle,
        wordsPerFrame: state.wordsPerFrame,
      }),
    }
  )
);
