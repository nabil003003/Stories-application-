/**
 * StoryForge Studio — Pure Dynamic Motion Video Engine (No Static Images)
 * 120+ Curated Royalty-Free Motion Video Loops & Offline Batch Downloader
 */

import { resolveBackendConnection } from "./api";

export interface MediaItem {
  id: string;
  title: string;
  type: "video";
  url: string;
  thumbnailUrl: string;
  theme: string;
  tags: string[];
  duration: number;
  source: string;
  aspectRatio: string;
  isLocal?: boolean;
  localUrl?: string;
}

export interface MatchedSceneVisual {
  sceneId: string;
  mediaId: string;
  title: string;
  type: "video";
  url: string;
  thumbnailUrl: string;
  theme: string;
  keywords: string[];
  motionEffect: "video-loop";
}

export interface VideoDownloadStatus {
  isDownloading: boolean;
  completed: number;
  total: number;
  currentId: string | null;
  currentTitle: string | null;
  percentage: number;
  localCachedCount: number;
  cachedIds: string[];
  errors: string[];
}

import curatedCatalog from "./curatedCatalog.json";

export const FALLBACK_CURATED_MEDIA: MediaItem[] = curatedCatalog as MediaItem[];

/**
 * Fetch curated 120+ video catalogue from backend with local cache status
 */
export async function fetchCuratedMedia(): Promise<MediaItem[]> {
  try {
    const { baseUrl, token } = await resolveBackendConnection();
    const res = await fetch(`${baseUrl}/api/media/curated`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = (await res.json()) as MediaItem[];
      return data.map((item) => {
        if (item.isLocal && item.localUrl) {
          return { ...item, url: `${baseUrl}${item.localUrl}` };
        }
        return item;
      });
    }
  } catch (err) {
    console.warn("Backend media fetch fallback:", err);
  }
  return FALLBACK_CURATED_MEDIA;
}

/**
 * Search media via backend search endpoint
 */
