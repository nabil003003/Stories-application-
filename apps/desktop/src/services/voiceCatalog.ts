/**
 * StoryForge Studio — Multilingual Voice & Reading Style Catalog
 * Comprehensive catalogue of 36 studio-grade neural voices (Arabic dialects, English, French)
 * and 10 expressive reading delivery styles.
 */

export interface VoiceInfo {
  id: string;
  name: string;
  lang: "ar" | "en" | "fr";
  gender: "Male" | "Female";
  style: string;
  flag: string;
  flagEmoji: string;
  region: string;
  category: "Narrator" | "Dramatic" | "Warm" | "Documentary" | "Elder" | "Youth" | "Iconic & Meme";
}

export interface ReadingStyleInfo {
  id: string;
  name: string;
  nameAr: string;
  nameFr: string;
  icon: string;
  description: string;
  rate: string;
  pitch: string;
  volume: string;
}

export const CATALOG_VOICES: VoiceInfo[] = [
  // ═══════════════════════════════════════════════════════════════
  // 1. ARABIC VOICES (20 Verified Microsoft Neural Dialects & MSA)
  // ═══════════════════════════════════════════════════════════════
  { id: "ar-SA-HamedNeural", name: "Hamed (حامد)", lang: "ar", gender: "Male", style: "Epic & Deep MSA Narrator", flag: "SA", flagEmoji: "🇸🇦", region: "Saudi Arabia", category: "Narrator" },
  { id: "ar-SA-ZariyahNeural", name: "Zariyah (زارية)", lang: "ar", gender: "Female", style: "Dramatic & Regal Queen", flag: "SA", flagEmoji: "🇸🇦", region: "Saudi Arabia", category: "Dramatic" },
  { id: "ar-EG-ShakirNeural", name: "Shakir (شاكر)", lang: "ar", gender: "Male", style: "Warm Narrative Storyteller", flag: "EG", flagEmoji: "🇪🇬", region: "Egypt", category: "Warm" },
  { id: "ar-EG-SalmaNeural", name: "Salma (سلمى)", lang: "ar", gender: "Female", style: "Expressive & Lively Egyptian", flag: "EG", flagEmoji: "🇪🇬", region: "Egypt", category: "Dramatic" },
  { id: "ar-AE-HamdanNeural", name: "Hamdan (حمدان)", lang: "ar", gender: "Male", style: "Calm & Authoritative Gulf", flag: "AE", flagEmoji: "🇦🇪", region: "UAE", category: "Narrator" },
  { id: "ar-AE-FatimaNeural", name: "Fatima (فاطمة)", lang: "ar", gender: "Female", style: "Eloquent & Melodic Gulf", flag: "AE", flagEmoji: "🇦🇪", region: "UAE", category: "Warm" },
  { id: "ar-MA-JamalNeural", name: "Jamal (جمال)", lang: "ar", gender: "Male", style: "Historical Maghrebi Storyteller", flag: "MA", flagEmoji: "🇲🇦", region: "Morocco", category: "Narrator" },
  { id: "ar-MA-MounaNeural", name: "Mouna (منى)", lang: "ar", gender: "Female", style: "Soft & Melodic Storyteller", flag: "MA", flagEmoji: "🇲🇦", region: "Morocco", category: "Warm" },
  { id: "ar-DZ-IsmaelNeural", name: "Ismael (إسماعيل)", lang: "ar", gender: "Male", style: "Intense & Noble Algerian", flag: "DZ", flagEmoji: "🇩🇿", region: "Algeria", category: "Narrator" },
  { id: "ar-DZ-AminaNeural", name: "Amina (أمينة)", lang: "ar", gender: "Female", style: "Warm & Gentle Algerian", flag: "DZ", flagEmoji: "🇩🇿", region: "Algeria", category: "Warm" },
  { id: "ar-TN-HediNeural", name: "Hedi (الهادي)", lang: "ar", gender: "Male", style: "Classical Mediterranean", flag: "TN", flagEmoji: "🇹🇳", region: "Tunisia", category: "Documentary" },
  { id: "ar-TN-ReemNeural", name: "Reem (ريم)", lang: "ar", gender: "Female", style: "Modern Expressive Tunisian", flag: "TN", flagEmoji: "🇹🇳", region: "Tunisia", category: "Dramatic" },
  { id: "ar-LB-RamiNeural", name: "Rami (رامي)", lang: "ar", gender: "Male", style: "Engaging Levant Narrator", flag: "LB", flagEmoji: "🇱🇧", region: "Lebanon", category: "Narrator" },
  { id: "ar-LB-LaylaNeural", name: "Layla (ليلى)", lang: "ar", gender: "Female", style: "Emotive Levant Storyteller", flag: "LB", flagEmoji: "🇱🇧", region: "Lebanon", category: "Dramatic" },
  { id: "ar-SY-LaithNeural", name: "Laith (ليث)", lang: "ar", gender: "Male", style: "Resonant Syrian Dramatic", flag: "SY", flagEmoji: "🇸🇾", region: "Syria", category: "Dramatic" },
  { id: "ar-SY-AmanyNeural", name: "Amany (أماني)", lang: "ar", gender: "Female", style: "Poetic Syrian Storyteller", flag: "SY", flagEmoji: "🇸🇾", region: "Syria", category: "Warm" },
  { id: "ar-JO-TaimNeural", name: "Taim (تيم)", lang: "ar", gender: "Male", style: "Dynamic Youth Storyteller", flag: "JO", flagEmoji: "🇯🇴", region: "Jordan", category: "Youth" },
  { id: "ar-JO-SanaNeural", name: "Sana (سناء)", lang: "ar", gender: "Female", style: "Gentle Jordanian Narrator", flag: "JO", flagEmoji: "🇯🇴", region: "Jordan", category: "Warm" },
  { id: "ar-IQ-BasselNeural", name: "Bassel (باسل)", lang: "ar", gender: "Male", style: "Deep Mesopotamian Voice", flag: "IQ", flagEmoji: "🇮🇶", region: "Iraq", category: "Narrator" },
  { id: "ar-IQ-RanaNeural", name: "Rana (رنا)", lang: "ar", gender: "Female", style: "Expressive Iraqi Storyteller", flag: "IQ", flagEmoji: "🇮🇶", region: "Iraq", category: "Dramatic" },

  // ═══════════════════════════════════════════════════════════════
  // 2. ENGLISH VOICES (20 Studio-Grade Neural Readers)
  // ═══════════════════════════════════════════════════════════════
  { id: "en-US-ChristopherNeural", name: "Christopher", lang: "en", gender: "Male", style: "Cinematic Movie Trailer Narrator", flag: "US", flagEmoji: "🇺🇸", region: "United States", category: "Narrator" },
  { id: "en-US-JennyNeural", name: "Jenny", lang: "en", gender: "Female", style: "Expressive & Warm Storyteller", flag: "US", flagEmoji: "🇺🇸", region: "United States", category: "Warm" },
  { id: "en-US-GuyNeural", name: "Guy", lang: "en", gender: "Male", style: "Bold & Dynamic Action Hero", flag: "US", flagEmoji: "🇺🇸", region: "United States", category: "Dramatic" },
  { id: "en-US-AriaNeural", name: "Aria", lang: "en", gender: "Female", style: "Emotional & Dramatic Actress", flag: "US", flagEmoji: "🇺🇸", region: "United States", category: "Dramatic" },
  { id: "en-US-EricNeural", name: "Eric", lang: "en", gender: "Male", style: "Crisp Modern Documentary Narrator", flag: "US", flagEmoji: "🇺🇸", region: "United States", category: "Documentary" },
  { id: "en-US-RogerNeural", name: "Roger", lang: "en", gender: "Male", style: "Mature & Wise Elder Voice", flag: "US", flagEmoji: "🇺🇸", region: "United States", category: "Elder" },
  { id: "en-US-AnaNeural", name: "Ana", lang: "en", gender: "Female", style: "Whimsical & Fairy Tale Voice", flag: "US", flagEmoji: "🇺🇸", region: "United States", category: "Youth" },
  { id: "en-US-AndrewMultilingualNeural", name: "Andrew", lang: "en", gender: "Male", style: "Confident & Authentic Dialogue", flag: "US", flagEmoji: "🇺🇸", region: "United States", category: "Narrator" },
  { id: "en-US-AvaMultilingualNeural", name: "Ava", lang: "en", gender: "Female", style: "Caring & Melodic Dialogue", flag: "US", flagEmoji: "🇺🇸", region: "United States", category: "Warm" },
  { id: "en-US-BrianMultilingualNeural", name: "Brian", lang: "en", gender: "Male", style: "Deep Resonance Storyteller", flag: "US", flagEmoji: "🇺🇸", region: "United States", category: "Narrator" },
  { id: "en-US-EmmaMultilingualNeural", name: "Emma", lang: "en", gender: "Female", style: "Sophisticated Literary Voice", flag: "US", flagEmoji: "🇺🇸", region: "United States", category: "Documentary" },
  { id: "en-GB-RyanNeural", name: "Ryan", lang: "en", gender: "Male", style: "British Classical & Aristocratic", flag: "GB", flagEmoji: "🇬🇧", region: "United Kingdom", category: "Narrator" },
  { id: "en-GB-SoniaNeural", name: "Sonia", lang: "en", gender: "Female", style: "BBC Documentary & Elegance", flag: "GB", flagEmoji: "🇬🇧", region: "United Kingdom", category: "Documentary" },
  { id: "en-GB-ThomasNeural", name: "Thomas", lang: "en", gender: "Male", style: "British Authoritative Drama", flag: "GB", flagEmoji: "🇬🇧", region: "United Kingdom", category: "Dramatic" },
  { id: "en-GB-LibbyNeural", name: "Libby", lang: "en", gender: "Female", style: "Warm British Storyteller", flag: "GB", flagEmoji: "🇬🇧", region: "United Kingdom", category: "Warm" },
  { id: "en-AU-WilliamMultilingualNeural", name: "William", lang: "en", gender: "Male", style: "Rugged Adventurer & Explorer", flag: "AU", flagEmoji: "🇦🇺", region: "Australia", category: "Narrator" },
  { id: "en-AU-NatashaNeural", name: "Natasha", lang: "en", gender: "Female", style: "Australian Documentary Narrator", flag: "AU", flagEmoji: "🇦🇺", region: "Australia", category: "Documentary" },
  { id: "en-CA-LiamNeural", name: "Liam", lang: "en", gender: "Male", style: "Deep Natural Canadian Narrator", flag: "CA", flagEmoji: "🇨🇦", region: "Canada", category: "Narrator" },
  { id: "en-CA-ClaraNeural", name: "Clara", lang: "en", gender: "Female", style: "Warm Canadian Storyteller", flag: "CA", flagEmoji: "🇨🇦", region: "Canada", category: "Warm" },
  { id: "en-IE-ConnorNeural", name: "Connor", lang: "en", gender: "Male", style: "Charismatic Irish Storyteller", flag: "IE", flagEmoji: "🇮🇪", region: "Ireland", category: "Dramatic" },

  // ═══════════════════════════════════════════════════════════════
  // 3. FRENCH VOICES (12 Studio-Grade Francophone Readers)
  // ═══════════════════════════════════════════════════════════════
  { id: "fr-FR-HenriNeural", name: "Henri", lang: "fr", gender: "Male", style: "Classic French Cinema Narrator", flag: "FR", flagEmoji: "🇫🇷", region: "France", category: "Narrator" },
  { id: "fr-FR-DeniseNeural", name: "Denise", lang: "fr", gender: "Female", style: "Elegant Parisian Storyteller", flag: "FR", flagEmoji: "🇫🇷", region: "France", category: "Warm" },
  { id: "fr-FR-EloiseNeural", name: "Éloïse", lang: "fr", gender: "Female", style: "Young & Dynamic Dramatic Voice", flag: "FR", flagEmoji: "🇫🇷", region: "France", category: "Dramatic" },
  { id: "fr-FR-VivienneMultilingualNeural", name: "Vivienne", lang: "fr", gender: "Female", style: "Studio Voice Actress", flag: "FR", flagEmoji: "🇫🇷", region: "France", category: "Dramatic" },
  { id: "fr-FR-RemyMultilingualNeural", name: "Rémy", lang: "fr", gender: "Male", style: "Smooth Modern French", flag: "FR", flagEmoji: "🇫🇷", region: "France", category: "Narrator" },
  { id: "fr-FR-AlainNeural", name: "Alain", lang: "fr", gender: "Male", style: "Deep Classical Voice & Gravitas", flag: "FR", flagEmoji: "🇫🇷", region: "France", category: "Elder" },
  { id: "fr-FR-BrigitteNeural", name: "Brigitte", lang: "fr", gender: "Female", style: "Warm Mature French Storyteller", flag: "FR", flagEmoji: "🇫🇷", region: "France", category: "Warm" },
  { id: "fr-CA-AntoineNeural", name: "Antoine", lang: "fr", gender: "Male", style: "Deep & Resonant Canadian French", flag: "CA", flagEmoji: "🇨🇦", region: "Canada", category: "Narrator" },
  { id: "fr-CA-SylvieNeural", name: "Sylvie", lang: "fr", gender: "Female", style: "Warm Canadian Storyteller", flag: "CA", flagEmoji: "🇨🇦", region: "Canada", category: "Warm" },
  { id: "fr-CA-JeanNeural", name: "Jean", lang: "fr", gender: "Male", style: "Authentic Québec Storyteller", flag: "CA", flagEmoji: "🇨🇦", region: "Canada", category: "Dramatic" },
  { id: "fr-BE-GerardNeural", name: "Gérard", lang: "fr", gender: "Male", style: "Authoritative Belgian French", flag: "BE", flagEmoji: "🇧🇪", region: "Belgium", category: "Documentary" },
  { id: "fr-CH-FabriceNeural", name: "Fabrice", lang: "fr", gender: "Male", style: "Articulate Swiss French", flag: "CH", flagEmoji: "🇨🇭", region: "Switzerland", category: "Narrator" },

  // ═══════════════════════════════════════════════════════════════
  // 4. ICONIC & MEME CHARACTER VOICES (Cartoon, Comedic & Sci-Fi)
  // ═══════════════════════════════════════════════════════════════
  { id: "char-peter-griffin", name: "Peter G.", lang: "en", gender: "Male", style: "Comedic Nasal Dad (Quahog)", flag: "US", flagEmoji: "🍺", region: "Iconic Cartoon", category: "Iconic & Meme" },
  { id: "char-spongebob", name: "Bob Sponge", lang: "en", gender: "Male", style: "High-Pitched Cartoon Energy", flag: "US", flagEmoji: "🧽", region: "Iconic Cartoon", category: "Iconic & Meme" },
  { id: "char-dark-overlord", name: "Dark Overlord", lang: "en", gender: "Male", style: "Deep Sub-Bass Villain & Sith", flag: "US", flagEmoji: "⚔️", region: "Sci-Fi Villain", category: "Iconic & Meme" },
  { id: "char-mad-scientist", name: "Mad Scientist", lang: "en", gender: "Male", style: "Cynical Erratic Staccato (Rick)", flag: "US", flagEmoji: "🧪", region: "Sci-Fi Cartoon", category: "Iconic & Meme" },
  { id: "char-film-noir", name: "Detective Noir", lang: "en", gender: "Male", style: "Raspy Whisper & Gritty Monologue", flag: "US", flagEmoji: "🕵️", region: "Film Noir", category: "Iconic & Meme" },
];

