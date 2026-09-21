import React, { useState } from "react";
import { Music, Play, Pause, ChevronRight } from "lucide-react";
import { useStudioStore } from "../store/useStudioStore";
import { audioEngine } from "../services/audioEngine";

export const SOUNDTRACK_TRACKS = [
  {
    id: "beethoven_moonlight.ogg",
    title: "Beethoven — Moonlight Sonata (Op. 27)",
    subtitle: "Pure Classical Acoustic Piano • Adagio Sostenuto (Clean)",
    duration: "05:15",
    category: "Classical Piano",
  },
  {
    id: "spanish_romance_guitar.ogg",
    title: "Spanish Romance (Romance Anónimo)",
    subtitle: "Pure Classical Fingerstyle Acoustic Guitar (Clean)",
    duration: "02:40",
    category: "Acoustic Guitar",
  },
  {
    id: "beethoven_fur_elise.ogg",
    title: "Beethoven — Für Elise (WoO 59)",
    subtitle: "Pure Acoustic Piano • Bagatelle in A Minor (Clean)",
    duration: "03:10",
    category: "Classical Piano",
  },
  {
    id: "recuerdos_guitar.ogg",
    title: "Tárrega — Recuerdos de la Alhambra",
    subtitle: "Pure Classical Spanish Guitar • Tremolo Mastery",
    duration: "04:15",
    category: "Acoustic Guitar",
  },
  {
    id: "calm_rain.wav",
    title: "Calm Reflection & Soft Piano",
    subtitle: "Acoustic Piano with Subtle Rain Atmosphere",
    duration: "05:30",
    category: "Piano Ambience",
  },
  {
    id: "none",
    title: "No Background Music",
    subtitle: "Dry voice narration only • 100% Pure Dialogue",
    duration: "--:--",
    category: "Mute",
  },
];

