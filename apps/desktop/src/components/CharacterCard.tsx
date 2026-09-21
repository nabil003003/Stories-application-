import React from "react";
import { Play, Loader2, Trash2 } from "lucide-react";
import { CharacterDef } from "../store/useStudioStore";
import { CATALOG_VOICES } from "../services/voiceCatalog";

interface CharacterCardProps {
  char: CharacterDef;
  charactersCount: number;
  primaryLang: "en" | "ar" | "fr";
  previewingVoiceId: string | null;
  onPreview: () => void;
  onUpdate: (updates: Partial<CharacterDef>) => void;
  onDelete: () => void;
}

export function CharacterCard({
  char,
  charactersCount,
  primaryLang,
  previewingVoiceId,
  onPreview,
  onUpdate,
  onDelete,
}: CharacterCardProps): React.JSX.Element {
  const isPreviewing = previewingVoiceId === char.voice;

  return (
    <div
      className="p-4 rounded-xl space-y-3 transition-all duration-200 animate-slide-up"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      {/* Name & Language */}
      <div className="flex items-center justify-between">
        <input
          type="text"
          value={char.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          className="font-bold text-[13px] bg-transparent w-2/3"
          style={{
            color: "var(--fg-primary)",
            border: "none",
            outline: "none",
          }}
        />
        <div className="flex items-center space-x-2">
          <span
            className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
            style={{
              background: "var(--gold-soft)",
              color: "var(--gold)",
              border: "1px solid rgba(143,105,27,0.2)",
            }}
          >
            {char.language}
          </span>
          {charactersCount > 1 && (
            <button
              type="button"
              onClick={onDelete}
              className="p-1 rounded text-stone-400 hover:text-red-600 transition-colors"
              title="Delete character"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Voice Model Selector */}
      <div className="space-y-1">
        <label className="text-[11px] font-medium" style={{ color: "var(--fg-muted)" }}>
          {primaryLang === "ar" ? "الصوت" : "Voice Model"}
        </label>
        <select
          value={char.voice}
          onChange={(e) => {
            const newVoice = e.target.value;
            const vObj = CATALOG_VOICES.find((v) => v.id === newVoice);
            onUpdate({ voice: newVoice, language: vObj?.lang || char.language });
          }}
          className="w-full rounded-lg p-2 text-[12px]"
          style={{
            background: "var(--bg-elevated)",
            color: "var(--fg-primary)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          {(() => {
            const charLang = char.language || primaryLang;
            const langLabels: Record<string, string> = {
              ar: "🇸🇦 🇪🇬 Arabic Voices (العربية)",
              en: "🇺🇸 🇬🇧 English Voices",
              fr: "🇫🇷 🇨🇦 French Voices (Français)",
            };
            const orderedLangs: ("ar" | "en" | "fr")[] = [
              charLang as "ar" | "en" | "fr",
              ...(["ar", "en", "fr"] as const).filter((l) => l !== charLang),
            ];
            return (
              <>
                <optgroup label="🎭 Iconic & Meme Voices (Peter G, Bob Sponge, Vader, Rick)">
                  {CATALOG_VOICES.filter((v) => v.category === "Iconic & Meme").map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.flagEmoji} {v.name} — {v.style}
                    </option>
                  ))}
                </optgroup>
                {orderedLangs.map((langKey) => (
                  <optgroup
                    key={langKey}
                    label={
                      langKey === charLang
                        ? `⭐ ${langLabels[langKey]} (Selected Language)`
                        : langLabels[langKey]
                    }
                  >
                    {CATALOG_VOICES.filter((v) => v.lang === langKey && v.category !== "Iconic & Meme").map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.flagEmoji} {v.name} — {v.gender} • {v.style} ({v.region})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </>
            );
          })()}
        </select>
      </div>

      {/* Sliders */}
      <div className="grid grid-cols-2 gap-3 text-[11px]">
        <div
          className="p-2.5 rounded-lg"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}
        >
          <div className="flex justify-between items-center" style={{ color: "var(--fg-secondary)" }}>
            <span>{primaryLang === "ar" ? "السرعة" : "Speed"}</span>
            <span className="font-mono font-bold" style={{ color: "var(--fg-primary)" }}>
              {char.speed.toFixed(2)}x
            </span>
          </div>
          <input
            type="range"
            min="0.75"
            max="1.35"
            step="0.05"
            value={char.speed}
            onChange={(e) => onUpdate({ speed: parseFloat(e.target.value) })}
            className="w-full mt-1.5"
          />
        </div>

        <div
          className="p-2.5 rounded-lg"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}
        >
          <div className="flex justify-between items-center" style={{ color: "var(--fg-secondary)" }}>
            <span>{primaryLang === "ar" ? "النبرة" : "Pitch"}</span>
            <span className="font-mono font-bold" style={{ color: "var(--fg-primary)" }}>
              {char.pitch.toFixed(2)}x
            </span>
          </div>
          <input
            type="range"
            min="0.75"
            max="1.25"
            step="0.05"
            value={char.pitch}
            onChange={(e) => onUpdate({ pitch: parseFloat(e.target.value) })}
            className="w-full mt-1.5"
          />
        </div>
      </div>

      {/* Audition Button with Loading Spinner (Fix 15) */}
      <div className="pt-1">
        <button
          type="button"
          onClick={onPreview}
          disabled={isPreviewing}
          className="w-full py-2 rounded-lg text-[12px] font-bold flex items-center justify-center space-x-1.5 transition-all duration-200 active:scale-[0.98] cursor-pointer"
          style={{
            background: "var(--bg-elevated)",
            color: "var(--gold)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          {isPreviewing ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>{primaryLang === "ar" ? "جار التحميل..." : "Loading voice..."}</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{primaryLang === "ar" ? "تجربة الصوت" : "Audition Voice"}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
