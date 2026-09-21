import React from "react";
import { Plus, ChevronRight, Mic, Play, Loader2 } from "lucide-react";
import { useStudioStore, CharacterDef } from "../store/useStudioStore";
import { CharacterCard } from "./CharacterCard";
import { CATALOG_VOICES } from "../services/voiceCatalog";
import { audioEngine } from "../services/audioEngine";

export function StepCast(): React.JSX.Element {
  const primaryLang = useStudioStore((s) => s.primaryLang);
  const storyMode = useStudioStore((s) => s.storyMode);
  const lines = useStudioStore((s) => s.lines);
  const setLines = useStudioStore((s) => s.setLines);
  const characters = useStudioStore((s) => s.characters);
  const updateCharacter = useStudioStore((s) => s.updateCharacter);
  const addCharacter = useStudioStore((s) => s.addCharacter);
  const deleteCharacter = useStudioStore((s) => s.deleteCharacter);
  const previewingVoiceId = useStudioStore((s) => s.previewingVoiceId);
  const setPreviewingVoiceId = useStudioStore((s) => s.setPreviewingVoiceId);
  const setStudioStep = useStudioStore((s) => s.setStudioStep);

  const handleAuditionVoice = async (voiceId: string, lang: "en" | "ar" | "fr") => {
    setPreviewingVoiceId(voiceId);
    const phrase =
      lang === "ar"
        ? "في أعماق الليل الساكن، حيث تتلألأ النجوم، تبدأ حكايتنا."
        : lang === "fr"
        ? "Sous le ciel étoilé où résonne le murmure des vagues, commence notre histoire."
        : "Across the quiet horizon where ancient starlight meets the sea, our story begins.";

    try {
      await audioEngine.speak({
        text: phrase,
        voice: voiceId,
        language: lang,
      });
    } catch (err) {
      console.warn("Audition error:", err);
    } finally {
      setPreviewingVoiceId(null);
    }
  };

  const handleAddCharacter = () => {
    const count = characters.length + 1;
    const langVoices = CATALOG_VOICES.filter((v) => v.lang === primaryLang);
    const nextVoice =
      langVoices[(count - 1) % Math.max(1, langVoices.length)]?.id ||
      (primaryLang === "ar" ? "ar-EG-ShakirNeural" : primaryLang === "fr" ? "fr-FR-DeniseNeural" : "en-US-JennyNeural");

    const newChar: CharacterDef = {
      id: `c-${Date.now()}`,
      name: primaryLang === "ar" ? `شخصية ${count}` : primaryLang === "fr" ? `Personnage ${count}` : `Character ${count}`,
      role: primaryLang === "ar" ? "دور مساند" : primaryLang === "fr" ? "Rôle Secondaire" : "Supporting Cast",
      voice: nextVoice,
      language: primaryLang,
      pitch: 1.0,
      speed: 1.0,
      style: "Cinematic",
    };
    addCharacter(newChar);
  };

  const narrator = characters[0] || {
    id: "c-narrator",
    name: "Narrator",
    role: "Lead Narrator",
    voice: primaryLang === "ar" ? "ar-SA-HamedNeural" : "en-US-ChristopherNeural",
    language: primaryLang,
    pitch: 1.0,
    speed: 1.15,
    style: "Cinematic",
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {storyMode === "story" ? (
        /* Solo Narrator Studio */
        <div
          className="p-6 rounded-2xl space-y-5 animate-slide-up"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
        >
          <div className="flex items-center justify-between pb-3" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
            <div className="flex items-center space-x-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-[13px]"
                style={{ background: "var(--green-soft)", color: "var(--green)", border: "1px solid var(--green-soft)" }}
              >
                <Mic className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-[15px] flex items-center space-x-2" style={{ color: "var(--fg-primary)" }}>
                  <span>{narrator.name}</span>
                  <span
                    className="text-[10px] font-mono px-2 py-0.5 rounded border"
                    style={{ background: "var(--bg-elevated)", borderColor: "var(--border-subtle)", color: "var(--fg-secondary)" }}
                  >
                    {narrator.language.toUpperCase()}
                  </span>
                </div>
                <div className="text-[12px]" style={{ color: "var(--fg-muted)" }}>
                  Solo Narrator • Voicing all {lines.length} story scene beats
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={previewingVoiceId === narrator.voice}
              onClick={() => handleAuditionVoice(narrator.voice, narrator.language)}
              className="px-3.5 py-1.5 rounded-lg text-[12px] font-bold flex items-center space-x-1.5 transition-all duration-200 active:scale-95 cursor-pointer"
              style={{
                background: "var(--green)",
                color: "#ffffff",
                boxShadow: "0 2px 8px rgba(26,84,53,0.25)",
              }}
            >
              {previewingVoiceId === narrator.voice ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
              <span>{primaryLang === "ar" ? "تجربة صوت الراوي" : "Audition Narrator Voice"}</span>
            </button>
          </div>

          {/* Voice Model Selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold" style={{ color: "var(--fg-secondary)" }}>
              {primaryLang === "ar" ? "اختر صوت الراوي الرئيسي" : "Select Narrator Voice Model"}
            </label>
            <select
              value={narrator.voice}
              onChange={(e) => {
                const newVoice = e.target.value;
                const vObj = CATALOG_VOICES.find((v) => v.id === newVoice);
                const newLang = vObj?.lang || narrator.language;
                updateCharacter(narrator.id, { voice: newVoice, language: newLang });
                setLines(lines.map((l) => ({ ...l, voice: newVoice, language: newLang })));
              }}
              className="w-full rounded-lg p-2.5 text-[12px] font-medium"
              style={{
                background: "var(--bg-elevated)",
                color: "var(--fg-primary)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <optgroup label={`⭐ Recommended Voices for ${primaryLang.toUpperCase()}`}>
                {CATALOG_VOICES.filter((v) => v.lang === primaryLang).map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.flagEmoji} {v.name} — {v.gender} • {v.style} ({v.region})
                  </option>
                ))}
              </optgroup>
              {primaryLang !== "en" && (
                <optgroup label="🇺🇸 🇬🇧 English Voices">
                  {CATALOG_VOICES.filter((v) => v.lang === "en").map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.flagEmoji} {v.name} — {v.gender} • {v.style} ({v.region})
                    </option>
                  ))}
                </optgroup>
              )}
              {primaryLang !== "ar" && (
                <optgroup label="🇸🇦 🇪🇬 Arabic Voices">
                  {CATALOG_VOICES.filter((v) => v.lang === "ar").map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.flagEmoji} {v.name} — {v.gender} • {v.style} ({v.region})
                    </option>
                  ))}
                </optgroup>
              )}
              {primaryLang !== "fr" && (
                <optgroup label="🇫🇷 🇨🇦 French Voices">
                  {CATALOG_VOICES.filter((v) => v.lang === "fr").map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.flagEmoji} {v.name} — {v.gender} • {v.style} ({v.region})
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* Speed & Pitch Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3 rounded-xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
              <div className="flex justify-between items-center text-[12px]" style={{ color: "var(--fg-secondary)" }}>
                <span className="font-semibold">{primaryLang === "ar" ? "سرعة السرد" : "Narration Pace / Speed"}</span>
                <span className="font-mono font-bold" style={{ color: "var(--fg-primary)" }}>{narrator.speed.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.75"
                max="1.35"
                step="0.05"
                value={narrator.speed}
                onChange={(e) => updateCharacter(narrator.id, { speed: parseFloat(e.target.value) })}
                className="w-full mt-2"
              />
            </div>

            <div className="p-3 rounded-xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
              <div className="flex justify-between items-center text-[12px]" style={{ color: "var(--fg-secondary)" }}>
                <span className="font-semibold">{primaryLang === "ar" ? "نبرة الصوت" : "Vocal Pitch Offset"}</span>
                <span className="font-mono font-bold" style={{ color: "var(--fg-primary)" }}>{narrator.pitch.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.75"
                max="1.25"
                step="0.05"
                value={narrator.pitch}
                onChange={(e) => updateCharacter(narrator.id, { pitch: parseFloat(e.target.value) })}
                className="w-full mt-2"
              />
            </div>
          </div>
        </div>
      ) : (
        /* Multi-Character Dialogue Cast Grid */
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              id="add-character"
              onClick={handleAddCharacter}
              className="px-3.5 py-1.5 rounded-lg text-[13px] font-bold flex items-center space-x-1.5 transition-all duration-200 active:scale-[0.98] cursor-pointer"
              style={{
                background: "var(--gold)",
                color: "#ffffff",
                boxShadow: "0 2px 10px rgba(143,105,27,0.2)",
              }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{primaryLang === "ar" ? "إضافة شخصية" : "Add Character"}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-children">
            {characters.map((char) => (
              <CharacterCard
                key={char.id}
                char={char}
                charactersCount={characters.length}
                primaryLang={primaryLang}
                previewingVoiceId={previewingVoiceId}
                onPreview={() => handleAuditionVoice(char.voice, char.language)}
                onUpdate={(updates) => updateCharacter(char.id, updates)}
                onDelete={() => deleteCharacter(char.id)}
              />
            ))}
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
          {primaryLang === "ar" ? "العودة: النص" : "Back: Script"}
        </button>

        <button
          type="button"
          id="next-to-soundtrack"
          onClick={() => setStudioStep("audio")}
          className="px-5 py-2.5 rounded-lg font-bold text-[13px] flex items-center space-x-2 transition-all duration-200 active:scale-[0.98] cursor-pointer"
          style={{
            background: storyMode === "story" ? "var(--green)" : "var(--gold)",
            color: "#ffffff",
            boxShadow:
              storyMode === "story"
                ? "0 2px 12px rgba(26,84,53,0.25)"
                : "0 2px 12px rgba(143,105,27,0.2)",
          }}
        >
          <span>
            {storyMode === "story"
              ? primaryLang === "ar"
                ? "التالي: اختيار الموسيقى"
                : "Next: Soundtrack"
              : primaryLang === "ar"
              ? "التالي: اختيار الموسيقى"
              : "Next: Soundtrack"}
          </span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