export function StepSoundtrack(): React.JSX.Element {
  const primaryLang = useStudioStore((s) => s.primaryLang);
  const backgroundTrack = useStudioStore((s) => s.backgroundTrack);
  const setBackgroundTrack = useStudioStore((s) => s.setBackgroundTrack);
  const musicVolume = useStudioStore((s) => s.musicVolume);
  const setMusicVolume = useStudioStore((s) => s.setMusicVolume);
  const isMusicPlaying = useStudioStore((s) => s.isMusicPlaying);
  const setIsMusicPlaying = useStudioStore((s) => s.setIsMusicPlaying);
  const setStudioStep = useStudioStore((s) => s.setStudioStep);

  const [previewingTrackId, setPreviewingTrackId] = useState<string | null>(null);

  const handleToggleTrackPreview = (trackId: string) => {
    if (isMusicPlaying && previewingTrackId === trackId) {
      audioEngine.stopMusic();
      setIsMusicPlaying(false);
      setPreviewingTrackId(null);
    } else {
      audioEngine.setMusicVolume(musicVolume / 100);
      audioEngine.playMusic(trackId);
      setIsMusicPlaying(true);
      setPreviewingTrackId(trackId);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Current Active Track & Volume Player */}
      <div
        className="p-5 rounded-xl space-y-4 animate-slide-up"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid rgba(212,168,50,0.3)",
          boxShadow: "0 4px 20px rgba(212,168,50,0.05)",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              id="music-play-toggle"
              type="button"
              onClick={() => handleToggleTrackPreview(backgroundTrack)}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 cursor-pointer"
              style={{
                background: "var(--gold)",
                color: "#ffffff",
                boxShadow: "0 2px 12px rgba(212,168,50,0.25)",
              }}
            >
              {isMusicPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>
            <div>
              <div className="text-[13px] font-bold flex items-center space-x-2" style={{ color: "var(--fg-primary)" }}>
                <span>{SOUNDTRACK_TRACKS.find((t) => t.id === backgroundTrack)?.title || "No Track"}</span>
                {isMusicPlaying && (
                  <span
                    className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold animate-pulse"
                    style={{ background: "var(--gold)", color: "#ffffff" }}
                  >
                    ACTIVE
                  </span>
                )}
              </div>
              <div className="text-[12px]" style={{ color: "var(--fg-muted)" }}>
                {isMusicPlaying ? "Playing • Pure Instrument (Zero Noise)" : "Click to preview instrument"}
              </div>
            </div>
          </div>
          <span className="font-mono text-[13px] font-bold" style={{ color: "var(--gold)" }}>
            {musicVolume}%
          </span>
        </div>

        {/* Volume Slider */}
        <div className="space-y-2 pt-1" style={{ borderTop: "1px solid var(--border-subtle)" }}>
          <div className="flex justify-between text-[12px]">
            <span className="font-medium" style={{ color: "var(--fg-secondary)" }}>
              {primaryLang === "ar" ? "مستوى صوت الآلة في الخلفية" : "Background Instrument Volume"}
            </span>
            <span className="font-mono font-bold" style={{ color: "var(--gold)" }}>{musicVolume}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={musicVolume}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              setMusicVolume(val);
              audioEngine.setMusicVolume(val / 100);
            }}
            className="w-full"
          />
          <div className="flex justify-between text-[10px] font-mono" style={{ color: "var(--fg-muted)" }}>
            <span>0% (Silent)</span>
            <span>25% (Soft Background)</span>
            <span>50% (Prominent)</span>
            <span>100% (Full)</span>
          </div>
        </div>
      </div>

      {/* Track List */}
      <div className="space-y-3">
        <label className="font-bold text-[13px] block" style={{ color: "var(--fg-primary)" }}>
          {primaryLang === "ar" ? "اختر العزف الموسيقي النقي" : "Choose Pure Instrument"}
        </label>
        <div className="space-y-2 stagger-children">
          {SOUNDTRACK_TRACKS.map((trk) => {
            const isSelected = backgroundTrack === trk.id;
            const isThisPlaying = isMusicPlaying && previewingTrackId === trk.id;

            return (
              <div
                key={trk.id}
                className="p-3.5 rounded-xl transition-all duration-200 flex items-center justify-between text-[13px] cursor-pointer animate-slide-up"
                style={{
                  background: isSelected ? "var(--gold-soft)" : "var(--bg-surface)",
                  border: isSelected ? "1px solid rgba(212,168,50,0.3)" : "1px solid var(--border-subtle)",
                }}
                onClick={() => {
                  setBackgroundTrack(trk.id);
                  if (trk.id !== "none") {
                    audioEngine.setMusicVolume(musicVolume / 100);
                    audioEngine.playMusic(trk.id);
                    setIsMusicPlaying(true);
                    setPreviewingTrackId(trk.id);
                  } else {
                    audioEngine.stopMusic();
                    setIsMusicPlaying(false);
                    setPreviewingTrackId(null);
                  }
                }}
              >
                <div className="flex items-center space-x-3 flex-1">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center border shrink-0"
                    style={{
                      background: isSelected ? "var(--gold-soft)" : "var(--bg-elevated)",
                      borderColor: isSelected ? "var(--gold)" : "var(--border-subtle)",
                      color: isSelected ? "var(--gold)" : "var(--fg-muted)",
                    }}
                  >
                    <Music className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold flex items-center space-x-2" style={{ color: "var(--fg-primary)" }}>
                      <span>{trk.title}</span>
                      {isSelected && (
                        <span
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded font-mono"
                          style={{ background: "var(--gold)", color: "#ffffff" }}
                        >
                          SELECTED
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] mt-0.5" style={{ color: "var(--fg-muted)" }}>
                      {trk.subtitle}
                    </div>
                  </div>
                </div>

                {trk.id !== "none" && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleTrackPreview(trk.id);
                    }}
                    className="px-3 py-1.5 rounded-lg text-[12px] font-semibold flex items-center space-x-1.5 transition-all duration-200 cursor-pointer"
                    style={{
                      background: isThisPlaying ? "var(--gold)" : "var(--bg-elevated)",
                      color: isThisPlaying ? "#ffffff" : "var(--gold)",
                      border: isThisPlaying ? "none" : "1px solid var(--border-subtle)",
                    }}
                  >
                    {isThisPlaying ? (
                      <>
                        <Pause className="w-3.5 h-3.5 fill-current" />
                        <span>Playing</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Listen</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="pt-4 flex justify-between items-center" style={{ borderTop: "1px solid var(--border-subtle)" }}>
        <button
          type="button"
          onClick={() => setStudioStep("characters")}
          className="px-4 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 active:scale-[0.98] cursor-pointer"
          style={{
            background: "var(--bg-elevated)",
            color: "var(--fg-secondary)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          {primaryLang === "ar" ? "العودة: الشخصيات" : "Back: Characters"}
        </button>

        <button
          type="button"
          id="next-to-video"
          onClick={() => setStudioStep("video")}
          className="px-5 py-2.5 rounded-lg font-bold text-[13px] flex items-center space-x-2 transition-all duration-200 active:scale-[0.98] cursor-pointer"
          style={{
            background: "var(--gold)",
            color: "#ffffff",
            boxShadow: "0 2px 12px rgba(143,105,27,0.25)",
          }}
        >
          <span>{primaryLang === "ar" ? "التالي: الفيديو والتصدير" : "Next: Video & Export"}</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
