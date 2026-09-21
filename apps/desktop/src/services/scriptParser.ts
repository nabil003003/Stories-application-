/**
 * StoryForge Studio — Intelligent Script & Dialogue Parser
 * Supports dual production modes:
 *  1. Story Narration Mode (Solo Story / Audiobook / Long-form Prose)
 *  2. Dramatic Dialogue Mode (Multi-Character Screenplay / Arguments)
 * Automatically parses raw text, detects language (EN/AR/FR), strips stage directions from speech,
 * segments scenes into cinematic beats, and casts studio neural voices.
 */

import { CATALOG_VOICES } from "./voiceCatalog";

export interface ParsedScriptResult {
  title: string;
  language: "en" | "ar" | "fr";
  storyMode: "dialogue" | "story";
  characters: {
    id: string;
    name: string;
    role: string;
    voice: string;
    language: "en" | "ar" | "fr";
    pitch: number;
    speed: number;
    style: string;
  }[];
  lines: {
    id: string;
    speaker: string;
    voice: string;
    language: "en" | "ar" | "fr";
    text: string;
    mood: string;
    cameraShot?: "close-up" | "medium" | "over-the-shoulder" | "two-shot" | "reaction";
    visualCue?: string;
  }[];
  summary: string;
}

// Common male and female name and role markers for voice casting heuristics
const MALE_NAME_REGEX = /\b(adam|john|david|michael|james|robert|alex|guy|christopher|roger|william|ryan|eric|thomas|mark|daniel|steven|kevin|brian|george|edward|miller|vance|harris|detective|captain|commander|doctor|inspector|he|him|man|boy|father|dad|brother|son|king|prince|sir|mr|lord|حامد|زيد|شاكر|حمدان|جمال|إسماعيل|الهادي|رامي|ليث|تيم|باسل|أحمد|محمد|علي|عمر|خالد|يوسف|henri|rémy|remy|antoine|gérard|gerard|pierre|jean|paul|julien)\b/i;

const FEMALE_NAME_REGEX = /\b(sara|sarah|jenny|aria|mary|emily|anna|emma|jessica|elizabeth|laura|lisa|sophia|olivia|chloe|vega|camille|she|her|woman|girl|mother|mom|sister|daughter|queen|princess|lady|mrs|ms|miss|زارية|سلمى|فاطمة|منى|أمينة|ليلى|مريم|نور|هند|ياسمين|denise|éloïse|eloise|vivienne|sylvie|marie|claire)\b/i;

/**
 * Detect language from text content
 */
export function detectLanguage(text: string): "en" | "ar" | "fr" {
  // Check for Arabic Unicode range (0600-06FF)
  const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
  if (arabicChars > 5) return "ar";

  // Check for distinct French words / accents
  const frenchMatches = (text.match(/\b(le|la|les|un|une|des|est|sont|dans|pour|avec|vous|nous|qui|que|mais|cette|mon|ton|son|il|elle)\b|[éèêëàâîïôûùç]/gi) || []).length;
  if (frenchMatches > 6) return "fr";

  return "en";
}

/**
 * Clean spoken text: strip all stage directions, brackets, and parentheticals.
 * Acting directions must NEVER be spoken aloud by TTS!
 */
