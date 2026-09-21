import React, { useState } from "react";
import {
  Sparkles,
  Plus,
  ChevronRight,
  Activity,
  Trash2,
} from "lucide-react";
import { useStudioStore, StoryLine } from "../store/useStudioStore";
import { LineCard } from "./LineCard";
import { audioEngine } from "../services/audioEngine";
import { parseScriptText } from "../services/scriptParser";

export function StepScript(): React.JSX.Element {
  const primaryLang = useStudioStore((s) => s.primaryLang);
  const setPrimaryLang = useStudioStore((s) => s.setPrimaryLang);
  const storyMode = useStudioStore((s) => s.storyMode);
  const setStoryMode = useStudioStore((s) => s.setStoryMode);
  const lines = useStudioStore((s) => s.lines);
  const setLines = useStudioStore((s) => s.setLines);
  const updateLine = useStudioStore((s) => s.updateLine);
  const deleteLine = useStudioStore((s) => s.deleteLine);
  const splitLine = useStudioStore((s) => s.splitLine);
  const mergeLine = useStudioStore((s) => s.mergeLine);
  const addLine = useStudioStore((s) => s.addLine);
  const clearAllLines = useStudioStore((s) => s.clearAllLines);
  const characters = useStudioStore((s) => s.characters);
  const expandedLineId = useStudioStore((s) => s.expandedLineId);
  const setExpandedLineId = useStudioStore((s) => s.setExpandedLineId);
  const humanActingProsodyEnabled = useStudioStore((s) => s.humanActingProsodyEnabled);
  const setHumanActingProsodyEnabled = useStudioStore((s) => s.setHumanActingProsodyEnabled);
  const isPlaying = useStudioStore((s) => s.isPlaying);
  const setIsPlaying = useStudioStore((s) => s.setIsPlaying);
  const playingLineId = useStudioStore((s) => s.playingLineId);
  const setPlayingLineId = useStudioStore((s) => s.setPlayingLineId);
  const setStudioStep = useStudioStore((s) => s.setStudioStep);

  // Script Importer
  const [importText, setImportText] = useState("");
  const [showImporter, setShowImporter] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const handlePreviewLine = async (line: StoryLine) => {
    if (isPlaying && playingLineId === line.id) {
      audioEngine.stopSpeech();
      setIsPlaying(false);
      setPlayingLineId(null);
      return;
    }

    setIsPlaying(true);
    setPlayingLineId(line.id);

    await audioEngine.speak({
      text: line.text,
      voice: line.voice,
      language: line.language,
      onEnd: () => {
        setIsPlaying(false);
        setPlayingLineId(null);
      },
    });
  };

  const handleAddLine = () => {
    const speakerChar = characters[lines.length % characters.length] || characters[0];
    const newLine: StoryLine = {
      id: `line-${Date.now()}`,
      speaker: storyMode === "story" ? "Narrator" : (speakerChar ? speakerChar.name : "Speaker 1"),
      voice: speakerChar ? speakerChar.voice : (primaryLang === "ar" ? "ar-SA-HamedNeural" : "en-US-ChristopherNeural"),
      language: primaryLang,
      mood: "Cinematic",
      text: "",
      cameraShot: "close-up",
    };
    addLine(newLine);
  };

  const handleImportScript = () => {
    if (!importText.trim()) return;
    const result = parseScriptText(importText, storyMode);
    if (result && result.lines.length > 0) {
      setLines(
        result.lines.map((l, i) => ({
          id: `line-${Date.now()}-${i}`,
          speaker: l.speaker,
          voice: l.voice,
          language: l.language,
          mood: l.mood || "Cinematic",
          text: l.text,
        }))
      );
      setShowImporter(false);
      setImportText("");
      setStatusNotice(`Successfully imported ${result.lines.length} lines!`);
      setTimeout(() => setStatusNotice(null), 3000);
    }
  };

  const totalWords = lines.reduce((acc, cur) => acc + (cur.text ? cur.text.trim().split(/\s+/).length : 0), 0);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Notification Toast */}
      {statusNotice && (
        <div
          className="p-3 rounded-xl text-[13px] font-semibold flex items-center space-x-2 animate-slide-down"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--gold)",
            color: "var(--fg-primary)",
            boxShadow: "0 4px 20px rgba(143,105,27,0.12)",
          }}
        >
          <Sparkles className="w-4 h-4" style={{ color: "var(--gold)" }} />
          <span>{statusNotice}</span>
        </div>
      )}

      {/* Toolbar: Language + Mode + AI Button + Prosody Switch */}
      <div
        className="p-4 rounded-xl flex flex-wrap items-center justify-between gap-3"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
      >
        <div className="flex flex-wrap items-center gap-2">
          {/* Language Selector */}
          <div className="flex rounded-lg p-0.5 border" style={{ borderColor: "var(--border-subtle)", background: "var(--bg-elevated)" }}>
            {(["en", "ar", "fr"] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setPrimaryLang(lang)}
                className="px-2.5 py-1 rounded text-[11px] font-bold uppercase transition-all cursor-pointer"
                style={{
                  background: primaryLang === lang ? "var(--gold)" : "transparent",
                  color: primaryLang === lang ? "#ffffff" : "var(--fg-secondary)",
                }}
              >
                {lang}
              </button>
            ))}
          </div>

          {/* Mode Selector */}
          <div className="flex rounded-lg p-0.5 border" style={{ borderColor: "var(--border-subtle)", background: "var(--bg-elevated)" }}>
            <button
              type="button"
              onClick={() => setStoryMode("dialogue")}
              className="px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer"
              style={{
                background: storyMode === "dialogue" ? "var(--gold)" : "transparent",
                color: storyMode === "dialogue" ? "#ffffff" : "var(--fg-secondary)",
              }}
            >
              Dialogue Cast
            </button>
            <button
              type="button"
              onClick={() => setStoryMode("story")}
              className="px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer"
              style={{
                background: storyMode === "story" ? "var(--green)" : "transparent",
                color: storyMode === "story" ? "#ffffff" : "var(--fg-secondary)",
              }}
            >
              Solo Story
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Conversational Prosody Acting Toggle (Fix 12) */}
          <button
            type="button"
            onClick={() => setHumanActingProsodyEnabled((v) => !v)}
            className="px-3 py-1.5 rounded-lg text-[12px] font-bold flex items-center space-x-1.5 transition-all cursor-pointer border"
            style={{
              background: humanActingProsodyEnabled ? "var(--gold-soft)" : "var(--bg-elevated)",
              borderColor: humanActingProsodyEnabled ? "var(--gold)" : "var(--border-subtle)",
              color: humanActingProsodyEnabled ? "var(--gold)" : "var(--fg-muted)",
            }}
            title="Toggle dynamic conversational voice pitch, breathing pauses, and speed inflections"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{humanActingProsodyEnabled ? "Smart Acting: ON" : "Smart Acting: OFF"}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowImporter((v) => !v)}
            className="px-2.5 py-1.5 rounded-lg text-[12px] font-medium border text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
            style={{ borderColor: "var(--border-subtle)", background: "var(--bg-elevated)" }}
          >
            Import
          </button>

          {/* Clear Script Button */}
          <button
            type="button"
            onClick={() => {
              if (lines.length === 0 || confirm("Clear all script lines to start fresh?")) {
                clearAllLines();
                setStatusNotice("Script cleared! You can now write your own story.");
                setTimeout(() => setStatusNotice(null), 3000);
              }
            }}
            className="px-2.5 py-1.5 rounded-lg text-[12px] font-medium border text-red-500 hover:text-red-700 hover:bg-red-500/10 transition-colors flex items-center space-x-1 cursor-pointer"
            style={{ borderColor: "var(--border-subtle)", background: "var(--bg-elevated)" }}
            title="Wipe demo lines and start with a clean blank canvas"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Script Importer Drawer */}
      {showImporter && (
        <div
          className="p-4 rounded-xl space-y-3 animate-slide-down"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
        >
          <div className="font-bold text-[13px]">Paste Screenplay Text</div>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={5}
            placeholder="CharacterName: Dialogue line...&#10;OtherPerson: Response line..."
            className="w-full p-2.5 rounded-lg text-[13px] outline-none font-mono"
            style={{
              background: "var(--bg-elevated)",
              color: "var(--fg-primary)",
              border: "1px solid var(--border-subtle)",
            }}
          />
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setShowImporter(false)}
              className="px-3 py-1.5 rounded-lg text-[12px] font-medium text-stone-600"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleImportScript}
              className="px-4 py-1.5 rounded-lg text-[12px] font-bold text-white"
              style={{ background: "var(--gold)" }}
            >
              Parse & Import
            </button>
          </div>
        </div>
      )}

      {/* Dialogue / Narrative Story Lines List */}
      <div className="space-y-3 stagger-children">
        {lines.length === 0 ? (
          <div
            className="p-12 rounded-2xl text-center space-y-4 border-2 border-dashed"
            style={{ borderColor: "var(--border-subtle)", background: "var(--bg-surface)" }}
          >
            <div
              className="w-12 h-12 rounded-full mx-auto flex items-center justify-center font-bold text-lg"
              style={{ background: "var(--gold-soft)", color: "var(--gold)" }}
            >
              ✍️
            </div>
            <div className="space-y-1">
              <div className="font-bold text-[15px]" style={{ color: "var(--fg-primary)" }}>
                {primaryLang === "ar" ? "ابدأ كتابة قصتك السردية" : "Clean Canvas Ready"}
              </div>
              <div className="text-[12px] text-stone-400">
                {primaryLang === "ar"
                  ? "أضف مقطعك السردي الأول أو الصق النص الكامل مباشرة للبدء"
                  : "Add your first scene beat or paste your text to begin."}
              </div>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleAddLine}
                className="px-4 py-2 rounded-lg font-bold text-[13px] text-white flex items-center space-x-1.5 cursor-pointer"
                style={{ background: storyMode === "story" ? "var(--green)" : "var(--gold)" }}
              >
                <Plus className="w-4 h-4" />
                <span>{primaryLang === "ar" ? "إضافة مشهد سردي" : "Add Scene Beat"}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowImporter(true)}
                className="px-4 py-2 rounded-lg font-medium text-[13px] border cursor-pointer text-stone-300"
                style={{ background: "var(--bg-elevated)", borderColor: "var(--border-subtle)" }}
              >
                {primaryLang === "ar" ? "لصق نص جاهز" : "Paste Text"}
              </button>
            </div>
          </div>
        ) : (
          lines.map((line, idx) => (
            <LineCard
              key={line.id}
              line={line}
              idx={idx}
              linesCount={lines.length}
              storyMode={storyMode}
              characters={characters}
              isLinePlaying={isPlaying && playingLineId === line.id}
              isExpanded={expandedLineId === line.id}
              onToggleExpand={() => setExpandedLineId(expandedLineId === line.id ? null : line.id)}
              onPreview={() => handlePreviewLine(line)}
              onUpdate={(updates) => updateLine(line.id, updates)}
              onDelete={() => deleteLine(line.id)}
              onSplit={() => splitLine(line.id)}
              onMerge={() => mergeLine(line.id)}
            />
          ))
        )}
      </div>

      {/* Add Line Button */}
      <button
        type="button"
        id="add-line"
        onClick={handleAddLine}
        className="w-full py-3.5 rounded-xl text-[13px] font-semibold flex items-center justify-center space-x-2 transition-all duration-200 active:scale-[0.99] cursor-pointer"
        style={{
          border: "1px dashed var(--border-subtle)",
          background: "var(--bg-surface)",
          color: storyMode === "story" ? "var(--green)" : "var(--gold)",
        }}
      >
        <Plus className="w-4 h-4" />
        <span>
          {storyMode === "story"
            ? primaryLang === "ar"
              ? "أضف مشهداً سردياً جديداً"
              : "Add Story Scene Beat"
            : primaryLang === "ar"
            ? "أضف سطر حوار جديد"
            : "Add Dialogue Line"}
        </span>
      </button>

      {/* Footer Navigation */}
      <div className="pt-4 flex justify-between items-center" style={{ borderTop: "1px solid var(--border-subtle)" }}>
        <span className="text-[13px]" style={{ color: "var(--fg-muted)" }}>
          {primaryLang === "ar"
            ? storyMode === "story"
              ? `${lines.length} مشهد سردي • ${totalWords} كلمة`
              : `${lines.length} سطر • ${totalWords} كلمة`
            : storyMode === "story"
            ? `${lines.length} story scene ${lines.length === 1 ? "beat" : "beats"} • ${totalWords} words`
            : `${lines.length} ${lines.length === 1 ? "line" : "lines"} • ${totalWords} words`}
        </span>

        <button
          type="button"
          id="next-to-characters"
          onClick={() => setStudioStep("characters")}
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
                ? "التالي: استوديو الراوي"
                : "Next: Solo Narrator Studio"
              : primaryLang === "ar"
              ? "التالي: اختيار الأصوات"
              : "Next: Voice Casting"}
          </span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
