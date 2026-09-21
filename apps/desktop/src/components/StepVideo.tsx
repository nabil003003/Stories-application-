import React, { useState, useRef, useMemo, useEffect } from "react";
import {
  Download,
  Music,
  Video,
  Loader2,
  Sparkles,
  CheckCircle2,
  Film,
  Search,
  Wand2,
  Shuffle,
  Layers,
  Volume2,
  VolumeX,
  Play,
  Square,
  GripVertical,
  Trash2,
  Mic,
  Sliders,
  Plus,
} from "lucide-react";
import { useStudioStore, StoryLine } from "../store/useStudioStore";
import { VideoPlayer } from "./VideoPlayer";
import { audioEngine } from "../services/audioEngine";
import { FALLBACK_CURATED_MEDIA, autoMatchStoryVisuals } from "../services/mediaService";
import {
  downloadProjectAudioMaster,
  downloadProjectMixedAudio,
  downloadProjectVideo,
  createNewProject,
  updateExistingProject,
  fetchProjectList,
  LineTimingPayload,
  generateAIScene,
  openExportFolder,
} from "../services/projectService";

interface StepVideoProps {
  onExportVideoClick?: () => void;
}

const THEME_CATEGORIES = [
  { id: "all", label: "All (100)" },
  { id: "love", label: "❤️ Love (10)" },
  { id: "food", label: "🍳 Food (10)" },
  { id: "people", label: "👥 People (10)" },
  { id: "war", label: "⚔️ War (10)" },
  { id: "study", label: "📚 Study (10)" },
  { id: "nature", label: "🌲 Nature (10)" },
  { id: "games", label: "🎮 Games (10)" },
  { id: "fighting", label: "🥊 Fighting (10)" },
  { id: "arguing", label: "🗣️ Arguing (10)" },
  { id: "eating", label: "🍽️ Eating (10)" },
];

const SOUNDTRACK_OPTIONS = [
  { id: "none", label: "None (Voice Only)" },
  { id: "beethoven_moonlight.ogg", label: "🎹 Beethoven — Moonlight Sonata" },
  { id: "beethoven_fur_elise.ogg", label: "🎼 Beethoven — Für Elise" },
  { id: "spanish_romance_guitar.ogg", label: "🎸 Spanish Romance (Acoustic Guitar)" },
  { id: "recuerdos_guitar.ogg", label: "🪕 Recuerdos de la Alhambra (Guitar)" },
  { id: "calm_rain.wav", label: "🌧️ Calm Ambient Rain (Acoustic)" },
  { id: "epic_tension.wav", label: "⚡ Epic Tension & Suspense" },
  { id: "desert_mystery.wav", label: "🏜️ Desert Mystery (Cinematic)" },
  { id: "tomb_drone.wav", label: "🏛️ Deep Cinematic Drone" },
];

interface VoiceTonePreset {
  id: string;
  name: string;
  badge: string;
  description: string;
  style: string;
  basePitch: number;
  baseRate: number;
  volume: string;
}

const VOICE_TONE_PRESETS: VoiceTonePreset[] = [
  {
    id: "deep",
    name: "Deep Baritone",
    badge: "🎙️ Deep",
    description: "Deep chest resonance, dramatic movie trailer narrator",
    style: "Cinematic",
    basePitch: -6,
    baseRate: -6,
    volume: "+5%",
  },
  {
    id: "soft",
    name: "Soft & Gentle",
    badge: "🌿 Soft",
    description: "Warm, calm, bedtime storyteller & whisper cadence",
    style: "Calm",
    basePitch: -2,
    baseRate: -10,
    volume: "-8%",
  },
  {
    id: "recorded_well",
    name: "Recorded Well",
    badge: "📻 Studio Master",
    description: "Ultra-crisp high-definition broadcast audio, BBC documentary clarity",
    style: "Documentary",
    basePitch: 0,
    baseRate: 0,
    volume: "+10%",
  },
  {
    id: "snappy",
    name: "Snappy Viral",
    badge: "⚡ Snappy",
    description: "Punchy, fast-paced high energy delivery",
    style: "Urgent",
    basePitch: 4,
    baseRate: 12,
    volume: "+15%",
  },
];

import { CATALOG_VOICES } from "../services/voiceCatalog";