export const CATALOG_STYLES: ReadingStyleInfo[] = [
  {
    id: "Cinematic",
    name: "Cinematic Narration",
    nameAr: "ملحمي سينمائي",
    nameFr: "Narration Cinématographique",
    icon: "",
    description: "Deep chest resonance, measured epic pacing, dramatic movie trailer atmosphere.",
    rate: "-8%",
    pitch: "-5Hz",
    volume: "+5%",
  },
  {
    id: "Suspense",
    name: "Suspense & Thriller",
    nameAr: "تشويق وغموض",
    nameFr: "Suspense & Mystère",
    icon: "",
    description: "Slow, calculated cadence, hushed tone, lingering dramatic tension.",
    rate: "-14%",
    pitch: "-8Hz",
    volume: "-10%",
  },
  {
    id: "Urgent",
    name: "Urgent & Action",
    nameAr: "حماسي وحركي",
    nameFr: "Action & Urgence",
    icon: "",
    description: "Rapid tempo, punchy inflections, high-energy forward drive.",
    rate: "+16%",
    pitch: "+6Hz",
    volume: "+15%",
  },
  {
    id: "Whisper",
    name: "Whisper & Secret",
    nameAr: "همس وسري",
    nameFr: "Murmure & Confidences",
    icon: "",
    description: "Soft muted delivery, intimate close-mic confidential delivery.",
    rate: "-18%",
    pitch: "-6Hz",
    volume: "-30%",
  },
  {
    id: "Documentary",
    name: "Documentary & History",
    nameAr: "وثائقي تاريخي",
    nameFr: "Documentaire Historique",
    icon: "",
    description: "Steady, articulate, authoritative gravitas with crisp punctuation.",
    rate: "-2%",
    pitch: "+0Hz",
    volume: "+5%",
  },
  {
    id: "Storybook",
    name: "Storybook & Fairy Tale",
    nameAr: "حكايات وأساطير",
    nameFr: "Conte & Merveilleux",
    icon: "",
    description: "Playful, melodic pitch modulation, warm bedtime tale cadence.",
    rate: "-5%",
    pitch: "+5Hz",
    volume: "+0%",
  },
  {
    id: "Emotional",
    name: "Emotional & Melancholy",
    nameAr: "مؤثر وحزين",
    nameFr: "Émotionnel & Tristesse",
    icon: "",
    description: "Slow, sorrowful lingering pacing, gentle lowered pitch.",
    rate: "-12%",
    pitch: "-4Hz",
    volume: "-15%",
  },
  {
    id: "Dramatic",
    name: "Dramatic & Theatrical",
    nameAr: "مسرحي وتعبيري",
    nameFr: "Théâtral & Expressif",
    icon: "",
    description: "Expressive theatrical delivery with broad dynamics and emotional presence.",
    rate: "-6%",
    pitch: "-3Hz",
    volume: "+10%",
  },
  {
    id: "Radio",
    name: "Radio & Energetic",
    nameAr: "إذاعي وحيوي",
    nameFr: "Dynamique & Radio",
    icon: "",
    description: "Crisp, fast, projected radio broadcast enthusiasm.",
    rate: "+12%",
    pitch: "+7Hz",
    volume: "+12%",
  },
  {
    id: "Calm",
    name: "Calm & Meditative",
    nameAr: "هادئ ومريح",
    nameFr: "Calme & Apaisant",
    icon: "",
    description: "Gentle, soothing flow, peaceful cadence for reflective narration.",
    rate: "-8%",
    pitch: "-2Hz",
    volume: "-5%",
  },
  {
    id: "HeatedArgument",
    name: "Heated Argument & Confrontation",
    nameAr: "مواجهة حادة وتصعيد",
    nameFr: "Confrontation & Colère",
    icon: "",
    description: "Fast tempo, sharp vocal projection, aggressive confrontational spikes.",
    rate: "+18%",
    pitch: "+10Hz",
    volume: "+25%",
  },
  {
    id: "DefensiveStammer",
    name: "Defensive & Hesitant Stammer",
    nameAr: "دفاع مرتبك وتردد",
    nameFr: "Défense Hésitante",
    icon: "",
    description: "Uneven cadence, emotional hesitation, strained defensive pitch.",
    rate: "-4%",
    pitch: "+5Hz",
    volume: "-2%",
  },
  {
    id: "VulnerableHeartbreak",
    name: "Vulnerable Heartbreak & Whisper",
    nameAr: "انكسار عاطفي وهمس",
    nameFr: "Vulnérabilité Émouvante",
    icon: "",
    description: "Quiet, suppressed grief, slow emotional admission with intimate breath.",
    rate: "-14%",
    pitch: "-8Hz",
    volume: "-22%",
  },
  {
    id: "BitterSarcasm",
    name: "Bitter Sarcasm & Mockery",
    nameAr: "سخرية مريرة ولاذعة",
    nameFr: "Sarcasme Amer",
    icon: "",
    description: "Biting irony, elongated emphasis, cool condescending cadence.",
    rate: "+4%",
    pitch: "-3Hz",
    volume: "+12%",
  },
];

export function getVoicesByLanguage(lang: "ar" | "en" | "fr"): VoiceInfo[] {
  return CATALOG_VOICES.filter((v) => v.lang === lang);
}

export function getVoiceById(id: string): VoiceInfo | undefined {
  return CATALOG_VOICES.find((v) => v.id === id);
}

export function getStyleById(id: string): ReadingStyleInfo | undefined {
  return CATALOG_STYLES.find((s) => s.id === id);
}
