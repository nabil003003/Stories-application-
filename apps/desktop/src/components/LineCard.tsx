import React from "react";
import { Play, Pause, Trash2, Mic, ChevronDown, Scissors, Split, Film } from "lucide-react";
import { StoryLine, CharacterDef } from "../store/useStudioStore";
import { CATALOG_VOICES } from "../services/voiceCatalog";
import { FALLBACK_CURATED_MEDIA } from "../services/mediaService";

interface LineCardProps {
  line: StoryLine;
  idx: number;
  linesCount: number;
  storyMode: "dialogue" | "story";
  characters: CharacterDef[];
  isLinePlaying: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onPreview: () => void;
  onUpdate: (updates: Partial<StoryLine>) => void;
  onDelete: () => void;
  onSplit?: () => void;
  onMerge?: () => void;
}

export function LineCard({
  line,
  idx,
  linesCount,
  storyMode,
  characters,
  isLinePlaying,
  isExpanded,
  onToggleExpand,
  onPreview,
  onUpdate,
  onDelete,
  onSplit,
  onMerge,
}: LineCardProps): React.JSX.Element {
  const isArabic = line.language === "ar";

  const getLinePlaceholder = (index: number, lang: string) => {
    if (lang === "ar") {
      return index === 0
        ? "أدخل الجملة الافتتاحية للمشهد هنا..."
        : "أدخل جملة الحوار أو السرد التالية...";
    }
    return index === 0
      ? "Enter opening dialogue line here..."
      : "Enter the next dialogue response...";
  };

  return (
    <div
      className="rounded-xl transition-all duration-300 animate-slide-up"
      style={{
        background: "var(--bg-surface)",
        border: isLinePlaying
          ? storyMode === "story"
            ? "1px solid var(--green)"
            : "1px solid var(--gold)"
          : "1px solid var(--border-subtle)",
        boxShadow: isLinePlaying
          ? storyMode === "story"
            ? "0 0 20px rgba(26,84,53,0.15)"
            : "0 0 20px rgba(143,105,27,0.15)"
          : "none",
      }}
    >
      {/* Line Header */}
      <div
        className="flex items-center justify-between px-4 py-2.5 line-header"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <div className="flex items-center space-x-3">
          <span
            className="text-[11px] font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "var(--bg-elevated)", color: "var(--fg-muted)" }}
          >
            {idx + 1}
          </span>

          {/* Speaker or Beat indicator */}
          {storyMode === "story" ? (
            <div className="flex items-center space-x-2">
              <span className="text-[12px] font-bold" style={{ color: "var(--green)" }}>
                Narrator
              </span>
              <span
                className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold"
                style={{
                  background: "var(--green-soft)",
                  color: "var(--green)",
                  border: "1px solid rgba(26,84,53,0.2)",
                }}
              >
                Scene Beat #{idx + 1}
              </span>
            </div>
          ) : (
            <select
              value={line.speaker}
              onChange={(e) => {
                const char = characters.find((c) => c.name === e.target.value);
                if (char) {
                  onUpdate({
                    speaker: char.name,
                    voice: char.voice,
                    language: char.language,
                    mood: char.style || line.mood,
                  });
                }
              }}
              className="text-[13px] font-semibold bg-transparent cursor-pointer"
              style={{ color: "var(--fg-primary)", border: "none", outline: "none" }}
            >
              {characters.map((c) => (
                <option key={c.id} value={c.name} style={{ background: "var(--bg-elevated)" }}>
                  {c.name}
                </option>
              ))}
            </select>
          )}

          {/* Voice Model Tag */}
          <span
            className="text-[10px] font-mono px-2 py-0.5 rounded-full font-medium"
            style={{
              background: "var(--bg-elevated)",
              color: "var(--fg-secondary)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            {line.voice ? line.voice.split("-").slice(-1)[0].replace("Neural", "") : "Voice"}
          </span>

          {/* Assigned Video Clip Tag */}
          {line.videoId && (
            <span
              className="text-[10px] font-mono px-2 py-0.5 rounded-full font-medium flex items-center space-x-1"
              style={{
                background: "rgba(245,158,11,0.12)",
                color: "var(--gold)",
                border: "1px solid rgba(245,158,11,0.25)",
              }}
              title="Assigned video loop for this scene"
            >
              <Film className="w-2.5 h-2.5 text-amber-500" />
              <span className="max-w-[110px] truncate">
                {FALLBACK_CURATED_MEDIA.find((m) => m.id === line.videoId)?.title || line.videoId}
              </span>
            </span>
          )}

          {/* Animated Equalizer Bars when playing (Fix 16) */}
          {isLinePlaying && (
            <div className="flex items-center gap-0.5 px-2" title="Voice playing">
              {[0.5, 1.0, 0.7, 0.9, 0.6].map((h, barIdx) => (
                <div
                  key={barIdx}
                  style={{
                    width: 3,
                    height: `${h * 15}px`,
                    background: storyMode === "story" ? "var(--green)" : "var(--gold)",
                    borderRadius: 2,
                    animation: `audioBar 0.75s ease-in-out ${barIdx * 0.12}s infinite alternate`,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-1">
          {storyMode === "story" && onSplit && (
            <button
              type="button"
              onClick={onSplit}
              className="p-1.5 rounded-lg transition-all duration-200 text-stone-500 hover:text-stone-800 cursor-pointer"
              title="Split this story beat into two scenes"
            >
              <Scissors className="w-3.5 h-3.5" />
            </button>
          )}

          {storyMode === "story" && idx < linesCount - 1 && onMerge && (
            <button
              type="button"
              onClick={onMerge}
              className="p-1.5 rounded-lg transition-all duration-200 text-stone-500 hover:text-stone-800 cursor-pointer"
              title="Merge with next scene beat"
            >
              <Split className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={onToggleExpand}
            className="p-1.5 rounded-lg transition-all duration-200"
            style={{ color: "var(--fg-muted)" }}
            title="Voice & style settings"
          >
            <ChevronDown
              className="w-3.5 h-3.5 transition-transform duration-200"
              style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
            />
          </button>

          <button
            type="button"
            id={`preview-line-${idx}`}
            onClick={onPreview}
            className="p-1.5 rounded-lg transition-all duration-200 cursor-pointer"
            style={{
              background: isLinePlaying
                ? storyMode === "story"
                  ? "var(--green)"
                  : "var(--gold)"
                : "transparent",
              color: isLinePlaying ? "#ffffff" : "var(--fg-muted)",
            }}
            title="Preview dialogue audio"
          >
            {isLinePlaying ? (
              <Pause className="w-3.5 h-3.5 fill-current" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
          </button>

          {linesCount > 1 && (
            <button
              type="button"
              onClick={onDelete}
              className="p-1.5 rounded-lg transition-all duration-200 cursor-pointer"
              style={{ color: "var(--fg-muted)" }}
              title="Delete line"
            >
              <Trash2 className="w-3.5 h-3.5 hover:text-red-600" />
            </button>
          )}
        </div>
      </div>

      {/* Expanded Voice Controls */}
      {isExpanded && (
        <div
          className="px-4 py-3 flex flex-wrap gap-3 animate-slide-down"
          style={{ borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-card)" }}
        >
          <div className="flex items-center space-x-2 flex-1 min-w-[200px]">
            <Mic className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--gold)" }} />
            <select
              value={line.voice}
              onChange={(e) => onUpdate({ voice: e.target.value })}
              className="flex-1 text-[12px] font-medium rounded-lg px-2 py-1.5 cursor-pointer"
              style={{
                background: "var(--bg-elevated)",
                color: "var(--fg-primary)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <optgroup label={`Voices for ${line.language.toUpperCase()}`}>
                {CATALOG_VOICES.filter((v) => v.lang === line.language).map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.flag} {v.name} ({v.gender} • {v.style})
                  </option>
                ))}
              </optgroup>
              <optgroup label="Other Voices">
                {CATALOG_VOICES.filter((v) => v.lang !== line.language).map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.flag} {v.name} ({v.lang.toUpperCase()})
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Beat Video Clip Selector */}
          <div className="flex items-center space-x-2 flex-1 min-w-[200px]">
            <Film className="w-3.5 h-3.5 shrink-0 text-amber-500" />
            <select
              value={line.videoId || ""}
              onChange={(e) => onUpdate({ videoId: e.target.value || undefined })}
              className="flex-1 text-[12px] font-medium rounded-lg px-2 py-1.5 cursor-pointer"
              style={{
                background: "var(--bg-elevated)",
                color: "var(--fg-primary)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <option value="">🎬 Inherit Project Video</option>
              {FALLBACK_CURATED_MEDIA.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title} ({m.theme.replace("_", " ")})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Dialogue Textarea */}
      <div className="px-4 py-4">
        <textarea
          dir={isArabic ? "rtl" : "ltr"}
          value={line.text}
          onChange={(e) => onUpdate({ text: e.target.value })}
          placeholder={getLinePlaceholder(idx, line.language)}
          rows={storyMode === "story" ? 5 : 3}
          className="w-full text-[16px] leading-[1.8] bg-transparent resize-y placeholder-opacity-50"
          style={{
            color: "var(--fg-primary)",
            border: "none",
            outline: "none",
            minHeight: storyMode === "story" ? "120px" : "80px",
            maxHeight: "450px",
            overflowY: "auto",
            fontFamily: isArabic ? "'Noto Sans Arabic', 'Inter', sans-serif" : "'Inter', sans-serif",
            fontSize: isArabic ? "18px" : "16px",
            lineHeight: isArabic ? "2.0" : "1.8",
          }}
        />
      </div>
    </div>
  );
}