export function StepVideo({ onExportVideoClick }: StepVideoProps): React.JSX.Element {
  const primaryLang = useStudioStore((s) => s.primaryLang);
  const storyTitle = useStudioStore((s) => s.storyTitle);
  const activeProjectId = useStudioStore((s) => s.activeProjectId);
  const lines = useStudioStore((s) => s.lines);
  const updateLine = useStudioStore((s) => s.updateLine);
  const backgroundTrack = useStudioStore((s) => s.backgroundTrack);
  const setBackgroundTrack = useStudioStore((s) => s.setBackgroundTrack);
  const musicVolume = useStudioStore((s) => s.musicVolume);
  const setMusicVolume = useStudioStore((s) => s.setMusicVolume);
  const isMusicPlaying = useStudioStore((s) => s.isMusicPlaying);
  const setIsMusicPlaying = useStudioStore((s) => s.setIsMusicPlaying);
  const subtitleStyle = useStudioStore((s) => s.subtitleStyle);
  const setSubtitleStyle = useStudioStore((s) => s.setSubtitleStyle);
  const wordsPerFrame = useStudioStore((s) => s.wordsPerFrame);
  const setWordsPerFrame = useStudioStore((s) => s.setWordsPerFrame);
  const captionProgress = useStudioStore((s) => s.captionProgress);
  const setCaptionProgress = useStudioStore((s) => s.setCaptionProgress);
  const isPlaying = useStudioStore((s) => s.isPlaying);
  const setIsPlaying = useStudioStore((s) => s.setIsPlaying);
  const playingLineId = useStudioStore((s) => s.playingLineId);
  const setPlayingLineId = useStudioStore((s) => s.setPlayingLineId);
  const playbackSeconds = useStudioStore((s) => s.playbackSeconds);
  const setPlaybackSeconds = useStudioStore((s) => s.setPlaybackSeconds);
  const setStudioStep = useStudioStore((s) => s.setStudioStep);

  const videoAspectRatio = useStudioStore((s) => s.videoAspectRatio);
  const setVideoAspectRatio = useStudioStore((s) => s.setVideoAspectRatio);
  const selectedVideoId = useStudioStore((s) => s.selectedVideoId);
  const setSelectedVideoId = useStudioStore((s) => s.setSelectedVideoId);
  const assignVideoToLine = useStudioStore((s) => s.assignVideoToLine);
  const assignVideoToAllLines = useStudioStore((s) => s.assignVideoToAllLines);

  // Active scene beat selected for preview / editing
  const [activeEditingBeatId, setActiveEditingBeatId] = useState<string | null>(
    lines[0]?.id || null
  );

  // Replay loop mode
  const [isLooping, setIsLooping] = useState<boolean>(true);

  // Music stop control ("event the music i can chose where to stop it")
  const [musicStopRule, setMusicStopRule] = useState<"continuous" | "after-beat" | "at-seconds">("continuous");
  const [musicStopBeatIndex, setMusicStopBeatIndex] = useState<number>(1);
  const [musicStopSeconds, setMusicStopSeconds] = useState<number>(15);

  // Narrative voice adaptation ("adapt it: make it deep, make it soft, make it recorded well")
  const [voiceToneId, setVoiceToneId] = useState<string>("deep");
  const defaultVoiceForLang = useMemo(() => {
    if (primaryLang === "ar") return "ar-SA-HamedNeural";
    if (primaryLang === "fr") return "fr-FR-HenriNeural";
    return "en-US-ChristopherNeural";
  }, [primaryLang]);

  const [selectedVoiceId, setSelectedVoiceId] = useState<string>(
    lines[0]?.voice || defaultVoiceForLang
  );
  const [pitchOffset, setPitchOffset] = useState<number>(0);
  const [rateOffset, setRateOffset] = useState<number>(0);
  const [isPreviewingVoice, setIsPreviewingVoice] = useState(false);
  const [voiceLangFilter, setVoiceLangFilter] = useState<"matching" | "all" | "en" | "ar" | "fr" | "iconic">("matching");

  // Side video clips list search and filters
  const [selectedTheme, setSelectedTheme] = useState<string>("all");
  const [videoSearch, setVideoSearch] = useState<string>("");
  const [draggedVideoId, setDraggedVideoId] = useState<string | null>(null);

  // Free AI Scene Art Generation (Pollinations.ai / FLUX.1)
  const [isAiSceneModalOpen, setIsAiSceneModalOpen] = useState(false);
  const [aiScenePrompt, setAiScenePrompt] = useState("");
  const [isGeneratingAiScene, setIsGeneratingAiScene] = useState(false);

  // Video Resolution from store (Default 720p fast, or 1080p full HD)
  const videoResolution = useStudioStore((s) => s.videoResolution) || "720p";
  const setVideoResolution = useStudioStore((s) => s.setVideoResolution);

  // Export states
  const [isExportingAudio, setIsExportingAudio] = useState(false);
  const [isExportingMixed, setIsExportingMixed] = useState(false);
  const [isAutoMatching, setIsAutoMatching] = useState(false);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);
  const [isExportingVideo, setIsExportingVideo] = useState(false);
  const [exportedVideoModal, setExportedVideoModal] = useState<{
    filename: string;
    blobUrl: string;
    fileSize: number;
    durationSeconds: number;
  } | null>(null);

  // Multi-Video Sequence Slots for story timeline (persisted in store)
  const videoSequence = useStudioStore((s) => s.videoSequence) || ["vid-war-01"];
  const setVideoSequence = useStudioStore((s) => s.setVideoSequence);

  // Keep videoSequence synced if empty and lines load
  useEffect(() => {
    if ((!videoSequence || videoSequence.length === 0) && lines.length > 0) {
      const fromLines = lines.map((l) => l.videoId).filter((v): v is string => Boolean(v));
      setVideoSequence(fromLines.length > 0 ? fromLines : [selectedVideoId || "vid-war-01"]);
    }
  }, [lines, selectedVideoId, videoSequence, setVideoSequence]);

  // Total Estimated Narrative Seconds (word pace + natural sentence transitions)
  const estimatedNarrativeSeconds = useMemo(() => {
    if (lines.length === 0) return 30.0;
    const totalWords = lines.reduce(
      (acc, l) => acc + (l.text.trim().split(/\s+/).filter(Boolean).length || 1),
      0
    );
    const duration = Math.max(lines.length * 2.2, totalWords / 2.5 + lines.length * 0.35);
    return Math.round(duration * 10) / 10;
  }, [lines]);

  // Duration per clip: divides narrative time equally among chosen clips
  const durationPerClip = useMemo(() => {
    if (videoSequence.length === 0) return 0;
    return Number((estimatedNarrativeSeconds / videoSequence.length).toFixed(1));
  }, [estimatedNarrativeSeconds, videoSequence.length]);

  // Active clip index during preview playback
  const currentClipIndex = useMemo(() => {
    if (videoSequence.length <= 1) return 0;
    if (!isPlaying || estimatedNarrativeSeconds <= 0) return 0;
    const progress = Math.min(0.999, Math.max(0, playbackSeconds / estimatedNarrativeSeconds));
    return Math.min(videoSequence.length - 1, Math.floor(progress * videoSequence.length));
  }, [isPlaying, playbackSeconds, estimatedNarrativeSeconds, videoSequence.length]);

  // The active video for player
  const activeTimelineVideoId = videoSequence[currentClipIndex] || videoSequence[0] || selectedVideoId || "vid-war-01";

  // Timings for SRT
  const lineTimingsRef = useRef<Map<string, { start: number; end: number }>>(new Map());
  const playbackTimerRef = useRef<number | null>(null);

  // Sync active beat if lines change
  useEffect(() => {
    if (lines.length > 0 && (!activeEditingBeatId || !lines.some((l) => l.id === activeEditingBeatId))) {
      setActiveEditingBeatId(lines[0].id);
    }
  }, [lines, activeEditingBeatId]);

  // Automatically distribute diverse unique background videos to each scene part on initial load
  useEffect(() => {
    if (lines.length > 0) {
      const hasUnassigned = lines.some((l) => !l.videoId);
      const allIdentical = lines.length > 1 && lines.every((l) => l.videoId === lines[0].videoId);

      if (hasUnassigned || allIdentical) {
        lines.forEach((line, idx) => {
          const clip = FALLBACK_CURATED_MEDIA[idx % FALLBACK_CURATED_MEDIA.length];
          assignVideoToLine(line.id, clip.id);
        });
      }
    }
  }, [lines.length]);

  const currentPlayingLine: StoryLine =
    lines.find((l) => l.id === (playingLineId || activeEditingBeatId)) ||
    lines[0] || {
      id: "default",
      speaker: "Narrator",
      voice: selectedVoiceId || defaultVoiceForLang,
      language: primaryLang,
      mood: "Cinematic",
      text: "StoryForge Studio ready.",
      videoId: "vid-desert-01",
    };

  const activeBeatIdx = lines.findIndex((l) => l.id === currentPlayingLine.id);

  // Calculate current acoustic profile based on selected tone preset + manual offsets
  const activeTonePreset = useMemo(() => {
    return VOICE_TONE_PRESETS.find((p) => p.id === voiceToneId) || VOICE_TONE_PRESETS[0];
  }, [voiceToneId]);

  const effectivePitch = activeTonePreset.basePitch + pitchOffset;
  const effectiveRate = activeTonePreset.baseRate + rateOffset;

  const computedPitchString = `${effectivePitch >= 0 ? "+" : ""}${effectivePitch}Hz`;
  const computedRateString = `${effectiveRate >= 0 ? "+" : ""}${effectiveRate}%`;

  // Filter 120 downloaded motion videos
  const filteredVideos = useMemo(() => {
    return FALLBACK_CURATED_MEDIA.filter((item) => {
      const matchesTheme = selectedTheme === "all" || item.theme === selectedTheme;
      const q = videoSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q));
      return matchesTheme && matchesSearch;
    });
  }, [selectedTheme, videoSearch]);

  // Navigate next beat
  const handleNextBeat = () => {
    if (activeBeatIdx < lines.length - 1) {
      const nextLine = lines[activeBeatIdx + 1];
      setActiveEditingBeatId(nextLine.id);
      if (isPlaying) {
        setPlayingLineId(nextLine.id);
      }
    }
  };

  // Navigate prev beat
  const handlePrevBeat = () => {
    if (activeBeatIdx > 0) {
      const prevLine = lines[activeBeatIdx - 1];
      setActiveEditingBeatId(prevLine.id);
      if (isPlaying) {
        setPlayingLineId(prevLine.id);
      }
    }
  };

  const handleSelectBeat = (lineId: string) => {
    setActiveEditingBeatId(lineId);
    if (isPlaying) {
      setPlayingLineId(lineId);
    }
  };

  // Playback execution state refs for live hot-swapping without pausing the video
  const playbackSeqIdRef = useRef<number>(0);
  const activeBeatIdxRef = useRef<number>(0);
  const isHotSwappingRef = useRef<boolean>(false);
  const startEpochRef = useRef<number>(0);

  const activeTonePresetRef = useRef(activeTonePreset);
  activeTonePresetRef.current = activeTonePreset;

  const computedPitchStringRef = useRef(computedPitchString);
  computedPitchStringRef.current = computedPitchString;

  const computedRateStringRef = useRef(computedRateString);
  computedRateStringRef.current = computedRateString;

  const selectedVoiceIdRef = useRef(selectedVoiceId);
  selectedVoiceIdRef.current = selectedVoiceId;

  const linesRef = useRef(lines);
  linesRef.current = lines;

  const musicStopRuleRef = useRef(musicStopRule);
  musicStopRuleRef.current = musicStopRule;

  const musicStopBeatIndexRef = useRef(musicStopBeatIndex);
  musicStopBeatIndexRef.current = musicStopBeatIndex;

  const musicStopSecondsRef = useRef(musicStopSeconds);
  musicStopSecondsRef.current = musicStopSeconds;

  const isLoopingRef = useRef(isLooping);
  isLoopingRef.current = isLooping;

  // Single function to play line at given index
  const playLineAtIndex = (
    idx: number,
    seqId: number,
    overrides?: {
      voice?: string;
      tone?: VoiceTonePreset;
      pitch?: string;
      rate?: string;
    }
  ) => {
    if (seqId !== playbackSeqIdRef.current || !useStudioStore.getState().isPlaying) return;

    const currentLines = linesRef.current;
    if (idx >= currentLines.length) {
      if (isLoopingRef.current && useStudioStore.getState().isPlaying) {
        activeBeatIdxRef.current = 0;
        playLineAtIndex(0, seqId);
      } else {
        stopPlayback();
      }
      return;
    }

    activeBeatIdxRef.current = idx;
    const line = currentLines[idx];
    setPlayingLineId(line.id);
    setActiveEditingBeatId(line.id);
    const lineStartSec = (Date.now() - startEpochRef.current) / 1000;

    // Music Stop Rule: check if beat index reached stop target
    if (musicStopRuleRef.current === "after-beat" && idx >= musicStopBeatIndexRef.current) {
      audioEngine.stopMusic();
      setIsMusicPlaying(false);
    }

    const voice = overrides?.voice || selectedVoiceIdRef.current || line.voice || defaultVoiceForLang;
    const tone = overrides?.tone || activeTonePresetRef.current;
    const pitch = overrides?.pitch || computedPitchStringRef.current;
    const rate = overrides?.rate || computedRateStringRef.current;

    audioEngine.speak({
      text: line.text,
      voice,
      language: line.language,
      style: tone.style,
      pitchOffset: pitch,
      rate,
      volume: tone.volume,
      onProgress: (progress) => {
        if (seqId === playbackSeqIdRef.current) {
          setCaptionProgress(progress);
          if (
            musicStopRuleRef.current === "at-seconds" &&
            (Date.now() - startEpochRef.current) / 1000 >= musicStopSecondsRef.current
          ) {
            audioEngine.stopMusic();
            setIsMusicPlaying(false);
          }
        }
      },
      onEnd: () => {
        if (seqId === playbackSeqIdRef.current && !isHotSwappingRef.current) {
          const lineEndSec = (Date.now() - startEpochRef.current) / 1000;
          lineTimingsRef.current.set(line.id, { start: lineStartSec, end: lineEndSec });
          playLineAtIndex(idx + 1, seqId);
        }
      },
    });
  };

  // Immediate live hot-swap of voice without stopping the video or playback!
  const triggerLiveVoiceHotSwap = (overrides?: {
    voice?: string;
    tone?: VoiceTonePreset;
    pitch?: string;
    rate?: string;
  }) => {
    if (useStudioStore.getState().isPlaying) {
      isHotSwappingRef.current = true;
      audioEngine.stopSpeech();
      isHotSwappingRef.current = false;
      playLineAtIndex(activeBeatIdxRef.current, playbackSeqIdRef.current, overrides);
    }
  };

  const handleSelectVoiceTone = (preset: VoiceTonePreset) => {
    setVoiceToneId(preset.id);
    setPitchOffset(0);
    setRateOffset(0);
    const newPitch = `${preset.basePitch >= 0 ? "+" : ""}${preset.basePitch}Hz`;
    const newRate = `${preset.baseRate >= 0 ? "+" : ""}${preset.baseRate}%`;
    if (currentPlayingLine?.id) {
      updateLine(currentPlayingLine.id, {
        mood: preset.style,
        voice: selectedVoiceId || currentPlayingLine.voice,
      });
    }
    triggerLiveVoiceHotSwap({
      tone: preset,
      pitch: newPitch,
      rate: newRate,
    });
  };

  const handlePitchChange = (val: number) => {
    setPitchOffset(val);
    const effective = activeTonePreset.basePitch + val;
    const newPitch = `${effective >= 0 ? "+" : ""}${effective}Hz`;
    triggerLiveVoiceHotSwap({ pitch: newPitch });
  };

  const handleRateChange = (val: number) => {
    setRateOffset(val);
    const effective = activeTonePreset.baseRate + val;
    const newRate = `${effective >= 0 ? "+" : ""}${effective}%`;
    triggerLiveVoiceHotSwap({ rate: newRate });
  };

  const handleVoiceChange = (newVoice: string) => {
    setSelectedVoiceId(newVoice);
    if (currentPlayingLine?.id) {
      updateLine(currentPlayingLine.id, { voice: newVoice });
    }
    triggerLiveVoiceHotSwap({ voice: newVoice });
  };

  // Stop playback cleanly
  const stopPlayback = () => {
    playbackSeqIdRef.current++;
    audioEngine.stopSpeech();
    audioEngine.stopMusic();
    setIsPlaying(false);
    setIsMusicPlaying(false);
    setPlayingLineId(null);
    if (playbackTimerRef.current) {
      clearInterval(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
  };

  // Play full story with multi-part video sequencing, auto-advancing, and music stop rules
  const handleTogglePlay = () => {
    if (isPlaying) {
      stopPlayback();
      return;
    }

    if (lines.length === 0) return;

    playbackSeqIdRef.current++;
    const currentSeqId = playbackSeqIdRef.current;

    setIsPlaying(true);
    setPlaybackSeconds(0);
    lineTimingsRef.current.clear();
    startEpochRef.current = Date.now();

    playbackTimerRef.current = window.setInterval(() => {
      setPlaybackSeconds((Date.now() - startEpochRef.current) / 1000);
    }, 100);

    // Start background soundtrack if configured
    if (backgroundTrack !== "none") {
      audioEngine.setMusicVolume(musicVolume / 100);
      audioEngine.playMusic(backgroundTrack);
      setIsMusicPlaying(true);
    }

    activeBeatIdxRef.current = 0;
    playLineAtIndex(0, currentSeqId);
  };

  // Preview Adapted Voice on current sentence
  const handleTestAdaptedVoice = async () => {
    if (isPreviewingVoice) {
      audioEngine.stopSpeech();
      setIsPreviewingVoice(false);
      return;
    }

    setIsPreviewingVoice(true);
    setExportFeedback(`Testing ${activeTonePreset.name} voice tone...`);

    await audioEngine.speak({
      text: currentPlayingLine.text || "StoryForge neural voice adaptation preview.",
      voice: selectedVoiceId || currentPlayingLine.voice || defaultVoiceForLang,
      language: currentPlayingLine.language,
      style: activeTonePreset.style,
      pitchOffset: computedPitchString,
      rate: computedRateString,
      volume: activeTonePreset.volume,
      onProgress: (p) => setCaptionProgress(p),
      onEnd: () => {
        setIsPreviewingVoice(false);
        setExportFeedback(null);
      },
    });
  };

  // Apply chosen voice & tone across all lines in project
  const handleApplyVoiceToAllParts = () => {
    lines.forEach((l) => {
      updateLine(l.id, { voice: selectedVoiceId, mood: activeTonePreset.style });
    });
    setExportFeedback(`Applied ${activeTonePreset.name} tone to all ${lines.length} story parts!`);
    setTimeout(() => setExportFeedback(null), 3000);
  };

  // Drag & Drop: Drop video onto active part or live phone -> adds clip to video timeline!
  const handleDropVideoOnActiveBeat = (videoId: string, applyToAll = false) => {
    if (applyToAll) {
      assignVideoToAllLines(videoId);
      setVideoSequence([videoId]);
      setSelectedVideoId(videoId);
      setExportFeedback("Applied video clip across all story parts!");
      setTimeout(() => setExportFeedback(null), 3000);
      return;
    }

    // Add clip to the multi-video timeline
    const newSeq = [...videoSequence, videoId];
    setVideoSequence(newSeq);
    setSelectedVideoId(videoId);
    const targetId = currentPlayingLine.id;
    assignVideoToLine(targetId, videoId);

    const newDur = (estimatedNarrativeSeconds / newSeq.length).toFixed(1);
    setExportFeedback(`🎬 Added clip to video timeline! Total: ${newSeq.length} clips (${newDur}s each).`);
    setTimeout(() => setExportFeedback(null), 3500);
  };

  // Multi-clip: Apply Selected Clip to All Parts
  const handleApplyToAllBeats = (vidId: string) => {
    assignVideoToAllLines(vidId);
    setExportFeedback("Replaying this clip across all story parts!");
    setTimeout(() => setExportFeedback(null), 3000);
  };

  // Multi-clip: Add another clip slot to timeline
  const handleAddClipSlot = (droppedVideoId?: string) => {
    let nextId = droppedVideoId;
    if (!nextId) {
      const unused = FALLBACK_CURATED_MEDIA.find((m) => !videoSequence.includes(m.id));
      nextId = unused ? unused.id : FALLBACK_CURATED_MEDIA[videoSequence.length % FALLBACK_CURATED_MEDIA.length].id;
    }
    const newSeq = [...videoSequence, nextId];
    setVideoSequence(newSeq);
    const newDur = (estimatedNarrativeSeconds / newSeq.length).toFixed(1);
    setExportFeedback(`Added Clip #${newSeq.length}! Timeline divided into ${newSeq.length} clips (${newDur}s each).`);
    setTimeout(() => setExportFeedback(null), 3000);
  };

  // Multi-clip: Remove clip slot from timeline
  const handleRemoveClipSlot = (indexToRemove: number) => {
    if (videoSequence.length <= 1) {
      const defaultVid = FALLBACK_CURATED_MEDIA[0]?.id || "vid-desert-01";
      setVideoSequence([defaultVid]);
      setSelectedVideoId(defaultVid);
      if (lines.length > 0) {
        assignVideoToAllLines(defaultVid);
      }
      setExportFeedback("Reset Clip #1 to default.");
      setTimeout(() => setExportFeedback(null), 3000);
      return;
    }
    const newSeq = videoSequence.filter((_, idx) => idx !== indexToRemove);
    setVideoSequence(newSeq);
    setSelectedVideoId(newSeq[0]);
    const newDur = (estimatedNarrativeSeconds / newSeq.length).toFixed(1);
    setExportFeedback(`Removed clip. Timeline divided into ${newSeq.length} clips (${newDur}s each).`);
    setTimeout(() => setExportFeedback(null), 3000);
  };

  // Multi-clip: Change specific clip slot's video
  const handleChangeClipInSlot = (slotIdx: number, newVideoId: string) => {
    const newSeq = [...videoSequence];
    newSeq[slotIdx] = newVideoId;
    setVideoSequence(newSeq);
    setSelectedVideoId(newVideoId);
    if (lines[slotIdx]) {
      assignVideoToLine(lines[slotIdx].id, newVideoId);
    }
  };

  // Multi-clip: Auto-Distribute Diverse Video Loops across every slot
  const handleAutoDistributeClips = () => {
    const count = Math.max(1, videoSequence.length);
    const uniqueIds: string[] = [];
    for (let i = 0; i < count; i++) {
      const vid = FALLBACK_CURATED_MEDIA[i % FALLBACK_CURATED_MEDIA.length];
      uniqueIds.push(vid.id);
    }
    setVideoSequence(uniqueIds);
    lines.forEach((line, idx) => {
      assignVideoToLine(line.id, uniqueIds[idx % uniqueIds.length]);
    });
    setExportFeedback(`Distributed ${uniqueIds.length} unique theme clips across the timeline!`);
    setTimeout(() => setExportFeedback(null), 3500);
  };

  // Intelligent Auto-Match with carefully curated subject analysis
  const handleAutoMatchVisuals = async () => {
    setIsAutoMatching(true);
    setExportFeedback("Analyzing story subjects & carefully matching video loops...");
    try {
      const matched = await autoMatchStoryVisuals(
        storyTitle,
        lines.map((l) => ({ id: l.id, text: l.text, speaker: l.speaker }))
      );
      if (matched && matched.length > 0) {
        matched.forEach((m) => {
          if (m.sceneId && m.mediaId) {
            assignVideoToLine(m.sceneId, m.mediaId);
          }
        });
        if (matched[0]?.mediaId) {
          setSelectedVideoId(matched[0].mediaId);
        }
        setExportFeedback(`Logically auto-matched clips to all ${matched.length} story parts!`);
        setTimeout(() => setExportFeedback(null), 3500);
      }
    } catch {
      handleAutoDistributeClips();
    } finally {
      setIsAutoMatching(false);
    }
  };

  // Free AI Scene Generation (Pollinations.ai / FLUX.1)
  const handleGenerateAiScene = async () => {
    if (!aiScenePrompt.trim()) return;
    setIsGeneratingAiScene(true);
    setExportFeedback("🎨 Painting 9:16 cinematic artwork with FLUX.1 (100% Free)...");
    try {
      const scene = await generateAIScene(aiScenePrompt.trim(), videoAspectRatio);
      const targetId = currentPlayingLine.id;
      assignVideoToLine(targetId, scene.id);
      setSelectedVideoId(scene.id);
      setVideoSequence([...videoSequence, scene.id]);
      setExportFeedback(`✨ Generated AI Scene and assigned to active story beat!`);
      setIsAiSceneModalOpen(false);
      setAiScenePrompt("");
    } catch (err: unknown) {
      setExportFeedback(err instanceof Error ? err.message : "Scene generation failed");
    } finally {
      setIsGeneratingAiScene(false);
      setTimeout(() => setExportFeedback(null), 4000);
    }
  };

  // Music Adjustment Toggles ("add music, delete music")
  const handleDeleteMusic = () => {
    setBackgroundTrack("none");
    audioEngine.stopMusic();
    setIsMusicPlaying(false);
    setExportFeedback("Background music removed (Voice Only mode).");
    setTimeout(() => setExportFeedback(null), 3000);
  };

  const handleToggleSoundtrackMusic = () => {
    if (isMusicPlaying) {
      audioEngine.stopMusic();
      setIsMusicPlaying(false);
    } else {
      if (backgroundTrack !== "none") {
        audioEngine.setMusicVolume(musicVolume / 100);
        audioEngine.playMusic(backgroundTrack);
        setIsMusicPlaying(true);
      } else {
        // Pick default Beethoven track if none selected
        setBackgroundTrack("beethoven_moonlight.ogg");
        audioEngine.setMusicVolume(musicVolume / 100);
        audioEngine.playMusic("beethoven_moonlight.ogg");
        setIsMusicPlaying(true);
      }
    }
  };

  const handleExportVoiceMaster = async () => {
    if (!activeProjectId) {
      setExportFeedback("Please save or open a project first.");
      setTimeout(() => setExportFeedback(null), 3000);
      return;
    }
    setIsExportingAudio(true);
    setExportFeedback("Compiling voice master MP3 with adapted tone...");
    try {
      await downloadProjectAudioMaster(activeProjectId, storyTitle);
      setExportFeedback("Voice master downloaded successfully!");
    } catch (err: unknown) {
      setExportFeedback(err instanceof Error ? err.message : "Voice export failed");
    } finally {
      setIsExportingAudio(false);
      setTimeout(() => setExportFeedback(null), 4000);
    }
  };

  const handleExportMixedMaster = async () => {
    if (!activeProjectId) {
      setExportFeedback("Please save or open a project first.");
      setTimeout(() => setExportFeedback(null), 3000);
      return;
    }
    setIsExportingMixed(true);
    setExportFeedback("Mixing voice & pure acoustic soundtrack...");
    try {
      await downloadProjectMixedAudio(activeProjectId, storyTitle);
      setExportFeedback("Mixed audio master downloaded successfully!");
    } catch (err: unknown) {
      setExportFeedback(err instanceof Error ? err.message : "Mixed export failed");
    } finally {
      setIsExportingMixed(false);
      setTimeout(() => setExportFeedback(null), 4000);
    }
  };

  const handleExportProductionVideo = async () => {
    if (onExportVideoClick) {
      onExportVideoClick();
      return;
    }

    setIsExportingVideo(true);
    let targetProjectId = activeProjectId;

    try {
      if (!targetProjectId) {
        setExportFeedback("Preparing story project in database...");
        try {
          const created = await createNewProject({
            title: storyTitle || "My Story",
            language: primaryLang,
            story_mode: "story",
            background_track: backgroundTrack,
            music_volume: musicVolume / 100,
            lines: lines.map((l) => ({
              speaker: l.speaker,
              voice: l.voice || selectedVoiceId,
              language: l.language,
              text: l.text,
              mood: l.mood || "Cinematic",
            })),
            characters: [],
          });
          targetProjectId = created.id;
          useStudioStore.getState().setActiveProjectId(created.id);
        } catch {
          const list = await fetchProjectList().catch(() => []);
          if (list && list.length > 0) {
            targetProjectId = list[0].id;
          }
        }
      } else {
        // Sync latest lines into DB
        await updateExistingProject(targetProjectId, {
          title: storyTitle,
          language: primaryLang,
          background_track: backgroundTrack,
          music_volume: musicVolume / 100,
          lines: lines.map((l) => ({
            speaker: l.speaker,
            voice: l.voice || selectedVoiceId,
            language: l.language,
            text: l.text,
            mood: l.mood || "Cinematic",
          })),
        }).catch(() => {});
      }

      if (!targetProjectId) {
        throw new Error("Could not initialize story project for export.");
      }

      setExportFeedback(`Rendering production MP4 video (${videoSequence.length} clips, ~${estimatedNarrativeSeconds.toFixed(0)}s)...`);

      const measuredList: LineTimingPayload[] = Array.from(lineTimingsRef.current.entries()).map(
        ([line_id, t]) => ({
          line_id,
          start_seconds: t.start,
          end_seconds: t.end,
        })
      );
      const exportRes = await downloadProjectVideo(
        targetProjectId,
        storyTitle,
        videoSequence,
        videoAspectRatio,
        true,
        measuredList,
        videoResolution
      );
      setExportFeedback("🎉 Production Video Exported Successfully (.mp4)!");
      setExportedVideoModal({
        filename: exportRes.filename,
        blobUrl: exportRes.blobUrl,
        fileSize: exportRes.fileSize,
        durationSeconds: exportRes.durationSeconds,
      });
    } catch (err: unknown) {
      setExportFeedback(err instanceof Error ? err.message : "Video export failed");
    } finally {
      setIsExportingVideo(false);
      setTimeout(() => setExportFeedback(null), 5000);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast Feedback */}
      {exportFeedback && (
        <div
          className="p-3 rounded-xl text-[13px] font-semibold flex items-center justify-between animate-slide-down shadow-xl"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--gold)",
            color: "var(--fg-primary)",
            boxShadow: "0 4px 20px rgba(143,105,27,0.2)",
          }}
        >
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4" style={{ color: "var(--gold)" }} />
            <span>{exportFeedback}</span>
          </div>
        </div>
      )}

      {/* Top Bar: 120 Motion Loops Ready + Aspect Ratio Form */}
      <div
        className="p-4 rounded-xl flex flex-wrap items-center justify-between gap-3"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
      >
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[12px] font-bold">
            <CheckCircle2 className="w-4 h-4" />
            <span>120 Offline Motion Loops Ready</span>
          </div>
          <span className="text-[12px] text-stone-400 hidden lg:inline">
            Drag any video clip from the left list directly into the phone player or a part below!
          </span>
        </div>

        {/* Controls: Aspect Ratio & Export Resolution (720p vs 1080p) */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Format Selector */}
          <div className="flex items-center space-x-1 p-1 rounded-xl" style={{ background: "var(--bg-elevated)" }}>
            <button
              type="button"
              id="format-tiktok"
              onClick={() => setVideoAspectRatio("9:16")}
              className="px-3 py-1.5 rounded-lg text-[12px] font-bold flex items-center space-x-1.5 transition-all cursor-pointer"
              style={{
                background: videoAspectRatio === "9:16" ? "var(--gold)" : "transparent",
                color: videoAspectRatio === "9:16" ? "#ffffff" : "var(--fg-muted)",
                boxShadow: videoAspectRatio === "9:16" ? "0 2px 10px rgba(143,105,27,0.3)" : "none",
              }}
            >
              <span>📱</span>
              <span>TikTok (9:16)</span>
            </button>
            <button
              type="button"
              id="format-widescreen"
              onClick={() => setVideoAspectRatio("16:9")}
              className="px-3 py-1.5 rounded-lg text-[12px] font-bold flex items-center space-x-1.5 transition-all cursor-pointer"
              style={{
                background: videoAspectRatio === "16:9" ? "var(--gold)" : "transparent",
                color: videoAspectRatio === "16:9" ? "#ffffff" : "var(--fg-muted)",
                boxShadow: videoAspectRatio === "16:9" ? "0 2px 10px rgba(143,105,27,0.3)" : "none",
              }}
            >
              <span>🖥️</span>
              <span>16:9</span>
            </button>
          </div>

          {/* Resolution Selector: 720p (Fast) vs 1080p (HQ) */}
          <div className="flex items-center space-x-1 p-1 rounded-xl" style={{ background: "var(--bg-elevated)" }}>
            <button
              type="button"
              id="res-720p"
              onClick={() => setVideoResolution("720p")}
              className="px-3 py-1.5 rounded-lg text-[12px] font-bold flex items-center space-x-1 transition-all cursor-pointer"
              style={{
                background: videoResolution === "720p" ? "var(--gold)" : "transparent",
                color: videoResolution === "720p" ? "#ffffff" : "var(--fg-muted)",
                boxShadow: videoResolution === "720p" ? "0 2px 10px rgba(143,105,27,0.3)" : "none",
              }}
            >
              <span>⚡</span>
              <span>720p (Fast)</span>
            </button>
            <button
              type="button"
              id="res-1080p"
              onClick={() => setVideoResolution("1080p")}
              className="px-3 py-1.5 rounded-lg text-[12px] font-bold flex items-center space-x-1 transition-all cursor-pointer"
              style={{
                background: videoResolution === "1080p" ? "var(--gold)" : "transparent",
                color: videoResolution === "1080p" ? "#ffffff" : "var(--fg-muted)",
                boxShadow: videoResolution === "1080p" ? "0 2px 10px rgba(143,105,27,0.3)" : "none",
              }}
            >
              <span>💎</span>
              <span>1080p (HQ)</span>
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          MAIN STUDIO GRID:
          [Left: Video Clips Library (120 Offline Motion Loops)]
          [Center: The Big TikTok Phone Video Player & Parts Sequencer]
          [Right: Soundtrack Adjustment + Voice Tone Adaptation]
          ══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ══════════════════════════════════════════════════
            1. LEFT PANEL: DRAGGABLE VIDEO CLIPS (120 LOOPS)
            ══════════════════════════════════════════════════ */}
        <div
          className="lg:col-span-3 rounded-2xl p-3.5 space-y-3 flex flex-col max-h-[820px]"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5 font-bold text-[13px]" style={{ color: "var(--fg-primary)" }}>
              <Film className="w-4 h-4" style={{ color: "var(--gold)" }} />
              <span>Video Clips ({filteredVideos.length})</span>
            </div>
            <span className="text-[10px] text-amber-400 font-bold px-1.5 py-0.5 rounded bg-amber-400/10 border border-amber-400/20">
              Drag & Drop
            </span>
          </div>

          {/* Action buttons: Free AI Scene & Auto Match */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setIsAiSceneModalOpen(true)}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
              style={{
                background: "linear-gradient(135deg, rgba(143,105,27,0.35), rgba(200,150,40,0.18))",
                border: "1px solid var(--gold)",
                color: "var(--fg-primary)",
              }}
            >
              <Sparkles className="w-3.5 h-3.5" style={{ color: "var(--gold)" }} />
              <span>Free AI Scene</span>
            </button>

            <button
              type="button"
              onClick={handleAutoMatchVisuals}
              disabled={isAutoMatching}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center space-x-1 transition-all cursor-pointer"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-subtle)",
                color: "var(--fg-secondary)",
              }}
            >
              <Wand2 className="w-3.5 h-3.5" style={{ color: "var(--gold)" }} />
              <span>Auto-Match</span>
            </button>
          </div>

          {/* Search bar */}
          <div
            className="flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-[12px] border"
            style={{ background: "var(--bg-elevated)", borderColor: "var(--border-subtle)" }}
          >
            <Search className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <input
              type="text"
              placeholder="Search desert, stars, city..."
              value={videoSearch}
              onChange={(e) => setVideoSearch(e.target.value)}
              className="bg-transparent outline-none text-[12px] w-full text-stone-200"
            />
          </div>

          {/* Theme categories */}
          <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1 scrollbar-none">
            {THEME_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedTheme(cat.id)}
                className="px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer shrink-0"
                style={{
                  background: selectedTheme === cat.id ? "var(--gold)" : "var(--bg-elevated)",
                  color: selectedTheme === cat.id ? "#ffffff" : "var(--fg-muted)",
                  border: "1px solid",
                  borderColor: selectedTheme === cat.id ? "var(--gold)" : "var(--border-subtle)",
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Scrollable Clips List (Draggable Cards) */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[580px]">
            {filteredVideos.map((vid) => {
              const isAssignedToActive = (currentPlayingLine.videoId || selectedVideoId) === vid.id;

              return (
                <div
                  key={vid.id}
                  draggable={true}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", vid.id);
                    e.dataTransfer.setData("videoId", vid.id);
                    e.dataTransfer.setData("application/x-storyforge-video", vid.id);
                    setDraggedVideoId(vid.id);
                  }}
                  onDragEnd={() => setDraggedVideoId(null)}
                  onClick={() => handleDropVideoOnActiveBeat(vid.id)}
                  className="group p-2 rounded-xl border transition-all cursor-grab active:cursor-grabbing flex items-center space-x-2.5"
                  style={{
                    background: isAssignedToActive ? "var(--gold-soft)" : "var(--bg-elevated)",
                    borderColor: isAssignedToActive ? "var(--gold)" : "var(--border-subtle)",
                    boxShadow: isAssignedToActive ? "0 2px 8px rgba(143,105,27,0.18)" : "none",
                  }}
                  title="Click to apply to active part, or drag onto any part"
                >
                  <GripVertical className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--fg-muted)" }} />

                  {/* Thumbnail */}
                  <div className="w-14 h-10 rounded-lg overflow-hidden bg-black shrink-0 relative">
                    <img
                      src={vid.thumbnailUrl}
                      alt={vid.title}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                    <span className="absolute bottom-0.5 right-0.5 text-[7px] font-mono px-1 rounded bg-black/80 text-white font-bold">
                      20s
                    </span>
                  </div>

                  {/* Info & Quick Actions */}
                  <div className="min-w-0 flex-1">
                    <div
                      className="text-[11px] font-bold truncate"
                      style={{ color: "var(--fg-primary)" }}
                      title={vid.title}
                    >
                      {vid.title}
                    </div>
                    <div
                      className="text-[9px] font-mono truncate uppercase mt-0.5 font-bold"
                      style={{ color: "var(--gold-dark)" }}
                    >
                      {vid.theme.replace("_", " ")}
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDropVideoOnActiveBeat(vid.id);
                        }}
                        className="text-[9px] font-bold cursor-pointer hover:underline"
                        style={{ color: "var(--gold-dark)" }}
                      >
                        Set Part #{activeBeatIdx + 1}
                      </button>
                      <span className="text-[8px]" style={{ color: "var(--fg-muted)" }}>•</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApplyToAllBeats(vid.id);
                        }}
                        className="text-[9px] font-medium cursor-pointer hover:underline"
                        style={{ color: "var(--fg-secondary)" }}
                      >
                        All Parts
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════
            2. CENTER PANEL: THE BIG LIVE PHONE PLAYER
               (NO text/dialogue edit box underneath it!)
            ══════════════════════════════════════════════════ */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-[13px] font-bold flex items-center space-x-2" style={{ color: "var(--fg-primary)" }}>
              <span>
                {videoAspectRatio === "9:16"
                  ? "📱 TikTok Live Video Player"
                  : "🖥️ Widescreen Live Video Player"}
              </span>
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={handleAutoDistributeClips}
                className="px-2 py-1 rounded-lg text-[11px] font-bold border flex items-center space-x-1 cursor-pointer transition-colors"
                style={{
                  background: "var(--bg-elevated)",
                  borderColor: "var(--border-subtle)",
                  color: "var(--gold)",
                }}
                title="Shuffle clips across all parts"
              >
                <Shuffle className="w-3 h-3" />
                <span>Shuffle</span>
              </button>
              <button
                type="button"
                onClick={handleAutoMatchVisuals}
                disabled={isAutoMatching}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold border flex items-center space-x-1 cursor-pointer transition-colors"
                style={{
                  background: "var(--bg-elevated)",
                  borderColor: "var(--border-subtle)",
                  color: "var(--gold)",
                }}
                title="Logically analyze story text and auto-assign best visual clips"
              >
                {isAutoMatching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                <span>Auto-Match</span>
              </button>
            </div>
          </div>

          {/* The Big Video Player (9:16 Phone Frame with Drop Target) */}
          {/* The Big Video Player (9:16 Phone Frame with Drop Target) */}
          <VideoPlayer
            currentPlayingLine={currentPlayingLine}
            allLines={lines}
            isPlaying={isPlaying}
            playbackSeconds={playbackSeconds}
            captionProgress={captionProgress}
            wordsPerFrame={wordsPerFrame}
            subtitleStyle={subtitleStyle}
            videoAspectRatio={videoAspectRatio}
            selectedVideoId={activeTimelineVideoId}
            isLooping={isLooping}
            onTogglePlay={handleTogglePlay}
            onNextBeat={handleNextBeat}
            onPrevBeat={handlePrevBeat}
            onSelectBeat={handleSelectBeat}
            onToggleLoop={() => setIsLooping((v) => !v)}
            onDropVideo={(vidId) => handleDropVideoOnActiveBeat(vidId)}
          />

          {/* ══════════════════════════════════════════════════════════
              MULTI-VIDEO BACKGROUND SCENES SEQUENCER
              Equal Narrative Time Division + "+ Add Clip Here" Button
              ══════════════════════════════════════════════════════════ */}
          <div
            className="p-4 rounded-2xl space-y-3"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
          >
            {/* Header: Title, Clear Narrative Duration, Equal Time per Clip */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="flex items-center space-x-2">
                  <Layers className="w-4 h-4" style={{ color: "var(--gold)" }} />
                  <span className="font-bold text-[13px]" style={{ color: "var(--fg-primary)" }}>
                    Multi-Video Background Scenes ({videoSequence.length} Clips)
                  </span>
                </div>
                <div className="flex items-center flex-wrap gap-1.5 mt-1.5 text-[11px] font-medium">
                  <span
                    className="px-2 py-0.5 rounded font-mono font-bold"
                    style={{ background: "var(--gold-soft)", color: "var(--gold-dark)" }}
                  >
                    ⏱️ Total Story Narration: {estimatedNarrativeSeconds.toFixed(1)}s
                  </span>
                  <span
                    className="px-2 py-0.5 rounded font-mono font-bold"
                    style={{ background: "var(--gold-soft)", color: "var(--gold-dark)" }}
                  >
                    ✂️ {videoSequence.length} {videoSequence.length === 1 ? "Clip" : "Clips"}: {durationPerClip.toFixed(1)}s each
                  </span>
                  <span className="text-[10px] hidden sm:inline" style={{ color: "var(--fg-muted)" }}>
                    • Clips loop automatically to fit exact narrative time
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleAutoDistributeClips}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center space-x-1.5 transition-all cursor-pointer"
                  style={{
                    background: "var(--gold-soft)",
                    color: "var(--gold-dark)",
                    border: "1px solid var(--gold)",
                  }}
                  title="Auto-distribute unique clips across all slots"
                >
                  <Shuffle className="w-3 h-3" />
                  <span>Auto-Distribute Unique Clips</span>
                </button>
              </div>
            </div>

            {/* Clips Grid + "+ Add Clip Here" Card */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {videoSequence.map((vidId, idx) => {
                const isCurrentActiveSlot = isPlaying && currentClipIndex === idx;
                const slotVid =
                  FALLBACK_CURATED_MEDIA.find((m) => m.id === vidId) || FALLBACK_CURATED_MEDIA[0];
                const startSec = (idx * durationPerClip).toFixed(1);
                const endSec = ((idx + 1) * durationPerClip).toFixed(1);

                return (
                  <div
                    key={`${vidId}-${idx}`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "copy";
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const droppedId =
                        e.dataTransfer.getData("text/plain") ||
                        e.dataTransfer.getData("videoId") ||
                        draggedVideoId;
                      if (droppedId) {
                        handleChangeClipInSlot(idx, droppedId);
                        setExportFeedback(`Assigned video to Clip #${idx + 1}!`);
                        setTimeout(() => setExportFeedback(null), 2500);
                      }
                    }}
                    className="p-2.5 rounded-xl border transition-all flex flex-col space-y-2 relative"
                    style={{
                      background: isCurrentActiveSlot ? "var(--gold-soft)" : "var(--bg-elevated)",
                      borderColor: isCurrentActiveSlot ? "var(--gold)" : "var(--border-subtle)",
                      boxShadow: isCurrentActiveSlot ? "0 2px 10px rgba(143,105,27,0.25)" : "none",
                    }}
                  >
                    {/* Always visible Delete / Reset button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveClipSlot(idx);
                      }}
                      className="absolute top-2 right-2 p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-500/10 transition-colors cursor-pointer rounded z-10"
                      title={videoSequence.length > 1 ? `Remove Clip #${idx + 1}` : "Reset Clip #1 to default"}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex items-center space-x-2 pr-6">
                      {/* Thumbnail */}
                      <div className="w-12 h-10 rounded-lg overflow-hidden shrink-0 bg-black relative">
                        <img
                          src={slotVid.thumbnailUrl}
                          alt={slotVid.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <span className="absolute bottom-0.5 right-0.5 text-[7px] font-mono px-1 rounded bg-black/80 text-white font-bold">
                          #{idx + 1}
                        </span>
                      </div>

                      {/* Slot Details */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 h-5">
                          <span className="text-[11px] font-bold font-mono whitespace-nowrap shrink-0" style={{ color: "var(--gold-dark)" }}>
                            Clip #{idx + 1}
                          </span>
                          {isCurrentActiveSlot && (
                            <span
                              className="text-[7.5px] px-1 py-0.5 rounded font-bold uppercase tracking-wider whitespace-nowrap shrink-0"
                              style={{ background: "var(--gold)", color: "#ffffff" }}
                            >
                              Playing
                            </span>
                          )}
                        </div>

                        {/* Timing Division Window */}
                        <div
                          className="text-[9px] font-mono font-bold mt-0.5 whitespace-nowrap truncate"
                          style={{ color: "var(--fg-secondary)" }}
                        >
                          ⏱️ {startSec}s - {endSec}s ({durationPerClip.toFixed(1)}s)
                        </div>
                      </div>
                    </div>

                    {/* Video Selector Dropdown */}
                    <div className="pt-0.5">
                      <select
                        value={vidId}
                        onChange={(e) => handleChangeClipInSlot(idx, e.target.value)}
                        className="w-full rounded p-1 text-[10px] font-medium cursor-pointer"
                        style={{
                          background: "var(--bg-surface)",
                          color: "var(--fg-primary)",
                          border: "1px solid var(--border-subtle)",
                        }}
                      >
                        {FALLBACK_CURATED_MEDIA.map((m) => (
                          <option key={m.id} value={m.id}>
                            [{m.theme.toUpperCase()}] {m.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}

              {/* ══════════════════════════════════════════════════
                  "+ ADD CLIP HERE" BUTTON CARD (In the exact circled area)
                  ══════════════════════════════════════════════════ */}
              <button
                type="button"
                onClick={() => handleAddClipSlot()}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "copy";
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const droppedId =
                    e.dataTransfer.getData("text/plain") ||
                    e.dataTransfer.getData("videoId") ||
                    draggedVideoId;
                  handleAddClipSlot(droppedId || undefined);
                }}
                className="p-3 rounded-xl border-2 border-dashed flex flex-col items-center justify-center space-y-1.5 transition-all cursor-pointer group min-h-[96px]"
                style={{
                  background: "var(--bg-elevated)",
                  borderColor: "var(--border-strong)",
                }}
                title="Add another clip to the video timeline. Narrative duration will automatically divide equally!"
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
                  style={{ background: "var(--gold-soft)", color: "var(--gold-dark)" }}
                >
                  <Plus className="w-4 h-4" />
                </div>
                <div className="text-center">
                  <span className="font-bold text-[11px] block" style={{ color: "var(--gold-dark)" }}>
                    + Add Clip Here
                  </span>
                  <span className="text-[9px] block mt-0.5" style={{ color: "var(--fg-muted)" }}>
                    Divide into {videoSequence.length + 1} equal clips ({(estimatedNarrativeSeconds / (videoSequence.length + 1)).toFixed(1)}s each)
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════
            3. RIGHT PANEL: MUSIC ADJUSTMENT & VOICE ADAPTATION
            ══════════════════════════════════════════════════ */}
        <div className="lg:col-span-4 space-y-4">
          {/* ══════════════════════════════════════════════════
              CARD 1: SOUNDTRACK & MUSIC ADJUSTMENT
              ("add music, delete music, choose where to stop it")
              ══════════════════════════════════════════════════ */}
          <div
            className="p-4 rounded-xl space-y-3.5"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Music className="w-4 h-4" style={{ color: "var(--gold)" }} />
                <span className="font-bold text-[13px]" style={{ color: "var(--fg-primary)" }}>
                  Soundtrack & Music Adjustment
                </span>
              </div>
              <div className="flex items-center space-x-1.5">
                {backgroundTrack !== "none" && (
                  <button
                    type="button"
                    onClick={handleDeleteMusic}
                    className="p-1 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title="Remove / Delete background music (Voice only)"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleToggleSoundtrackMusic}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center space-x-1 transition-all cursor-pointer"
                  style={{
                    background: isMusicPlaying ? "var(--gold)" : "var(--bg-elevated)",
                    color: isMusicPlaying ? "#ffffff" : "var(--fg-primary)",
                    border: "1px solid var(--border-subtle)",
                    boxShadow: isMusicPlaying ? "0 2px 8px rgba(143,105,27,0.3)" : "none",
                  }}
                  title="Play / stop music preview"
                >
                  {isMusicPlaying ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                  <span>{isMusicPlaying ? "Stop Music" : "Play Music"}</span>
                </button>
              </div>
            </div>

            {/* Track Selector & Delete Button */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <label className="font-bold uppercase tracking-wider text-[10px]" style={{ color: "var(--fg-secondary)" }}>
                  Acoustic Instrumental Track
                </label>
                {backgroundTrack !== "none" ? (
                  <button
                    type="button"
                    onClick={handleDeleteMusic}
                    className="text-rose-500 hover:text-rose-600 text-[10px] font-bold cursor-pointer"
                  >
                    Delete Music
                  </button>
                ) : (
                  <span className="text-[10px] font-medium" style={{ color: "var(--fg-muted)" }}>No Music</span>
                )}
              </div>
              <select
                value={backgroundTrack}
                onChange={(e) => {
                  const track = e.target.value;
                  setBackgroundTrack(track);
                  if (track === "none") {
                    audioEngine.stopMusic();
                    setIsMusicPlaying(false);
                  } else {
                    audioEngine.setMusicVolume(musicVolume / 100);
                    audioEngine.playMusic(track);
                    setIsMusicPlaying(true);
                  }
                }}
                className="w-full rounded-lg p-2 text-[12px] font-medium cursor-pointer"
                style={{
                  background: "var(--bg-elevated)",
                  color: "var(--fg-primary)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                {SOUNDTRACK_OPTIONS.map((track) => (
                  <option key={track.id} value={track.id}>
                    {track.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Music Stop Controller ("Where to stop background music") */}
            <div
              className="space-y-2 p-3 rounded-lg"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold" style={{ color: "var(--fg-primary)" }}>
                  Where to Stop Background Music:
                </span>
                <span className="text-[10px] font-mono font-bold" style={{ color: "var(--gold-dark)" }}>
                  {musicStopRule === "continuous"
                    ? "Whole Video"
                    : musicStopRule === "at-seconds"
                    ? `0s to ${musicStopSeconds}s`
                    : `Parts 1 to #${musicStopBeatIndex}`}
                </span>
              </div>

              {/* Range Presets */}
              <div className="grid grid-cols-4 gap-1.5 text-[10px]">
                <button
                  type="button"
                  onClick={() => {
                    setMusicStopRule("continuous");
                    if (useStudioStore.getState().isPlaying && backgroundTrack !== "none" && !isMusicPlaying) {
                      audioEngine.setMusicVolume(musicVolume / 100);
                      audioEngine.playMusic(backgroundTrack);
                      setIsMusicPlaying(true);
                    }
                  }}
                  className="py-1.5 px-1 rounded-md font-bold text-center cursor-pointer transition-all"
                  style={{
                    background: musicStopRule === "continuous" ? "var(--gold)" : "var(--bg-surface)",
                    color: musicStopRule === "continuous" ? "#ffffff" : "var(--fg-secondary)",
                    border: "1px solid",
                    borderColor: musicStopRule === "continuous" ? "var(--gold)" : "var(--border-subtle)",
                  }}
                >
                  Whole Video
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMusicStopRule("at-seconds");
                    setMusicStopSeconds(10);
                    if (useStudioStore.getState().isPlaying && (Date.now() - startEpochRef.current) / 1000 >= 10) {
                      audioEngine.stopMusic();
                      setIsMusicPlaying(false);
                    }
                  }}
                  className="py-1.5 px-1 rounded-md font-bold text-center cursor-pointer transition-all"
                  style={{
                    background: musicStopRule === "at-seconds" && musicStopSeconds === 10 ? "var(--gold)" : "var(--bg-surface)",
                    color: musicStopRule === "at-seconds" && musicStopSeconds === 10 ? "#ffffff" : "var(--fg-secondary)",
                    border: "1px solid",
                    borderColor: musicStopRule === "at-seconds" && musicStopSeconds === 10 ? "var(--gold)" : "var(--border-subtle)",
                  }}
                >
                  0s to 10s
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMusicStopRule("at-seconds");
                    setMusicStopSeconds(20);
                    if (useStudioStore.getState().isPlaying && (Date.now() - startEpochRef.current) / 1000 >= 20) {
                      audioEngine.stopMusic();
                      setIsMusicPlaying(false);
                    }
                  }}
                  className="py-1.5 px-1 rounded-md font-bold text-center cursor-pointer transition-all"
                  style={{
                    background: musicStopRule === "at-seconds" && musicStopSeconds === 20 ? "var(--gold)" : "var(--bg-surface)",
                    color: musicStopRule === "at-seconds" && musicStopSeconds === 20 ? "#ffffff" : "var(--fg-secondary)",
                    border: "1px solid",
                    borderColor: musicStopRule === "at-seconds" && musicStopSeconds === 20 ? "var(--gold)" : "var(--border-subtle)",
                  }}
                >
                  0s to 20s
                </button>
                <button
                  type="button"
                  onClick={() => setMusicStopRule("after-beat")}
                  className="py-1.5 px-1 rounded-md font-bold text-center cursor-pointer transition-all"
                  style={{
                    background: musicStopRule === "after-beat" ? "var(--gold)" : "var(--bg-surface)",
                    color: musicStopRule === "after-beat" ? "#ffffff" : "var(--fg-secondary)",
                    border: "1px solid",
                    borderColor: musicStopRule === "after-beat" ? "var(--gold)" : "var(--border-subtle)",
                  }}
                >
                  By Part...
                </button>
              </div>

              {/* Slider for custom seconds */}
              {musicStopRule === "at-seconds" && (
                <div className="pt-1.5 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span style={{ color: "var(--fg-secondary)" }}>Stop music after:</span>
                    <span className="font-mono font-bold" style={{ color: "var(--gold-dark)" }}>
                      {musicStopSeconds} seconds
                    </span>
                  </div>
                  <input
                    type="range"
                    min={3}
                    max={120}
                    value={musicStopSeconds}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setMusicStopSeconds(val);
                      if (useStudioStore.getState().isPlaying && (Date.now() - startEpochRef.current) / 1000 >= val) {
                        audioEngine.stopMusic();
                        setIsMusicPlaying(false);
                      }
                    }}
                    className="w-full accent-amber-600 cursor-pointer h-1.5 rounded-lg"
                    style={{ background: "var(--border-subtle)" }}
                  />
                </div>
              )}

              {/* Conditional Stop after part */}
              {musicStopRule === "after-beat" && (
                <div className="flex items-center space-x-2 pt-1">
                  <span className="text-[11px] font-medium" style={{ color: "var(--fg-secondary)" }}>
                    Stop music after part:
                  </span>
                  <select
                    value={musicStopBeatIndex}
                    onChange={(e) => setMusicStopBeatIndex(Number(e.target.value))}
                    className="p-1 rounded text-[11px] font-bold"
                    style={{
                      background: "var(--bg-surface)",
                      color: "var(--fg-primary)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    {lines.map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        Part #{i + 1}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Music Volume Slider */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[11px]">
                <span className="flex items-center space-x-1" style={{ color: "var(--fg-secondary)" }}>
                  {musicVolume > 0 ? (
                    <Volume2 className="w-3.5 h-3.5" style={{ color: "var(--fg-secondary)" }} />
                  ) : (
                    <VolumeX className="w-3.5 h-3.5 text-rose-500" />
                  )}
                  <span>Music Level</span>
                </span>
                <span className="font-mono font-bold" style={{ color: "var(--gold-dark)" }}>
                  {musicVolume}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={musicVolume}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setMusicVolume(val);
                  audioEngine.setMusicVolume(val / 100);
                  if (val > 0 && backgroundTrack !== "none" && !isMusicPlaying) {
                    audioEngine.playMusic(backgroundTrack);
                    setIsMusicPlaying(true);
                  }
                }}
                className="w-full accent-amber-600 cursor-pointer h-1.5 rounded-lg"
                style={{ background: "var(--border-subtle)" }}
              />
            </div>
          </div>

          {/* ══════════════════════════════════════════════════
              CARD 2: NARRATIVE VOICE ADAPTATION & ACOUSTICS
              ("adapt it: make it deep, make it soft, make it recorded well")
              ══════════════════════════════════════════════════ */}
          <div
            className="p-4 rounded-xl space-y-3.5"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Mic className="w-4 h-4" style={{ color: "var(--gold)" }} />
                <span className="font-bold text-[13px]" style={{ color: "var(--fg-primary)" }}>
                  Voice Adaptation & Tone
                </span>
              </div>
              <button
                type="button"
                onClick={handleTestAdaptedVoice}
                disabled={isPreviewingVoice}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center space-x-1 transition-all cursor-pointer"
                style={{
                  background: "var(--gold)",
                  color: "#ffffff",
                  boxShadow: "0 2px 8px rgba(143,105,27,0.25)",
                }}
              >
                {isPreviewingVoice ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Play className="w-3 h-3 fill-current" />
                )}
                <span>Test Voice</span>
              </button>
            </div>

            {/* Voice Tone Presets (Deep, Soft, Recorded Well, Snappy) */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--fg-secondary)" }}>
                Acoustic Delivery Style (Live Hot-Swap)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {VOICE_TONE_PRESETS.map((preset) => {
                  const isSelected = voiceToneId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectVoiceTone(preset)}
                      className="p-2.5 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between"
                      style={{
                        background: isSelected ? "var(--gold-soft)" : "var(--bg-elevated)",
                        borderColor: isSelected ? "var(--gold)" : "var(--border-subtle)",
                        boxShadow: isSelected ? "0 2px 8px rgba(143,105,27,0.18)" : "none",
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className="font-bold text-[11px]"
                          style={{ color: isSelected ? "var(--gold-dark)" : "var(--fg-primary)" }}
                        >
                          {preset.badge}
                        </span>
                        {isSelected && (
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ background: "var(--gold)" }}
                          />
                        )}
                      </div>
                      <div
                        className="text-[9px] mt-1 line-clamp-1 font-medium"
                        style={{ color: isSelected ? "var(--fg-primary)" : "var(--fg-muted)" }}
                      >
                        {preset.description}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Narrator Voice Selection with Language Filter */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--fg-secondary)" }}>
                  Narrator Cast Voice (Live Switch)
                </label>
                <span className="text-[9px] font-mono font-bold" style={{ color: "var(--gold-dark)" }}>
                  {CATALOG_VOICES.length} Studio Voices
                </span>
              </div>

              {/* Language Filter Pills */}
              <div className="flex items-center space-x-1 overflow-x-auto pb-1 text-[10px]">
                <button
                  type="button"
                  onClick={() => setVoiceLangFilter("matching")}
                  className="px-2 py-0.5 rounded font-bold transition-all cursor-pointer whitespace-nowrap"
                  style={{
                    background: voiceLangFilter === "matching" ? "var(--gold)" : "var(--bg-elevated)",
                    color: voiceLangFilter === "matching" ? "#ffffff" : "var(--fg-secondary)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  ⭐ Story Lang ({primaryLang.toUpperCase()})
                </button>
                <button
                  type="button"
                  onClick={() => setVoiceLangFilter("en")}
                  className="px-2 py-0.5 rounded font-bold transition-all cursor-pointer whitespace-nowrap"
                  style={{
                    background: voiceLangFilter === "en" ? "var(--gold)" : "var(--bg-elevated)",
                    color: voiceLangFilter === "en" ? "#ffffff" : "var(--fg-secondary)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  🇺🇸 English (20)
                </button>
                <button
                  type="button"
                  onClick={() => setVoiceLangFilter("ar")}
                  className="px-2 py-0.5 rounded font-bold transition-all cursor-pointer whitespace-nowrap"
                  style={{
                    background: voiceLangFilter === "ar" ? "var(--gold)" : "var(--bg-elevated)",
                    color: voiceLangFilter === "ar" ? "#ffffff" : "var(--fg-secondary)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  🇸🇦 العربية (20)
                </button>
                <button
                  type="button"
                  onClick={() => setVoiceLangFilter("fr")}
                  className="px-2 py-0.5 rounded font-bold transition-all cursor-pointer whitespace-nowrap"
                  style={{
                    background: voiceLangFilter === "fr" ? "var(--gold)" : "var(--bg-elevated)",
                    color: voiceLangFilter === "fr" ? "#ffffff" : "var(--fg-secondary)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  🇫🇷 Français (12)
                </button>
                <button
                  type="button"
                  onClick={() => setVoiceLangFilter("iconic")}
                  className="px-2 py-0.5 rounded font-bold transition-all cursor-pointer whitespace-nowrap"
                  style={{
                    background: voiceLangFilter === "iconic" ? "var(--gold)" : "var(--bg-elevated)",
                    color: voiceLangFilter === "iconic" ? "#ffffff" : "var(--fg-secondary)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  🎭 Iconic & Meme (5)
                </button>
                <button
                  type="button"
                  onClick={() => setVoiceLangFilter("all")}
                  className="px-2 py-0.5 rounded font-bold transition-all cursor-pointer whitespace-nowrap"
                  style={{
                    background: voiceLangFilter === "all" ? "var(--gold)" : "var(--bg-elevated)",
                    color: voiceLangFilter === "all" ? "#ffffff" : "var(--fg-secondary)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  All ({CATALOG_VOICES.length})
                </button>
              </div>

              <select
                value={selectedVoiceId}
                onChange={(e) => handleVoiceChange(e.target.value)}
                className="w-full rounded-lg p-2 text-[12px] font-medium cursor-pointer"
                style={{
                  background: "var(--bg-elevated)",
                  color: "var(--fg-primary)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                {/* Specific Language Selected */}
                {voiceLangFilter !== "all" && voiceLangFilter !== "matching" && voiceLangFilter !== "iconic" && (
                  <optgroup label={`${voiceLangFilter.toUpperCase()} Studio Neural Voices`}>
                    {CATALOG_VOICES.filter((v) => v.lang === voiceLangFilter).map((voice) => (
                      <option key={voice.id} value={voice.id}>
                        {voice.flagEmoji} {voice.name} — {voice.gender} • {voice.style} ({voice.region})
                      </option>
                    ))}
                  </optgroup>
                )}

                {/* Iconic & Meme Selected */}
                {voiceLangFilter === "iconic" && (
                  <optgroup label="🎭 Iconic & Meme Voices (Pop-Culture & Sci-Fi)">
                    {CATALOG_VOICES.filter((v) => v.category === "Iconic & Meme").map((voice) => (
                      <option key={voice.id} value={voice.id}>
                        {voice.flagEmoji} {voice.name} — {voice.gender} • {voice.style}
                      </option>
                    ))}
                  </optgroup>
                )}

                {/* Matching or All: Story language first */}
                {(voiceLangFilter === "matching" || voiceLangFilter === "all") && (
                  <>
                    <optgroup label={`⭐ Primary Story Language (${primaryLang.toUpperCase()}) Recommended Voices`}>
                      {CATALOG_VOICES.filter((v) => v.lang === primaryLang).map((voice) => (
                        <option key={voice.id} value={voice.id}>
                          {voice.flagEmoji} {voice.name} — {voice.gender} • {voice.style} ({voice.region})
                        </option>
                      ))}
                    </optgroup>

                    {voiceLangFilter === "all" && (
                      <>
                        <optgroup label="🇺🇸 🇬🇧 🇦🇺 English Studio Readers">
                          {CATALOG_VOICES.filter((v) => v.lang === "en" && v.lang !== primaryLang && v.category !== "Iconic & Meme").map((voice) => (
                            <option key={voice.id} value={voice.id}>
                              {voice.flagEmoji} {voice.name} — {voice.gender} • {voice.style} ({voice.region})
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="🎭 Iconic & Meme Character Voices">
                          {CATALOG_VOICES.filter((v) => v.category === "Iconic & Meme").map((voice) => (
                            <option key={voice.id} value={voice.id}>
                              {voice.flagEmoji} {voice.name} — {voice.gender} • {voice.style}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="🇸🇦 🇪🇬 🇦🇪 Arabic Dialects & MSA Readers">
                          {CATALOG_VOICES.filter((v) => v.lang === "ar" && v.lang !== primaryLang).map((voice) => (
                            <option key={voice.id} value={voice.id}>
                              {voice.flagEmoji} {voice.name} — {voice.gender} • {voice.style} ({voice.region})
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="🇫🇷 🇨🇦 Francophone Neural Readers">
                          {CATALOG_VOICES.filter((v) => v.lang === "fr" && v.lang !== primaryLang).map((voice) => (
                            <option key={voice.id} value={voice.id}>
                              {voice.flagEmoji} {voice.name} — {voice.gender} • {voice.style} ({voice.region})
                            </option>
                          ))}
                        </optgroup>
                      </>
                    )}
                  </>
                )}
              </select>
            </div>

            {/* Fine-Tuning Sliders (Pitch & Rate) */}
            <div
              className="space-y-2 p-2.5 rounded-lg"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}
            >
              <div className="flex items-center justify-between text-[11px]">
                <span className="flex items-center space-x-1" style={{ color: "var(--fg-secondary)" }}>
                  <Sliders className="w-3 h-3" style={{ color: "var(--gold)" }} />
                  <span>Pitch Fine-Tuning (Instant in Video)</span>
                </span>
                <span className="font-mono font-bold" style={{ color: "var(--gold-dark)" }}>
                  {computedPitchString}
                </span>
              </div>
              <input
                type="range"
                min={-15}
                max={15}
                value={pitchOffset}
                onChange={(e) => handlePitchChange(Number(e.target.value))}
                className="w-full accent-amber-600 cursor-pointer h-1.5 rounded-lg"
                style={{ background: "var(--border-subtle)" }}
              />

              <div className="flex items-center justify-between text-[11px] pt-1">
                <span style={{ color: "var(--fg-secondary)" }}>Speech Pace (Instant in Video)</span>
                <span className="font-mono font-bold" style={{ color: "var(--gold-dark)" }}>
                  {computedRateString}
                </span>
              </div>
              <input
                type="range"
                min={-20}
                max={25}
                value={rateOffset}
                onChange={(e) => handleRateChange(Number(e.target.value))}
                className="w-full accent-amber-600 cursor-pointer h-1.5 rounded-lg"
                style={{ background: "var(--border-subtle)" }}
              />

              <button
                type="button"
                onClick={handleApplyVoiceToAllParts}
                className="w-full mt-2 py-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer text-center"
                style={{
                  background: "var(--bg-surface)",
                  color: "var(--gold-dark)",
                  border: "1px solid var(--gold)",
                  boxShadow: "0 1px 4px rgba(143,105,27,0.12)",
                }}
              >
                Apply Adapted Voice to All Parts
              </button>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════
              CARD 3: SUBTITLE STYLE & PACING
              ══════════════════════════════════════════════════ */}
          <div
            className="p-4 rounded-xl space-y-3"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
          >
            <label className="text-[13px] font-bold block" style={{ color: "var(--fg-primary)" }}>
              Subtitle Preset & Kinetic Style
            </label>
            <select
              value={subtitleStyle}
              onChange={(e) => setSubtitleStyle(e.target.value)}
              className="w-full rounded-lg p-2 text-[12px] font-medium cursor-pointer"
              style={{
                background: "var(--bg-elevated)",
                color: "var(--fg-primary)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <option value="gold-contrast">✨ Gold Illuminated Glow (Cinema)</option>
              <option value="tiktok-viral">🔥 TikTok Viral Yellow (High Impact)</option>
              <option value="boxed-matte">🔲 Matte Frosted Glass (Clean)</option>
              <option value="clean-minimal">🤍 Clean White Cinema Drop-Shadow</option>
            </select>

            {/* Pacing buttons */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider flex items-center justify-between" style={{ color: "var(--fg-secondary)" }}>
                <span>Words Per Frame & Sentence Mode</span>
                <span className="text-[9px] font-mono" style={{ color: "var(--gold-dark)" }}>
                  {wordsPerFrame >= 999 ? "Full Sentence" : `${wordsPerFrame} Words`}
                </span>
              </label>
              <div className="grid grid-cols-5 gap-1 text-[9.5px]">
                {[
                  { count: 3, label: "3 Words" },
                  { count: 5, label: "5 Words" },
                  { count: 8, label: "8 Words" },
                  { count: 12, label: "12 Words" },
                  { count: 999, label: "Sentence" },
                ].map((item) => (
                  <button
                    key={item.count}
                    type="button"
                    onClick={() => setWordsPerFrame(item.count)}
                    className="py-1.5 px-0.5 rounded-md font-bold transition-all text-center cursor-pointer whitespace-nowrap"
                    style={{
                      background: wordsPerFrame === item.count ? "var(--gold)" : "var(--bg-elevated)",
                      color: wordsPerFrame === item.count ? "#ffffff" : "var(--fg-secondary)",
                      border: "1px solid",
                      borderColor: wordsPerFrame === item.count ? "var(--gold)" : "var(--border-subtle)",
                    }}
                    title={item.count >= 999 ? "Display full sentences matching natural speech pacing" : `Display ${item.count} words per subtitle frame`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════
              CARD 4: BROADCAST PRODUCTION EXPORTS
              ══════════════════════════════════════════════════ */}
          <div
            className="p-4 rounded-xl space-y-2.5"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
          >
            <div className="font-bold text-[13px]" style={{ color: "var(--fg-primary)" }}>
              Broadcast Production Exports
            </div>

            {/* 1. Mixed Audio Master (Voice + Music) */}
            <button
              type="button"
              onClick={handleExportMixedMaster}
              disabled={isExportingMixed}
              className="w-full py-2.5 px-3 rounded-lg text-[12px] font-bold flex items-center justify-between transition-all duration-200 active:scale-[0.98] cursor-pointer"
              style={{
                background: "var(--gold)",
                color: "#ffffff",
                boxShadow: "0 2px 10px rgba(143,105,27,0.25)",
              }}
            >
              <div className="flex items-center space-x-2">
                <Music className="w-4 h-4" />
                <span>Export Master Audio (Voice + Music)</span>
              </div>
              {isExportingMixed ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            </button>

            {/* 2. Pure Voice Master (Narrative Seul) */}
            <button
              type="button"
              onClick={handleExportVoiceMaster}
              disabled={isExportingAudio}
              className="w-full py-2.5 px-3 rounded-lg text-[12px] font-semibold flex items-center justify-between transition-all duration-200 active:scale-[0.98] cursor-pointer"
              style={{
                background: "var(--bg-elevated)",
                color: "var(--fg-primary)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div className="flex items-center space-x-2">
                <Download className="w-4 h-4" style={{ color: "var(--fg-secondary)" }} />
                <span>Export Pure Narration Voice Only (.mp3)</span>
              </div>
              {isExportingAudio && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            </button>

            {/* Resolution Selector: 720p (Fast) vs 1080p (HQ) */}
            <div className="flex items-center justify-between p-2 rounded-lg" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
              <span className="text-[11px] font-bold" style={{ color: "var(--fg-secondary)" }}>
                Export Quality:
              </span>
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => setVideoResolution("720p")}
                  className="px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer"
                  style={{
                    background: videoResolution === "720p" ? "var(--gold)" : "transparent",
                    color: videoResolution === "720p" ? "#ffffff" : "var(--fg-muted)",
                  }}
                >
                  ⚡ 720p (Fast)
                </button>
                <button
                  type="button"
                  onClick={() => setVideoResolution("1080p")}
                  className="px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer"
                  style={{
                    background: videoResolution === "1080p" ? "var(--gold)" : "transparent",
                    color: videoResolution === "1080p" ? "#ffffff" : "var(--fg-muted)",
                  }}
                >
                  💎 1080p (HQ)
                </button>
              </div>
            </div>

            {/* 3. Full Production MP4 Video Export (Entire Video) */}
            <button
              type="button"
              onClick={handleExportProductionVideo}
              disabled={isExportingVideo}
              className="w-full mt-2 py-3 px-3 rounded-xl text-[13px] font-bold flex items-center justify-center space-x-2 transition-all duration-200 active:scale-[0.98] cursor-pointer"
              style={{
                background: isExportingVideo ? "var(--gold-dark)" : "var(--green)",
                color: "#ffffff",
                boxShadow: "0 4px 16px rgba(26,84,53,0.3)",
              }}
            >
              {isExportingVideo ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Rendering Video Timeline (.mp4)...</span>
                </>
              ) : (
                <>
                  <Video className="w-4 h-4" />
                  <span>Export Entire Video ({videoResolution})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Free AI Scene Generation Modal (Pollinations.ai / FLUX.1) */}
      {isAiSceneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div
            className="w-full max-w-md p-5 rounded-2xl space-y-4 shadow-2xl"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--gold)",
              boxShadow: "0 8px 32px rgba(143,105,27,0.25)",
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5" style={{ color: "var(--gold)" }} />
                <h3 className="font-bold text-[15px]" style={{ color: "var(--fg-primary)" }}>
                  Generate Free AI Scene (FLUX.1)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAiSceneModalOpen(false)}
                className="text-stone-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-[12px]" style={{ color: "var(--fg-secondary)" }}>
              Describe the setting or character shot you want FLUX to create for this scene (100% Free, Instant):
            </p>

            <textarea
              rows={3}
              value={aiScenePrompt}
              onChange={(e) => setAiScenePrompt(e.target.value)}
              placeholder="e.g. Peter Griffin exploring a neon cyberpunk street at night, cinematic 9:16 portrait..."
              className="w-full p-2.5 rounded-xl text-[12px] bg-black/40 border border-stone-700 text-white outline-none focus:border-amber-500"
            />

            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsAiSceneModalOpen(false)}
                className="px-3.5 py-1.5 rounded-lg text-[12px] font-medium text-stone-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGenerateAiScene}
                disabled={isGeneratingAiScene || !aiScenePrompt.trim()}
                className="px-4 py-2 rounded-xl text-[12px] font-bold flex items-center space-x-1.5 text-white cursor-pointer"
                style={{
                  background: "var(--gold)",
                  boxShadow: "0 2px 10px rgba(143,105,27,0.3)",
                }}
              >
                {isGeneratingAiScene ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Painting Scene with FLUX...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate Artwork</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Export Complete Modal */}
      {exportedVideoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div
            className="w-full max-w-md p-5 rounded-2xl space-y-4 shadow-2xl"
            style={{
              background: "var(--bg-surface)",
              border: "1.5px solid var(--gold)",
              boxShadow: "0 12px 40px rgba(143,105,27,0.35)",
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base" style={{ color: "var(--fg-primary)" }}>
                  Video Generated & Exported!
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setExportedVideoModal(null)}
                className="text-stone-400 hover:text-white text-sm cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            {/* Video Player Preview */}
            <div className="w-full aspect-[9/16] max-h-64 rounded-xl overflow-hidden bg-black mx-auto flex items-center justify-center border border-stone-800">
              <video
                src={exportedVideoModal.blobUrl}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            </div>

            {/* File info details */}
            <div
              className="p-3 rounded-xl flex items-center justify-between text-xs font-mono"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}
            >
              <div className="truncate mr-2 font-bold" style={{ color: "var(--fg-primary)" }}>
                🎬 {exportedVideoModal.filename}
              </div>
              <div className="shrink-0 font-bold" style={{ color: "var(--gold)" }}>
                {(exportedVideoModal.fileSize / (1024 * 1024)).toFixed(1)} MB • {videoResolution}
              </div>
            </div>

            {/* Actions: Open in Windows Explorer & Direct Download Link */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={async () => {
                  try {
                    await openExportFolder();
                    setExportFeedback("Opened exports folder in Windows Explorer!");
                    setTimeout(() => setExportFeedback(null), 3000);
                  } catch {
                    // ignore
                  }
                }}
                className="py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--fg-primary)",
                }}
              >
                <span>📁 Open Export Folder</span>
              </button>

              <a
                href={exportedVideoModal.blobUrl}
                download={exportedVideoModal.filename}
                className="py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 text-white transition-all cursor-pointer"
                style={{
                  background: "var(--gold)",
                  boxShadow: "0 2px 10px rgba(143,105,27,0.3)",
                }}
              >
                <Download className="w-4 h-4" />
                <span>Save .MP4</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Footer */}
      <div className="pt-4 flex justify-between items-center" style={{ borderTop: "1px solid var(--border-subtle)" }}>
        <button
          type="button"
          onClick={() => setStudioStep("script")}
          className="px-4 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 active:scale-[0.98] cursor-pointer"
          style={{
            background: "var(--bg-elevated)",
            color: "var(--fg-secondary)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          {primaryLang === "ar" ? "العودة: النص" : "Back: Script Editor"}
        </button>

        <div className="text-[12px] font-medium" style={{ color: "var(--fg-muted)" }}>
          StoryForge Studio • Drag & Drop Video Parts • Adaptive Voice Tone
        </div>
      </div>
    </div>
  );
}
