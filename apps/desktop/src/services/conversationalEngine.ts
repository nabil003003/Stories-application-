/**
 * StoryForge Studio — Conversational Speech Acting & Human Performance Engine
 * Analyzes conversational context, emotional arcs, interruptions, defensiveness,
 * and vulnerability to generate natural, dynamic human arguing dynamics.
 * Eliminates mechanical AI speech rhythms through per-line and in-line acoustic modulation.
 */

export interface ConversationalProfile {
  actingState:
    | "Heated Confrontation"
    | "Defensive Stammer"
    | "Vulnerable Heartbreak"
    | "Bitter Sarcasm"
    | "Urgent Interruption"
    | "Suspicious Accusation"
    | "Natural Dialogue"
    | "Atmospheric Prologue"
    | "Narrative Exposition"
    | "Rising Suspense"
    | "Climactic Revelation"
    | "Poetic Stillness";
  actingStateAr: string;
  actingStateFr: string;
  icon: string;
  rateAdjustment: string;     // e.g. "+20%", "-14%"
  pitchAdjustment: string;    // e.g. "+12Hz", "-8Hz"
  volumeAdjustment: string;   // e.g. "+25%", "-20%"
  turnDelayMs: number;        // dynamic reactive delay before this line speaks
  actingText: string;         // text enriched with natural hesitations, cut-offs, punctuation
  isInterruption: boolean;
  intensityScore: number;     // 1 (gentle whisper) to 10 (peak shouting argument)
  actingGuidance: string;     // director's note on character vocal delivery
}

export interface DialogueContextLine {
  id: string;
  speaker: string;
  text: string;
  mood?: string;
  visualCue?: string;
  cameraShot?: string;
  language?: "en" | "ar" | "fr";
}

/**
 * Common emotional marker words across English, Arabic, and French
 */
const ACCUSATORY_WORDS = /\b(truth|saw|messages|hiding|lied|liar|cheated|betray|betrayed|stop|shut up|assumptions|court|trial|guilty|proof|evidence|who|why|where|how could you|never|حقيقة|رسائل|أسرار|خيانة|كاذب|خائن|أدلة|مواجهة|جريمة|تحقيق|mensonge|menteur|trahison|vérité|preuves|honte)\b/i;

const DEFENSIVE_WORDS = /\b(just a friend|friend|context|assumptions|out of hand|didn't ask|swear|accident|nothing|stop it|leave me alone|not like that|listen to me|you don't know|threatened|صديق|سوء فهم|لم أقصد|شأن خاص|هددوني|لا تتدخل|اعتداء|juste un ami|contexte|rien|malentendu|écoute-moi|pas du tout)\b/i;

const VULNERABLE_WORDS = /\b(lonely|honesty|deserved|three years|crying|tears|pain|hurts|sorry|forgive|broken|scared|afraid|alone|whisper|unresolved|وحيد|ألم|دموع|حزن|سامحني|اعتراف|انكسار|خوف|seul|solitude|larmes|tristesse|pardon|peur|brisé)\b/i;

const SARCASTIC_WORDS = /\b(oh really|of course|brilliant|wonderful|whatever you say|whatever you can prove|fascinating|sure|بالتأكيد|يا للروعة|طبعا|كما تشاء|bien sûr|évidemment|magnifique|voyons)\b/i;

/**
 * Analyzes dialogue line within its conversational context and calculates
 * human acting dynamics (tempo, pitch variation, volume, and response timing).
 */