export async function searchMedia(
  query: string = "",
  theme: string = ""
): Promise<MediaItem[]> {
  try {
    const { baseUrl, token } = await resolveBackendConnection();
    const params = new URLSearchParams();
    if (query) params.append("query", query);
    if (theme) params.append("theme", theme);

    const res = await fetch(`${baseUrl}/api/media/search?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = (await res.json()) as MediaItem[];
      return data.map((item) => {
        if (item.isLocal && item.localUrl) {
          return { ...item, url: `${baseUrl}${item.localUrl}` };
        }
        return item;
      });
    }
  } catch (err) {
    console.warn("Backend media search fallback:", err);
  }

  const q = query.toLowerCase().trim();
  return FALLBACK_CURATED_MEDIA.filter((m) => {
    if (theme && m.theme !== theme) return false;
    if (!q) return true;
    return (
      m.title.toLowerCase().includes(q) ||
      m.theme.toLowerCase().includes(q) ||
      m.tags.some((t) => t.toLowerCase().includes(q))
    );
  });
}

/**
 * Query batch video caching status
 */
export async function fetchVideoDownloadStatus(): Promise<VideoDownloadStatus | null> {
  try {
    const { baseUrl, token } = await resolveBackendConnection();
    const res = await fetch(`${baseUrl}/api/media/download-status`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      return (await res.json()) as VideoDownloadStatus;
    }
  } catch (err) {
    console.warn("Fetch video download status error:", err);
  }
  return null;
}

/**
 * Trigger batch video download of all 100+ free videos
 */
export async function triggerDownloadAllVideos(): Promise<boolean> {
  try {
    const { baseUrl, token } = await resolveBackendConnection();
    const res = await fetch(`${baseUrl}/api/media/download-all-videos`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return res.ok;
  } catch (err) {
    console.warn("Trigger download all videos error:", err);
    return false;
  }
}

import { authFetch } from "./projectService";

const SUBJECT_KEYWORDS: Record<string, string[]> = {
  love: [
    "love", "romance", "couple", "heart", "kiss", "wedding", "dating", "valentine", "romantic",
    "حب", "رومانسية", "عشق", "زفاف", "قلب", "غرام",
    "amour", "romantique", "couple", "baiser", "mariage"
  ],
  food: [
    "food", "cooking", "kitchen", "eat", "meal", "recipe", "chef", "restaurant", "baking", "spices",
    "طعام", "طبخ", "مطبخ", "وجبة", "وصفة", "شيف",
    "cuisine", "repas", "cuisiner", "recette", "chef"
  ],
  people: [
    "people", "person", "human", "crowd", "community", "family", "friends", "portrait", "walking",
    "شخص", "ناس", "بشر", "أسرة", "مجتمع", "أصدقاء",
    "gens", "foule", "personne", "famille", "amis"
  ],
  war: [
    "war", "battle", "fight", "military", "soldier", "conflict", "weapon", "army", "smoke",
    "حرب", "معركة", "جندي", "سلاح", "صراع", "جيش",
    "guerre", "soldat", "combat", "bataille", "armée"
  ],
  study: [
    "study", "school", "education", "learn", "book", "library", "student", "reading", "notes",
    "دراسة", "تعلم", "مدرسة", "كتاب", "طالب", "مكتبة", "قراءة",
    "étude", "école", "livre", "étudiant", "bibliothèque"
  ],
  nature: [
    "nature", "forest", "mountain", "ocean", "sky", "river", "flower", "waterfall", "landscape", "trees",
    "طبيعة", "غابة", "جبل", "محيط", "سماء", "نهر", "شلال",
    "nature", "forêt", "montagne", "rivière", "cascade", "arbres"
  ],
  games: [
    "game", "sport", "play", "ball", "competition", "team", "stadium", "football", "soccer", "basketball",
    "لعبة", "رياضة", "كرة", "مباراة", "فريق", "ملعب", "منافسة",
    "jeu", "sport", "football", "stade", "équipe", "match"
  ],
  fighting: [
    "fight", "combat", "punch", "kick", "boxing", "martial", "duel", "sparring", "karate",
    "قتال", "ملاكمة", "مبارزة", "نزاع", "ضرب",
    "combat", "lutte", "boxe", "karaté", "duel"
  ],
  arguing: [
    "argue", "argument", "debate", "dispute", "conflict", "disagree", "discussion", "meeting", "confrontation",
    "شجار", "جدال", "خلاف", "نزاع", "نقاش", "مواجهة",
    "dispute", "débat", "conflit", "discussion"
  ],
  eating: [
    "eat", "eating", "dinner", "lunch", "breakfast", "meal", "restaurant", "burger", "pizza",
    "أكل", "طعام", "غداء", "عشاء", "وجبة", "مطعم", "فطور",
    "manger", "dîner", "déjeuner", "repas", "restaurant"
  ],
};

/**
 * Intelligently analyze story scenes and auto-match pure dynamic video loops
 * using multi-lingual semantic keyword scoring across all 12 thematic subjects.
 */
export async function autoMatchStoryVisuals(
  storyTitle: string,
  scenes: { id: string; text: string; speaker?: string }[]
): Promise<MatchedSceneVisual[]> {
  try {
    const res = await authFetch("/api/media/auto-match-story", {
      method: "POST",
      body: JSON.stringify({
        storyTitle,
        scenes,
      }),
    });
    if (res.ok) {
      const { baseUrl } = await resolveBackendConnection();
      const data = (await res.json()) as MatchedSceneVisual[];
      return data.map((item) => {
        if (item.url.startsWith("/api/media/local/")) {
          return { ...item, url: `${baseUrl}${item.url}` };
        }
        return item;
      });
    }
  } catch (err) {
    console.warn("Auto-match story backend fallback:", err);
  }

  // Client-side intelligent semantic auto-match
  const usedMediaIds = new Set<string>();

  return scenes.map((s, idx) => {
    const textLower = (s.text || "").toLowerCase();
    const titleLower = (storyTitle || "").toLowerCase();
    const combined = `${titleLower} ${textLower}`;

    // 1. Calculate scores for all themes
    const themeScores: Record<string, number> = {};
    for (const [theme, keywords] of Object.entries(SUBJECT_KEYWORDS)) {
      let score = 0;
      for (const kw of keywords) {
        if (textLower.includes(kw.toLowerCase())) {
          score += 4;
        } else if (titleLower.includes(kw.toLowerCase())) {
          score += 1;
        }
      }
      themeScores[theme] = score;
    }

    // Find best theme
    let bestTheme = "desert_epic";
    let highestThemeScore = -1;
    for (const [theme, score] of Object.entries(themeScores)) {
      if (score > highestThemeScore) {
        highestThemeScore = score;
        bestTheme = theme;
      }
    }

    // If zero matches, rotate themes gracefully
    if (highestThemeScore <= 0) {
      const themesList = Object.keys(SUBJECT_KEYWORDS);
      bestTheme = themesList[idx % themesList.length];
    }

    // 2. Select best clip within matching theme
    const themeVideos = FALLBACK_CURATED_MEDIA.filter((m) => m.theme === bestTheme);
    const candidatePool = themeVideos.length > 0 ? themeVideos : FALLBACK_CURATED_MEDIA;

    let bestMedia = candidatePool[0];
    let bestClipScore = -1;

    for (const media of candidatePool) {
      let clipScore = 0;
      for (const tag of media.tags) {
        if (combined.includes(tag.toLowerCase())) {
          clipScore += 3;
        }
      }
      // Prioritize unused clips for dynamic scene variation
      if (!usedMediaIds.has(media.id)) {
        clipScore += 2;
      }
      if (clipScore > bestClipScore) {
        bestClipScore = clipScore;
        bestMedia = media;
      }
    }

    usedMediaIds.add(bestMedia.id);

    return {
      sceneId: s.id,
      mediaId: bestMedia.id,
      title: bestMedia.title,
      type: "video",
      url: bestMedia.url,
      thumbnailUrl: bestMedia.thumbnailUrl,
      theme: bestMedia.theme,
      keywords: bestMedia.tags,
      motionEffect: "video-loop",
    };
  });
}