export function cleanSpokenDialogue(text: string): string {
  return text
    .replace(/\((.*?)\)/g, "")
    .replace(/\[(.*?)\]/g, "")
    .replace(/\*(.*?)\*/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Parse a continuous long-form story (Solo Narrator / Audiobook Mode)
 * Segments prose into natural storytelling scene beats with visual cues and pacing.
 * Supports configurable density: 'cinematic' (15-35 words), 'sentence', or 'paragraph'.
 */
export function parseStoryNarration(
  rawInput: string,
  detectedLang: "en" | "ar" | "fr",
  density: "cinematic" | "sentence" | "paragraph" = "cinematic"
): ParsedScriptResult {
  const trimmed = rawInput.trim();
  const rawParagraphs = trimmed.split(/\r?\n\r?\n+/).map((p) => p.trim()).filter(Boolean);

  let title = detectedLang === "ar" ? "قصة بدون عنوان" : detectedLang === "fr" ? "Histoire Sans Titre" : "Untitled Story";
  let contentParagraphs = [...rawParagraphs];

  if (rawParagraphs.length > 0) {
    const firstP = rawParagraphs[0];
    const isTitleLike =
      firstP.startsWith("#") ||
      /^title\s*:/i.test(firstP) ||
      /^عنوان\s*:/i.test(firstP) ||
      (!firstP.includes(".") && !firstP.includes("،") && firstP.split(/\s+/).length <= 10 && rawParagraphs.length > 1);

    if (isTitleLike) {
      title = firstP.replace(/^[#*\s]+|[#*\s]+$/g, "").replace(/^(title|titre|عنوان)\s*:\s*/i, "").trim();
      contentParagraphs = rawParagraphs.slice(1);
    }
  }

  // If no separate paragraphs, split single big block by single newlines or sentence chunks
  if (contentParagraphs.length === 0 && rawParagraphs.length > 0) {
    contentParagraphs = rawParagraphs;
  }

  // Break paragraphs into digestible visual beats according to selected density
  const beats: { text: string; visualCue?: string }[] = [];

  for (const para of contentParagraphs) {
    // Extract inline stage directions if author included any
    let inlineCue = "";
    const actionMatches = para.match(/\((.*?)\)|\[(.*?)\]|\*(.*?)\*/g);
    if (actionMatches) {
      inlineCue = actionMatches.map((m) => m.replace(/^[\(\[\*\s]+|[\)\]\*\s]+$/g, "")).join("; ");
    }

    const cleanP = cleanSpokenDialogue(para);
    if (!cleanP) continue;

    if (density === "paragraph") {
      // Keep entire paragraph as a single beat
      beats.push({ text: cleanP, visualCue: inlineCue || undefined });
      continue;
    }

    // Dynamic sentence & conversational beat slicing (5 to 14 words per beat, never giant paragraphs!)
    // Split primarily on full sentences (.!?؟) or logical pauses (،,;—)
    const sentenceRegex = /[^.!?؟;\n]+[.!?؟;\n]*|[^.!?؟;\n]+$/g;
    const rawSentences = cleanP.match(sentenceRegex) || [cleanP];

    for (const rawSent of rawSentences) {
      const sTrim = rawSent.trim();
      if (!sTrim) continue;

      const words = sTrim.split(/\s+/).filter(Boolean);
      if (words.length <= 14) {
        beats.push({ text: sTrim, visualCue: inlineCue || undefined });
      } else {
        // If sentence is longer than 14 words, split by comma / pause clauses
        const clauses = sTrim.match(/[^,،;\-—]+[,،;\-—]*|[^,،;\-—]+$/g) || [sTrim];
        let clauseBuffer = "";
        for (const cl of clauses) {
          const clTrim = cl.trim();
          if (!clTrim) continue;
          if (!clauseBuffer) {
            clauseBuffer = clTrim;
          } else if ((clauseBuffer + " " + clTrim).split(/\s+/).length <= 12) {
            clauseBuffer = clauseBuffer + " " + clTrim;
          } else {
            beats.push({ text: clauseBuffer, visualCue: inlineCue || undefined });
            clauseBuffer = clTrim;
          }
        }
        if (clauseBuffer) {
          beats.push({ text: clauseBuffer, visualCue: inlineCue || undefined });
        }
      }
    }
  }

  // Fallback if empty
  if (beats.length === 0) {
    beats.push({
      text: cleanSpokenDialogue(trimmed) || (detectedLang === "ar" ? "تبدأ القصة هنا في ليلة هادئة..." : "The story begins here in the quiet of the night..."),
    });
  }

  // Select optimal Narrator Voice for language
  const narratorVoice =
    detectedLang === "ar"
      ? "ar-SA-HamedNeural"
      : detectedLang === "fr"
      ? "fr-FR-HenriNeural"
      : "en-US-ChristopherNeural";

  const narratorName =
    detectedLang === "ar"
      ? "الراوي (Narrator)"
      : detectedLang === "fr"
      ? "Narrateur"
      : "Story Narrator";

  const soloCharacter = {
    id: `c-narrator-${Date.now()}`,
    name: narratorName,
    role: "Lead Story Narrator",
    voice: narratorVoice,
    language: detectedLang,
    pitch: 1.0,
    speed: 1.0,
    style: "Cinematic",
  };

  const cameraShotSequence: ("two-shot" | "medium" | "close-up" | "over-the-shoulder" | "reaction")[] = [
    "medium",
    "two-shot",
    "close-up",
    "over-the-shoulder",
    "reaction",
  ];

  const moodSequence = ["Atmospheric", "Cinematic", "Suspense", "Epic", "Poetic"];

  // Helper to deduce atmospheric visual cues from narrative keywords
  const generateAtmosphericCue = (text: string, beatIdx: number, totalBeats: number): string => {
    const t = text.toLowerCase();
    if (t.includes("ocean") || t.includes("sea") || t.includes("wave") || t.includes("water") || t.includes("بحر") || t.includes("محيط") || t.includes("mer") || t.includes("vague")) {
      return "Coastline panorama, crashing tides and atmospheric sea spray";
    }
    if (t.includes("desert") || t.includes("sand") || t.includes("dune") || t.includes("oasis") || t.includes("صحراء") || t.includes("رمال") || t.includes("واحة") || t.includes("désert") || t.includes("sable")) {
      return "Golden desert vista with undulating dunes and radiant horizon";
    }
    if (t.includes("night") || t.includes("star") || t.includes("moon") || t.includes("dark") || t.includes("ليل") || t.includes("نجوم") || t.includes("قمر") || t.includes("nuit") || t.includes("étoile")) {
      return "Celestial night sky, moonlit horizon and deep nocturnal atmosphere";
    }
    if (t.includes("city") || t.includes("street") || t.includes("building") || t.includes("مدينة") || t.includes("شارع") || t.includes("ville") || t.includes("rue")) {
      return "Architectural urban streetscape with dynamic ambient lighting";
    }
    if (t.includes("ancient") || t.includes("tower") || t.includes("castle") || t.includes("temple") || t.includes("قلعة") || t.includes("برج") || t.includes("château") || t.includes("ruine")) {
      return "Ancient stone fortress and weathered monolithic architecture";
    }

    if (beatIdx === 0) return "Opening wide shot: Establishing the world and atmospheric setting";
    if (beatIdx === totalBeats - 1) return "Poetic receding shot: Lingering cinematic conclusion";
    if (beatIdx % 2 === 1) return "Medium focus: Narrative progression and unfolding scene";
    return "Close cinematic observation: Emotional resonance and details";
  };

  const lines = beats.map((beat, idx) => ({
    id: `line-${Date.now()}-${idx + 1}`,
    speaker: narratorName,
    voice: narratorVoice,
    language: detectedLang,
    text: beat.text,
    mood: moodSequence[idx % moodSequence.length],
    cameraShot: cameraShotSequence[idx % cameraShotSequence.length],
    visualCue: beat.visualCue || generateAtmosphericCue(beat.text, idx, beats.length),
  }));

  return {
    title,
    language: detectedLang,
    storyMode: "story",
    characters: [soloCharacter],
    lines,
    summary: `Story Narration Mode: 1 Lead Narrator (${soloCharacter.name} → ${soloCharacter.voice.split("-")[2] || soloCharacter.voice}), ${lines.length} storytelling scene beats.`,
  };
}

/**
 * Parse any raw script or story text into structured story scenes and voice-cast characters.
 * Supports explicit forcedMode ("dialogue" | "story") or intelligent auto-detection.
 */
export function parseScriptText(
  rawInput: string,
  forcedMode?: "dialogue" | "story",
  storyDensity?: "cinematic" | "sentence" | "paragraph"
): ParsedScriptResult {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return {
      title: "Untitled Story",
      language: "en",
      storyMode: forcedMode || "dialogue",
      characters: [
        {
          id: `c-${Date.now()}-1`,
          name: "Narrator",
          role: "Main Narrator",
          voice: "en-US-ChristopherNeural",
          language: "en",
          pitch: 1.0,
          speed: 1.0,
          style: "Cinematic",
        },
      ],
      lines: [
        {
          id: `line-${Date.now()}-1`,
          speaker: "Narrator",
          voice: "en-US-ChristopherNeural",
          language: "en",
          text: "",
          mood: "Cinematic",
        },
      ],
      summary: "Empty script initialized.",
    };
  }

  const detectedLang = detectLanguage(trimmed);

  // Regex to match dialogue turns:
  // Examples: "Adam: Just tell me the truth.", "Sara: You don't know anything."
  const dialogueRegex = /^(\[|\()?([A-Za-z0-9_\u0600-\u06FF\s]{1,30})([\]\)])?\s*[:–—-]\s*(.+)$/;

  const rawLines = trimmed
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // Count lines that look like dialogue speaker turns
  const dialogueMatchCount = rawLines.filter(l => dialogueRegex.test(l)).length;

  // Determine mode: forced or auto-detected
  const isDialogue = forcedMode ? forcedMode === "dialogue" : dialogueMatchCount >= 2;

  if (!isDialogue) {
    // Activate Story Narration Mode (Solo Story / Audiobook)
    return parseStoryNarration(trimmed, detectedLang, storyDensity || "cinematic");
  }

  // -------------------------------------------------------------
  // DIALOGUE MODE: Multi-character script parsing
  // -------------------------------------------------------------
  let title = detectedLang === "ar" ? "مشروع حوار" : detectedLang === "fr" ? "Scène de Dialogue" : "Untitled Dialogue";
  let startIndex = 0;

  // Check if line 0 is a title
  if (rawLines.length > 1) {
    const firstLineHasSpeaker = dialogueRegex.test(rawLines[0]);
    const secondLineHasSpeaker = dialogueRegex.test(rawLines[1]);

    if (!firstLineHasSpeaker && secondLineHasSpeaker) {
      title = rawLines[0].replace(/^[#*\s]+|[#*\s]+$/g, "");
      startIndex = 1;
    }
  }

  interface RawTurn {
    speaker: string;
    text: string;
    visualCue?: string;
  }

  const turns: RawTurn[] = [];
  let pendingVisualCue = "";

  for (let i = startIndex; i < rawLines.length; i++) {
    const lineStr = rawLines[i].trim();

    // Check if line is purely a stage direction / action description
    const isPureStageDirection =
      /^(\(|\[|\*).+(\)|\]|\*)$/.test(lineStr) ||
      (!dialogueRegex.test(lineStr) &&
        /^(she|he|they|the\s+\w+|[A-Za-z0-9_\u0600-\u06FF\s]+)\s+(looks|pauses|hesitates|turns|sighs|walks|steps|stares|cries|glances|closes|opens|whispers|gasps|shouts|nods|smiles|frowns|leaves|enters|stands|sits|approaches)\b/i.test(lineStr));

    if (isPureStageDirection) {
      const cleanedCue = lineStr.replace(/^[\(\[\*\s]+|[\)\]\*\s]+$/g, "").trim();
      pendingVisualCue = pendingVisualCue ? `${pendingVisualCue}. ${cleanedCue}` : cleanedCue;
      continue;
    }

    const match = lineStr.match(dialogueRegex);
    if (match) {
      const rawName = match[2].trim();
      const content = match[4].trim();

      // Extract inline stage directions inside dialogue
      let inlineCue = "";
      const actionMatches = content.match(/\((.*?)\)|\[(.*?)\]|\*(.*?)\*/g);
      if (actionMatches) {
        inlineCue = actionMatches.map((m) => m.replace(/^[\(\[\*\s]+|[\)\]\*\s]+$/g, "")).join("; ");
      }

      // STRICTLY CLEAN SPOKEN DIALOGUE: strip out all stage directions, brackets, and parentheticals
      const cleanSpokenText = cleanSpokenDialogue(content);

      const combinedCue = [pendingVisualCue, inlineCue].filter(Boolean).join(" — ");
      pendingVisualCue = "";

      if (cleanSpokenText) {
        turns.push({
          speaker: rawName,
          text: cleanSpokenText,
          visualCue: combinedCue || undefined,
        });
      }
    } else {
      // Continuation of previous dialogue
      if (turns.length > 0 && !lineStr.startsWith("#")) {
        const cleanContinuation = cleanSpokenDialogue(lineStr);
        if (cleanContinuation) {
          turns[turns.length - 1].text += ` ${cleanContinuation}`;
        }
      }
    }
  }

  // If no dialogue colons were actually found, fallback to Story Narration Mode
  if (turns.length === 0) {
    return parseStoryNarration(trimmed, detectedLang);
  }

  // Discover all unique characters in order of appearance
  const uniqueSpeakerNames = Array.from(new Set(turns.map((t) => t.speaker)));

  // Filter available voices for the detected language
  const langVoices = CATALOG_VOICES.filter((v) => v.lang === detectedLang);
  const maleVoices = langVoices.filter((v) => v.gender === "Male");
  const femaleVoices = langVoices.filter((v) => v.gender === "Female");

  // Fallbacks if specific gender bucket is empty
  const fallbackMale = maleVoices[0]?.id || langVoices[0]?.id || "en-US-ChristopherNeural";
  const fallbackFemale = femaleVoices[0]?.id || langVoices[1]?.id || "en-US-JennyNeural";

  let maleIndex = 0;
  let femaleIndex = 0;
  let neutralIndex = 0;

  const characterMap = new Map<
    string,
    {
      id: string;
      name: string;
      role: string;
      voice: string;
      language: "en" | "ar" | "fr";
      pitch: number;
      speed: number;
      style: string;
    }
  >();

  for (let idx = 0; idx < uniqueSpeakerNames.length; idx++) {
    const name = uniqueSpeakerNames[idx];
    const isMale = MALE_NAME_REGEX.test(name);
    const isFemale = FEMALE_NAME_REGEX.test(name);

    let assignedVoice = "";
    let role = "Character";

    if (name.toLowerCase().includes("narrat") || name.includes("راوي")) {
      role = "Main Narrator";
      assignedVoice = maleVoices[0]?.id || fallbackMale;
    } else if (isMale) {
      assignedVoice = maleVoices[maleIndex % Math.max(1, maleVoices.length)]?.id || fallbackMale;
      maleIndex++;
      role = maleIndex === 1 ? "Male Lead" : "Male Supporting";
    } else if (isFemale) {
      assignedVoice = femaleVoices[femaleIndex % Math.max(1, femaleVoices.length)]?.id || fallbackFemale;
      femaleIndex++;
      role = femaleIndex === 1 ? "Female Lead" : "Female Supporting";
    } else {
      if (neutralIndex % 2 === 0) {
        assignedVoice = maleVoices[maleIndex % Math.max(1, maleVoices.length)]?.id || fallbackMale;
        maleIndex++;
      } else {
        assignedVoice = femaleVoices[femaleIndex % Math.max(1, femaleVoices.length)]?.id || fallbackFemale;
        femaleIndex++;
      }
      neutralIndex++;
    }

    const defaultStyle = name.toLowerCase().includes("narrat") ? "Cinematic" : "Suspense";

    characterMap.set(name, {
      id: `c-${Date.now()}-${idx + 1}`,
      name,
      role,
      voice: assignedVoice,
      language: detectedLang,
      pitch: 1.0,
      speed: 1.0,
      style: defaultStyle,
    });
  }

  const characters = Array.from(characterMap.values());

  // Build the parsed dialogue lines with cinematic camera direction
  const lines = turns.map((turn, lineIdx) => {
    const char = characterMap.get(turn.speaker) || characters[0];

    // Detect line emotion style from punctuation, hesitations, and cues
    let mood = char.style || "Cinematic";
    let cameraShot: "close-up" | "medium" | "over-the-shoulder" | "two-shot" | "reaction" = "medium";

    const tLower = turn.text.toLowerCase();
    const isQuestion = turn.text.includes("?");
    const isExclamation = turn.text.includes("!");
    const isHesitation = turn.text.includes("...") || turn.text.includes("—") || tLower.includes("i—");
    const isVulnerable = tLower.includes("lonely") || tLower.includes("honesty") || tLower.includes("deserved") || tLower.includes("stops");

    if (isHesitation || isVulnerable) {
      mood = "Emotional";
      cameraShot = "close-up";
    } else if (isExclamation || (turn.text.toUpperCase() === turn.text && turn.text.length > 8)) {
      mood = "Urgent";
      cameraShot = "medium";
    } else if (isQuestion) {
      mood = "Suspense";
      cameraShot = lineIdx % 2 === 0 ? "close-up" : "over-the-shoulder";
    } else {
      mood = "Suspense";
      cameraShot = lineIdx === 0 ? "medium" : lineIdx === turns.length - 1 ? "two-shot" : "over-the-shoulder";
    }

    return {
      id: `line-${Date.now()}-${lineIdx + 1}`,
      speaker: turn.speaker,
      voice: char.voice,
      language: detectedLang,
      text: turn.text,
      mood,
      cameraShot,
      visualCue: turn.visualCue,
    };
  });

  const summary = `Dialogue Mode: Detected ${characters.length} character${characters.length === 1 ? "" : "s"} (${characters.map((c) => `${c.name} → ${c.voice.split("-")[2] || c.voice}`).join(", ")}) and ${lines.length} dialogue line${lines.length === 1 ? "" : "s"}.`;

  return {
    title,
    language: detectedLang,
    storyMode: "dialogue",
    characters,
    lines,
    summary,
  };
}