export function analyzeConversationalLine(
  currentLine: DialogueContextLine,
  lineIndex: number,
  allLines: DialogueContextLine[]
): ConversationalProfile {
  const text = (currentLine.text || "").trim();
  const visual = (currentLine.visualCue || "").toLowerCase();
  const mood = (currentLine.mood || "").toLowerCase();
  const textLower = text.toLowerCase();

  const prevLine = lineIndex > 0 ? allLines[lineIndex - 1] : undefined;
  const isDifferentSpeakerThanPrev = prevLine ? prevLine.speaker.toLowerCase() !== currentLine.speaker.toLowerCase() : false;

  // Punctuation analysis
  const hasExclamation = text.includes("!");
  const hasMultipleExclamations = /!{2,}/.test(text);
  const hasQuestion = text.includes("?");
  const hasInterrobang = /\?!|\!\?/.test(text);
  const hasEllipsis = text.includes("...") || text.includes("…");
  const hasCutOff = text.endsWith("—") || text.endsWith("--") || text.endsWith("-");
  const hasInternalDash = /—|-{2}/.test(text);
  const isShortSnappy = text.split(/\s+/).length <= 6;

  // Keyword presence
  const isAccusatory = ACCUSATORY_WORDS.test(textLower) || visual.includes("confront") || visual.includes("accuse") || visual.includes("anger");
  const isDefensive = DEFENSIVE_WORDS.test(textLower) || visual.includes("defensive") || visual.includes("hesitates") || visual.includes("stammer") || visual.includes("arms crossed");
  const isVulnerable = VULNERABLE_WORDS.test(textLower) || visual.includes("whisper") || visual.includes("tears") || visual.includes("looks down") || visual.includes("cries") || visual.includes("heartbreak");
  const isSarcastic = SARCASTIC_WORDS.test(textLower) || visual.includes("sarcastic") || visual.includes("smirks") || visual.includes("faint smile");

  // Determine acting state
  let actingState: ConversationalProfile["actingState"] = "Natural Dialogue";
  let actingStateAr = "حوار طبيعي";
  let actingStateFr = "Dialogue Naturel";
  let icon = "";
  let baseRate = 0;     // in %
  let basePitch = 0;    // in Hz
  let baseVolume = 0;   // in %
  let turnDelay = 320;  // in ms
  let isInterruption = false;
  let intensity = 5;
  let guidance = "Natural conversational delivery.";

  // Contextual Interruption Detection
  // If previous line ends with a cut-off (—) or was high energy, or this line is an immediate aggressive interjection:
  const prevWasCutOff = prevLine && (prevLine.text.endsWith("—") || prevLine.text.endsWith("-"));
  const prevWasQuestion = prevLine && prevLine.text.includes("?");

  if (prevWasCutOff || hasCutOff || hasMultipleExclamations || (hasExclamation && isShortSnappy && isDifferentSpeakerThanPrev && (isAccusatory || isDefensive))) {
    // High-tension sudden interruption
    actingState = "Urgent Interruption";
    actingStateAr = "مقاطعة حادة واقتحام";
    actingStateFr = "Interruption Abrupte";
    icon = "";
    baseRate = +22;
    basePitch = +12;
    baseVolume = +28;
    turnDelay = 40; // almost instant cut-in, overlapping the reverb tail of previous speaker
    isInterruption = true;
    intensity = 9;
    guidance = "Cuts in immediately over the other speaker with fierce energy.";
  } else if (isAccusatory && (hasExclamation || hasInterrobang || hasQuestion)) {
    // Escalating argument / heated confrontation
    actingState = "Heated Confrontation";
    actingStateAr = "مواجهة حادة وتصعيد";
    actingStateFr = "Confrontation Tendue";
    icon = "";
    baseRate = +18;
    basePitch = +10;
    baseVolume = +24;
    turnDelay = 110; // snappy, fast-paced argument response
    intensity = 8;
    guidance = "Spits words sharply, raising vocal projection and pressing for answers.";
  } else if (isVulnerable || mood === "emotional" || visual.includes("heartbreak") || visual.includes("quiet")) {
    // Soft, heartbroken, vulnerable delivery
    actingState = "Vulnerable Heartbreak";
    actingStateAr = "انكسار عاطفي وهمس";
    actingStateFr = "Vulnérabilité Émouvante";
    icon = "";
    baseRate = -14;
    basePitch = -8;
    baseVolume = -22;
    turnDelay = 850; // heavy, painful emotional hesitation before words emerge
    intensity = 3;
    guidance = "Quiet, voice drops to near-whisper, struggling with suppressed grief.";
  } else if (isDefensive || hasEllipsis || hasInternalDash) {
    // Defensive stammer / hesitation
    actingState = "Defensive Stammer";
    actingStateAr = "دفاع مرتبك وتردد";
    actingStateFr = "Défense Hésitante";
    icon = "";
    baseRate = -4;
    basePitch = +5;
    baseVolume = -2;
    turnDelay = 420; // recoiling hesitation
    intensity = 6;
    guidance = "Unsteady pacing, stumbling over words while defending self.";
  } else if (isSarcastic) {
    // Biting sarcasm
    actingState = "Bitter Sarcasm";
    actingStateAr = "سخرية مريرة ولاذعة";
    actingStateFr = "Sarcasme Amer";
    icon = "";
    baseRate = +2;
    basePitch = -4;
    baseVolume = +10;
    turnDelay = 260;
    intensity = 6;
    guidance = "Cool, mocking inflection with elongated vowels and biting irony.";
  } else if (hasQuestion || prevWasQuestion) {
    // Suspicious questioning
    actingState = "Suspicious Accusation";
    actingStateAr = "استجواب وشك متصاعد";
    actingStateFr = "Interrogatoire Suspicieux";
    icon = "";
    baseRate = +6;
    basePitch = +4;
    baseVolume = +8;
    turnDelay = 220;
    intensity = 6;
    guidance = "Calculated tension, pressing eye contact with rising questioning pitch.";
  }

  // -------------------------------------------------------------
  // Organic Human Acoustic Micro-Jitter
  // Adds subtle natural variation (±3% rate, ±2Hz pitch, ±3% volume)
  // so two consecutive sentences NEVER sound robotic or identical!
  // -------------------------------------------------------------
  const jitterRate = Math.floor(Math.sin(lineIndex * 7.3) * 4);
  const jitterPitch = Math.floor(Math.cos(lineIndex * 4.9) * 3);
  const jitterVolume = Math.floor(Math.sin(lineIndex * 3.1) * 4);

  const finalRateVal = Math.max(-35, Math.min(45, baseRate + jitterRate));
  const finalPitchVal = Math.max(-25, Math.min(25, basePitch + jitterPitch));
  const finalVolumeVal = Math.max(-40, Math.min(40, baseVolume + jitterVolume));

  const rateAdjustment = `${finalRateVal >= 0 ? "+" : ""}${finalRateVal}%`;
  const pitchAdjustment = `${finalPitchVal >= 0 ? "+" : ""}${finalPitchVal}Hz`;
  const volumeAdjustment = `${finalVolumeVal >= 0 ? "+" : ""}${finalVolumeVal}%`;

  // -------------------------------------------------------------
  // Acting Text Enrichment for Edge-TTS
  // Injects expressive hesitations, micro-pauses, and punctuation
  // -------------------------------------------------------------
  let actingText = text;

  // If line contains stammer like "I- I" or "I— I", ensure format is clear to speech engine
  actingText = actingText
    .replace(/\b([I|i])-\s*([I|i])\b/g, "$1— $2")
    .replace(/\b([Y|y])ou-you\b/gi, "Y— You")
    .replace(/\b([W|w])hat-what\b/gi, "W— What");

  // If accusatory exclamation ending with period, convert to exclamation for vocal punch
  if (isAccusatory && text.endsWith(".") && intensity >= 7) {
    actingText = actingText.slice(0, -1) + "!";
  }

  // If heartbreaking confession, ensure soft pauses around ellipses
  if (isVulnerable && !actingText.includes("...") && !actingText.includes("—")) {
    actingText = actingText.replace(/,\s*/g, "... ");
  }

  return {
    actingState,
    actingStateAr,
    actingStateFr,
    icon,
    rateAdjustment,
    pitchAdjustment,
    volumeAdjustment,
    turnDelayMs: Math.max(30, turnDelay),
    actingText,
    isInterruption,
    intensityScore: intensity,
    actingGuidance: guidance,
  };
}

