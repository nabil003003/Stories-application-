import React, { useRef, useEffect, useState } from "react";
import {
  Play,
  Pause,
  ImageIcon,
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  Film,
  SkipBack,
  SkipForward,
  Repeat,
} from "lucide-react";
import { StoryLine } from "../store/useStudioStore";

interface VideoPlayerProps {
  currentPlayingLine: StoryLine;
  allLines: StoryLine[];
  isPlaying: boolean;
  playbackSeconds: number;
  captionProgress: number;
  wordsPerFrame: number;
  subtitleStyle: string;
  videoAspectRatio: "16:9" | "9:16";
  selectedVideoId?: string;
  customVideoUrl?: string;
  isLooping?: boolean;
  onTogglePlay: () => void;
  onNextBeat?: () => void;
  onPrevBeat?: () => void;
  onSelectBeat?: (lineId: string) => void;
  onToggleLoop?: () => void;
  onDropVideo?: (videoId: string, applyToAll?: boolean) => void;
  onOpenMediaExplorer?: (lineId: string) => void;
}

function sliceIntoDynamicCaptionChunks(text: string, wordsPerFrame: number = 4): string[] {
  if (!text || !text.trim()) return ["..."];
  const trimmed = text.trim();

  // Full Sentence Mode (wordsPerFrame >= 999)
  if (wordsPerFrame >= 999) {
    const sentenceRegex = /[^.!?؟;\n]+[.!?؟;\n]*/g;
    const matches = trimmed.match(sentenceRegex);
    if (matches && matches.length > 0) {
      const clean = matches.map((m) => m.trim()).filter(Boolean);
      if (clean.length > 0) return clean;
    }
    return [trimmed];
  }

  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length <= wordsPerFrame) return [trimmed];

  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += wordsPerFrame) {
    chunks.push(words.slice(i, i + wordsPerFrame).join(" "));
  }
  return chunks.length > 0 ? chunks : [trimmed];
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function VideoPlayer({
  currentPlayingLine,
  allLines,
  isPlaying,
  playbackSeconds,
  captionProgress,
  wordsPerFrame,
  subtitleStyle,
  videoAspectRatio,
  selectedVideoId = "vid-desert-01",
  customVideoUrl,
  isLooping = false,
  onTogglePlay,
  onNextBeat,
  onPrevBeat,
  onSelectBeat,
  onToggleLoop,
  onDropVideo,
  onOpenMediaExplorer,
}: VideoPlayerProps): React.JSX.Element {
  const [isDragOver, setIsDragOver] = useState(false);
  const isArabic = currentPlayingLine.language === "ar";
  const captionChunks = React.useMemo(
    () => sliceIntoDynamicCaptionChunks(currentPlayingLine.text, wordsPerFrame),
    [currentPlayingLine.text, wordsPerFrame]
  );
  const activeChunkIndex = React.useMemo(() => {
    if (captionChunks.length <= 1) return 0;
    const progress = Math.max(0, Math.min(0.999, captionProgress));

    const chunkWordCounts = captionChunks.map(
      (c) => Math.max(1, c.trim().split(/\s+/).filter(Boolean).length)
    );
    const totalWords = chunkWordCounts.reduce((a, b) => a + b, 0);
    const targetWord = progress * totalWords;

    let accumulated = 0;
    for (let i = 0; i < chunkWordCounts.length; i++) {
      accumulated += chunkWordCounts[i];
      if (targetWord < accumulated) {
        return i;
      }
    }
    return captionChunks.length - 1;
  }, [captionChunks, captionProgress]);
  const displayedWords = captionChunks[activeChunkIndex] || currentPlayingLine.text;

  // Compute subtitle styling based on active preset
  let subtitleClasses = "";
  let subtitleStyles: React.CSSProperties = {
    fontFamily: isArabic ? "'Noto Sans Arabic', 'Inter', sans-serif" : "'Inter', sans-serif",
  };

  switch (subtitleStyle) {
    case "tiktok-viral":
      subtitleClasses =
        "px-5 py-2.5 rounded-2xl bg-black/85 backdrop-blur-md font-black uppercase tracking-wider border-2 border-yellow-400";
      subtitleStyles = {
        ...subtitleStyles,
        color: "#FFE500",
        textShadow:
          "-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 0 4px 14px rgba(0,0,0,1)",
        WebkitTextStroke: "1.2px #000",
        boxShadow: "0 8px 30px rgba(255, 229, 0, 0.4), 0 4px 12px rgba(0,0,0,0.8)",
      };
      break;

    case "gold-contrast":
      subtitleClasses =
        "px-6 py-3 rounded-2xl bg-black/80 backdrop-blur-md font-black tracking-wide border border-amber-400/90";
      subtitleStyles = {
        ...subtitleStyles,
        color: "#FBBF24",
        textShadow:
          "-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 0 4px 14px rgba(0,0,0,0.95)",
        WebkitTextStroke: "1px rgba(0,0,0,0.9)",
        boxShadow: "0 10px 35px rgba(245, 158, 11, 0.38), 0 4px 16px rgba(0,0,0,0.85)",
      };
      break;

    case "boxed-matte":
      subtitleClasses =
        "px-6 py-3 rounded-xl bg-stone-950/85 backdrop-blur-lg font-black tracking-wide border border-white/25";
      subtitleStyles = {
        ...subtitleStyles,
        color: "#FFFFFF",
        textShadow:
          "-1.5px -1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px 1.5px 0 #000, 1.5px 1.5px 0 #000, 0 4px 12px rgba(0,0,0,0.9)",
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.85)",
      };
      break;

    case "clean-minimal":
    default:
      subtitleClasses = "font-black tracking-wide inline-block";
      subtitleStyles = {
        ...subtitleStyles,
        color: "#FFFFFF",
        textShadow:
          "-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 0 3px 6px #000, 0 6px 20px rgba(0,0,0,0.95), 0 10px 30px rgba(0,0,0,0.9)",
        WebkitTextStroke: "1px #000",
      };
      break;
  }

  const currentIdx = allLines.findIndex((l) => l.id === currentPlayingLine.id);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Resolved video stream URL: Use the line's specific assigned clip, or fallback to selected project clip
  const activeVideoId = currentPlayingLine.videoId || selectedVideoId || "vid-love-01";
  // Use a relative URL so the request stays same-origin in both dev (Vite proxy) and Tauri production.
  // An absolute http://127.0.0.1:8000 URL is cross-origin from tauri://localhost and causes silent failures.
  const videoSrc = customVideoUrl || `/api/media/local/${activeVideoId}`;

  // Keep video playing smoothly
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        // Autoplay policy fallback
      });
    }
  }, [videoSrc]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only deactivate if leaving the container
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const videoId =
      e.dataTransfer.getData("text/plain") ||
      e.dataTransfer.getData("videoId") ||
      e.dataTransfer.getData("application/x-storyforge-video");
    if (videoId && onDropVideo) {
      onDropVideo(videoId);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative w-full overflow-hidden bg-black shadow-2xl flex flex-col justify-between select-none ${
        videoAspectRatio === "16:9"
          ? "aspect-video rounded-2xl border-2 border-stone-800"
          : "aspect-[9/16] max-h-[710px] max-w-[395px] mx-auto rounded-[36px] border-[5px] border-stone-800 shadow-[0_25px_80px_rgba(0,0,0,0.9)]"
      }`}
      style={{
        boxShadow: isDragOver
          ? "0 0 35px rgba(245,158,11,0.6)"
          : "0 25px 70px rgba(0,0,0,0.85)",
        borderColor: isDragOver ? "var(--gold)" : undefined,
      }}
    >
      {/* Phone Dynamic Island / Camera Punch-Hole for 9:16 */}
      {videoAspectRatio === "9:16" && (
        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-24 h-4.5 rounded-full bg-black/90 border border-white/10 z-30 flex items-center justify-end px-2 space-x-1 pointer-events-none">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/90 animate-pulse" />
        </div>
      )}
      {/* Drag & Drop Visual Target Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-40 bg-amber-500/20 backdrop-blur-sm border-4 border-dashed border-amber-400 rounded-2xl flex flex-col items-center justify-center space-y-3 animate-pulse pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-amber-400 text-stone-950 flex items-center justify-center shadow-2xl">
            <Film className="w-8 h-8" />
          </div>
          <div className="text-center px-4">
            <div className="font-black text-base md:text-lg text-white drop-shadow-md">
              Drop Clip to Add to Video
            </div>
            <div className="text-xs font-bold text-amber-200 mt-0.5">
              Adds clip to timeline & divides narrative time equally
            </div>
          </div>
        </div>
      )}

      {/* 1. Real Downloaded Background Video Loop */}
      <video
        ref={videoRef}
        key={videoSrc}
        src={videoSrc}
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover transition-all duration-700 pointer-events-none"
        style={{ filter: "brightness(0.65) contrast(1.1)" }}
      />

      {/* Fallback subtle dark gradient in case video is buffering */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/70 pointer-events-none" />

      {/* Cinematic Vignette & Subtle Film Grain */}
      <div className="absolute inset-0 pointer-events-none cinematic-vignette opacity-80" />
      <div className="absolute inset-0 pointer-events-none cinematic-film-grain opacity-30" />

      {/* Top Header Badge */}
      <div className="relative z-20 p-3 flex items-center justify-between pointer-events-none">
        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-bold text-white tracking-wide">
          <Film className="w-3 h-3 text-amber-400" />
          <span>
            {videoAspectRatio === "9:16" ? "TikTok / Shorts 9:16" : "Widescreen 16:9"}
          </span>
          <span className="text-stone-400">•</span>
          <span className="text-emerald-400">Offline Video Active</span>
        </div>
      </div>

      {/* TikTok Side Engagement Bar (Visual Framing for 9:16 Vertical Mode) */}
      {videoAspectRatio === "9:16" && (
        <div className="absolute right-3 bottom-24 z-20 flex flex-col items-center space-y-4 pointer-events-none opacity-85">
          <div className="flex flex-col items-center">
            <div className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white border border-white/15">
              <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
            </div>
            <span className="text-[9px] font-bold text-white mt-0.5">84.2K</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white border border-white/15">
              <MessageCircle className="w-4 h-4" />
            </div>
            <span className="text-[9px] font-bold text-white mt-0.5">1.4K</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white border border-white/15">
              <Bookmark className="w-4 h-4 text-amber-400 fill-amber-400" />
            </div>
            <span className="text-[9px] font-bold text-white mt-0.5">24K</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white border border-white/15">
              <Share2 className="w-4 h-4" />
            </div>
            <span className="text-[9px] font-bold text-white mt-0.5">Share</span>
          </div>
        </div>
      )}

      {/* Dynamic Subtitles: In the MIDDLE of the phone as requested */}
      <div
        className={`relative z-20 px-4 my-auto text-center flex flex-col items-center justify-center pointer-events-none min-h-[100px] ${
          videoAspectRatio === "9:16" ? "max-w-[340px] mx-auto" : "max-w-xl mx-auto"
        }`}
      >
        <div
          key={`${currentPlayingLine.id}-${activeChunkIndex}-${subtitleStyle}`}
          dir={isArabic ? "rtl" : "ltr"}
          className={`leading-tight select-none transition-opacity duration-150 ${
            videoAspectRatio === "9:16" ? "text-xl sm:text-2xl" : "text-xl sm:text-2xl md:text-3xl"
          } ${subtitleClasses}`}
          style={subtitleStyles}
        >
          {displayedWords}
        </div>

        {/* Dynamic Frame Pacing Indicator (Stable, zero vibration) */}
        {captionChunks.length > 1 && (
          captionChunks.length > 8 ? (
            <div className="mt-2.5 w-24 h-1 bg-white/20 rounded-full overflow-hidden mx-auto">
              <div
                className="h-full rounded-full transition-all duration-150"
                style={{
                  width: `${Math.round(((activeChunkIndex + 1) / captionChunks.length) * 100)}%`,
                  background: "var(--gold)",
                  boxShadow: "0 0 6px var(--gold)",
                }}
              />
            </div>
          ) : (
            <div className="mt-2.5 flex items-center justify-center space-x-1.5 opacity-90">
              {captionChunks.map((_, i) => (
                <div
                  key={i}
                  className="h-1 rounded-full transition-all duration-150"
                  style={{
                    width: i === activeChunkIndex ? "18px" : "6px",
                    background: i === activeChunkIndex ? "var(--gold)" : "rgba(255,255,255,0.4)",
                    boxShadow: i === activeChunkIndex ? "0 0 8px var(--gold)" : "none",
                  }}
                />
              ))}
            </div>
          )
        )}
      </div>

      {/* Player Bottom Control Bar */}
      <div className="relative z-20 p-3 bg-gradient-to-t from-black/95 via-black/80 to-transparent flex flex-col space-y-2">
        {/* Sentence Navigation Scrubber (Jump to any sentence) */}
        {allLines.length > 1 && (
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center space-x-1 overflow-x-auto py-0.5 max-w-[280px] scrollbar-none">
              {allLines.map((line, idx) => (
                <button
                  key={line.id}
                  type="button"
                  onClick={() => onSelectBeat && onSelectBeat(line.id)}
                  className={`h-5 px-2 rounded-full text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                    idx === currentIdx
                      ? "bg-amber-400 text-stone-950 font-black shadow-md"
                      : "bg-white/15 text-stone-300 hover:bg-white/30"
                  }`}
                  title={`Jump to Scene Beat #${idx + 1}`}
                >
                  #{idx + 1}
                </button>
              ))}
            </div>

            {onToggleLoop && (
              <button
                type="button"
                onClick={onToggleLoop}
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center space-x-1 transition-all cursor-pointer ${
                  isLooping
                    ? "bg-amber-400/20 text-amber-300 border border-amber-400/40"
                    : "text-stone-400 hover:text-white"
                }`}
                title="Loop replay all sentences continuously"
              >
                <Repeat className="w-3 h-3" />
                <span>{isLooping ? "Replay: ON" : "Replay: OFF"}</span>
              </button>
            )}
          </div>
        )}

        {/* Main Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {/* Previous Beat */}
            {onPrevBeat && (
              <button
                type="button"
                onClick={onPrevBeat}
                disabled={currentIdx <= 0}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all disabled:opacity-25 disabled:cursor-not-allowed hover:bg-white/20 text-white cursor-pointer"
                title="Previous Scene Beat"
              >
                <SkipBack className="w-4 h-4 fill-current" />
              </button>
            )}

            {/* Play/Pause Button */}
            <button
              type="button"
              onClick={onTogglePlay}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 shrink-0 cursor-pointer shadow-lg"
              style={{ background: "var(--gold)", color: "#ffffff" }}
              title={isPlaying ? "Pause playback" : "Play entire story video with narration"}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            {/* Next Beat */}
            {onNextBeat && (
              <button
                type="button"
                onClick={onNextBeat}
                disabled={currentIdx >= allLines.length - 1}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all disabled:opacity-25 disabled:cursor-not-allowed hover:bg-white/20 text-white cursor-pointer"
                title="Next Scene Beat"
              >
                <SkipForward className="w-4 h-4 fill-current" />
              </button>
            )}

            <div className="pl-1">
              <div className="text-[11px] font-bold text-white flex items-center space-x-1.5">
                <span>{isPlaying ? "Playing Story..." : "Preview Video"}</span>
              </div>
              <div className="text-[9px] text-stone-400 flex items-center space-x-1.5 font-mono">
                <span>{formatTime(playbackSeconds)}</span>
                <span>•</span>
                <span className="text-amber-300 font-bold">
                  Sentence {currentIdx >= 0 ? currentIdx + 1 : 1} of {allLines.length}
                </span>
              </div>
            </div>
          </div>

          {onOpenMediaExplorer && (
            <button
              type="button"
              onClick={() => onOpenMediaExplorer(currentPlayingLine.id)}
              className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center space-x-1 transition-colors cursor-pointer"
              style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}
              title="Browse video library"
            >
              <ImageIcon className="w-3 h-3" />
              <span>Clips</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