/**
 * Analyzes a story narration beat to establish cinematic storytelling cadence,
 * modulation, and atmospheric pacing for solo storytelling / audiobook mode.
 */
export function analyzeStoryNarrationBeat(
  currentLine: DialogueContextLine,
  beatIndex: number,
  totalBeats: number
): ConversationalProfile {
  const text = (currentLine.text || "").trim();
  const textLower = text.toLowerCase();
  const isFirst = beatIndex === 0;
  const isLast = beatIndex === totalBeats - 1;
  const isMidClimax = beatIndex === Math.floor(totalBeats * 0.7);

  let actingState: ConversationalProfile["actingState"] = "Narrative Exposition";
  let actingStateAr = "سرد متزن";
  let actingStateFr = "Exposition Narrative";
  let baseRate = 0;
  let basePitch = 0;
  let baseVolume = 0;
  let turnDelay = 520; // Natural breath and scene transition between storytelling beats
  let intensity = 5;
  let guidance = "Steady, engaging story narration.";

  if (isFirst) {
    actingState = "Atmospheric Prologue";
    actingStateAr = "مقدمة سردية";
    actingStateFr = "Prologue Atmosphérique";
    baseRate = -4;
    basePitch = -1;
    baseVolume = +5;
    guidance = "Captivating, measured opening hook establishing the narrative world.";
  } else if (isLast) {
    actingState = "Poetic Stillness";
    actingStateAr = "خاتمة شعرية";
    actingStateFr = "Épilogue Poétique";
    baseRate = -6;
    basePitch = -2;
    baseVolume = -5;
    turnDelay = 750;
    guidance = "Soft, resonant final cadence allowing the story to linger.";
  } else if (text.includes("!") || textLower.includes("suddenly") || textLower.includes("faj'atan") || textLower.includes("soudain") || isMidClimax) {
    actingState = "Climactic Revelation";
    actingStateAr = "ذروة درامية";
    actingStateFr = "Révélation Climax";
    baseRate = +8;
    basePitch = +3;
    baseVolume = +15;
    intensity = 8;
    guidance = "Dynamic narrative surge with heightened cinematic energy.";
  } else if (text.includes("...") || textLower.includes("whisper") || textLower.includes("ancient") || textLower.includes("secret") || textLower.includes("shadow") || textLower.includes("سر") || textLower.includes("غموض")) {
    actingState = "Rising Suspense";
    actingStateAr = "تشويق متصاعد";
    actingStateFr = "Suspense Croissant";
    baseRate = -5;
    basePitch = -2;
    baseVolume = -5;
    intensity = 6;
    guidance = "Tense, hushed mystery drawing the listener deeper into the plot.";
  }

  const rateAdjustment = `${baseRate >= 0 ? "+" : ""}${baseRate}%`;
  const pitchAdjustment = `${basePitch >= 0 ? "+" : ""}${basePitch}Hz`;
  const volumeAdjustment = `${baseVolume >= 0 ? "+" : ""}${baseVolume}%`;

  return {
    actingState,
    actingStateAr,
    actingStateFr,
    icon: "",
    rateAdjustment,
    pitchAdjustment,
    volumeAdjustment,
    turnDelayMs: turnDelay,
    actingText: text,
    isInterruption: false,
    intensityScore: intensity,
    actingGuidance: guidance,
  };
}
