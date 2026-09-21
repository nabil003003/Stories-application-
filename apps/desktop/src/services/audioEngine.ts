/**
 * StoryForge Studio — Real-time Dual Audio & Neural Speech Synthesis Engine
 * Provides instant voice playback (EN/AR/FR), ambient cinematic soundtrack bed,
 * and dynamic sidechain auto-ducking (-24dB to 0dB).
 */

import { resolveBackendConnection } from "./api";

export interface WordTiming {
  word: string;
  start_ms: number;
  duration_ms: number;
}

export interface SpeakOptions {
  text: string;
  language?: "en" | "ar" | "fr";
  pitch?: number;
  speed?: number;
  voice?: string;
  style?: string;
  rate?: string;         // e.g. "+18%", "-14%" (conversational speed modulation)
  pitchOffset?: string;  // e.g. "+10Hz", "-8Hz" (conversational pitch inflection)
  volume?: string;       // e.g. "+25%", "-20%" (conversational vocal projection)
  interruptionCutIn?: boolean;
  onStart?: () => void;
  onEnd?: () => void;
  onProgress?: (progress: number, currentTime: number, duration: number) => void;
  onWordBoundary?: (wordIndex: number, words: WordTiming[]) => void;
}

class AudioEngine {
  // Web Audio Context for speech mastering & procedural backup
  private ctx: AudioContext | null = null;
  private masterGainNode: GainNode | null = null;
  private musicGainNode: GainNode | null = null;

  // Active Speech Audio & Queue Session
  private currentSpeechAudio: HTMLAudioElement | null = null;
  private currentSessionId: number = 0;
  private activeObjectUrls: string[] = [];

  // Background Music Engine
  private currentMusicAudio: HTMLAudioElement | null = null;
  private currentTrackId: string = "none";
  private isMusicPlaying: boolean = false;
  private musicVolume: number = 0.35;
  private duckingDb: number = 0;

  // State Change Subscriptions
  private stateListeners: Set<(playing: boolean, track: string) => void> = new Set();

  private initContext() {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGainNode = this.ctx.createGain();
      this.masterGainNode.gain.setValueAtTime(0.9, this.ctx.currentTime);
      this.masterGainNode.connect(this.ctx.destination);

      this.musicGainNode = this.ctx.createGain();
      this.musicGainNode.gain.setValueAtTime(this.calculateTargetVolume(), this.ctx.currentTime);
      this.musicGainNode.connect(this.masterGainNode);
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  // ==========================================
  // 1. NEURAL & SPEECH SYNTHESIS ENGINE
  // ==========================================

  /**
   * Split long text into natural sentence / phrase chunks for instant start (<1s).
   */
  private splitIntoSpeechChunks(rawText: string): string[] {
    if (!rawText || !rawText.trim()) return [];
    const text = rawText.trim();
    const words = text.split(/\s+/);
    if (words.length <= 22) return [text];

    // Split on punctuation and paragraph boundaries
    const sentenceRegex = /[^.!?؟;\n؛:]+[.!?؟;\n؛:]*/g;
    const matches = text.match(sentenceRegex);
    if (!matches || matches.length <= 1) {
      // Split by word groups if no punctuation
      const chunks: string[] = [];
      let currentChunk: string[] = [];
      for (const w of words) {
        currentChunk.push(w);
        if (currentChunk.length >= 20) {
          chunks.push(currentChunk.join(" "));
          currentChunk = [];
        }
      }
      if (currentChunk.length > 0) chunks.push(currentChunk.join(" "));
      return chunks;
    }

    const chunks: string[] = [];
    let buffer = "";
    for (const match of matches) {
      const trimmed = match.trim();
      if (!trimmed) continue;
      const combined = (buffer + " " + trimmed).trim();
      if (combined.split(/\s+/).length > 22 && buffer.length > 0) {
        chunks.push(buffer.trim());
        buffer = trimmed;
      } else {
        buffer = combined;
      }
    }
    if (buffer.trim()) chunks.push(buffer.trim());
    return chunks.length > 0 ? chunks : [text];
  }

  // Speech Blob Cache for Instant (<50ms) Conversational Turnaround
  private audioBlobCache: Map<string, Blob> = new Map();
  private wordTimingsCache: Map<string, WordTiming[]> = new Map();
  private dbPromise: Promise<IDBDatabase | null> | null = null;

  private async getDb(): Promise<IDBDatabase | null> {
    if (typeof indexedDB === "undefined") return null;
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve) => {
        try {
          const req = indexedDB.open("storyforge-audio-cache", 1);
          req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains("blobs")) {
              db.createObjectStore("blobs", { keyPath: "key" });
            }
          };
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      });
    }
    return this.dbPromise;
  }

  private async idbGet(key: string): Promise<Blob | null> {
    try {
      const db = await this.getDb();
      if (!db) return null;
      return new Promise((resolve) => {
        const tx = db.transaction("blobs", "readonly");
        const store = tx.objectStore("blobs");
        const req = store.get(key);
        req.onsuccess = () => {
          if (req.result && req.result.blob) {
            resolve(req.result.blob);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  private async idbSet(key: string, blob: Blob): Promise<void> {
    try {
      const db = await this.getDb();
      if (!db) return;
      const tx = db.transaction("blobs", "readwrite");
      const store = tx.objectStore("blobs");
      store.put({ key, blob, timestamp: Date.now() });
    } catch (err) {
      console.warn("IndexedDB cache save warning:", err);
    }
  }

  /**
   * Pre-fetches dialogue line audio so playback starts in under 50ms with zero network pause.
   */
  public async preloadSpeech(opts: SpeakOptions): Promise<void> {
    const text = (opts.text || "").trim();
    if (!text) return;
    const cacheKey = `${opts.voice || "def"}_${opts.style || "def"}_${opts.rate || "0"}_${opts.pitchOffset || "0"}_${opts.volume || "0"}_${opts.speed ?? 1.0}_${opts.pitch ?? 1.0}_${text}`;
    if (this.audioBlobCache.has(cacheKey)) return;
    const fromIdb = await this.idbGet(cacheKey);
    if (fromIdb) {
      this.audioBlobCache.set(cacheKey, fromIdb);
      return;
    }
    await this.fetchTtsAudio(text, opts);
  }

  /**
   * Fetches single audio segment from backend Edge-TTS with multi-tier memory + IndexedDB caching.
   */
  private async fetchTtsAudio(
    chunkText: string,
    opts: SpeakOptions
  ): Promise<{ audio: HTMLAudioElement; url: string; words?: WordTiming[] } | null> {
    const textTrimmed = chunkText.trim();
    if (!textTrimmed) return null;

    const cacheKey = `${opts.voice || "def"}_${opts.style || "def"}_${opts.rate || "0"}_${opts.pitchOffset || "0"}_${opts.volume || "0"}_${opts.speed ?? 1.0}_${opts.pitch ?? 1.0}_${textTrimmed}`;

    // 1. Level 1: Memory cache
    if (this.audioBlobCache.has(cacheKey)) {
      const blob = this.audioBlobCache.get(cacheKey)!;
      const audioUrl = URL.createObjectURL(blob);
      this.activeObjectUrls.push(audioUrl);
      const audio = new Audio(audioUrl);
      const words = this.wordTimingsCache.get(cacheKey);
      return { audio, url: audioUrl, words };
    }

    // 2. Level 2: Persistent IndexedDB cache (survives app reload)
    const idbBlob = await this.idbGet(cacheKey);
    if (idbBlob) {
      this.audioBlobCache.set(cacheKey, idbBlob);
      const audioUrl = URL.createObjectURL(idbBlob);
      this.activeObjectUrls.push(audioUrl);
      const audio = new Audio(audioUrl);
      const words = this.wordTimingsCache.get(cacheKey);
      return { audio, url: audioUrl, words };
    }

    // 3. Level 3: Backend Edge-TTS synthesis
    try {
      const { baseUrl, token } = await resolveBackendConnection();
      const speed = opts.speed ?? 1.0;
      const pitch = opts.pitch ?? 1.0;

      const computedRate = opts.rate
        ? opts.rate
        : speed >= 1
        ? `+${Math.round((speed - 1) * 100)}%`
        : `-${Math.round((1 - speed) * 100)}%`;

      const computedPitch = opts.pitchOffset
        ? opts.pitchOffset
        : pitch >= 1
        ? `+${Math.round((pitch - 1) * 50)}Hz`
        : `-${Math.round((1 - pitch) * 50)}Hz`;

      // If client requests word boundary timing, invoke timing endpoint
      if (opts.onWordBoundary) {
        try {
          const timingRes = await fetch(`${baseUrl}/api/tts/synthesize-with-timing`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              text: textTrimmed,
              language: opts.language || "en",
              voice: opts.voice || undefined,
              rate: computedRate,
              pitch: computedPitch,
              volume: opts.volume || undefined,
            }),
          });
          if (timingRes.ok) {
            const data = await timingRes.json();
            const binaryStr = atob(data.audio_base64);
            const bytes = new Uint8Array(binaryStr.length);
            for (let i = 0; i < binaryStr.length; i++) {
              bytes[i] = binaryStr.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: "audio/mpeg" });
            this.audioBlobCache.set(cacheKey, blob);
            this.idbSet(cacheKey, blob);
            if (data.words) {
              this.wordTimingsCache.set(cacheKey, data.words);
            }
            const audioUrl = URL.createObjectURL(blob);
            this.activeObjectUrls.push(audioUrl);
            const audio = new Audio(audioUrl);
            return { audio, url: audioUrl, words: data.words };
          }
        } catch (timingErr) {
          console.warn("Timing endpoint fetch failed, falling back to standard synthesis:", timingErr);
        }
      }

      // Standard synthesis fallback
      const response = await fetch(`${baseUrl}/api/tts/synthesize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          text: textTrimmed,
          language: opts.language || "en",
          voice: opts.voice || undefined,
          rate: computedRate,
          pitch: computedPitch,
          volume: opts.volume || undefined,
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        this.audioBlobCache.set(cacheKey, blob);
        this.idbSet(cacheKey, blob);
        const audioUrl = URL.createObjectURL(blob);
        this.activeObjectUrls.push(audioUrl);
        const audio = new Audio(audioUrl);
        return { audio, url: audioUrl };
      }
    } catch (err) {
      console.warn("Backend TTS fetch error for chunk:", err);
    }
    return null;
  }

  /**
   * Synthesizes and plays text using studio-grade Neural TTS (Arabic, French, English)
   * with custom voice casting and reading delivery style prosody.
   * Automatically streams long text chunk-by-chunk for instant playback (< 1 second).
   */
  public async speak(
    textOrOptions: string | SpeakOptions,
    legacyLanguage: "en" | "ar" | "fr" = "en",
    legacyPitch: number = 1.0,
    legacySpeed: number = 1.0,
    legacyOnStart?: () => void,
    legacyOnEnd?: () => void,
    legacyVoice?: string,
    legacyStyle?: string
  ): Promise<boolean> {
    const opts: SpeakOptions =
      typeof textOrOptions === "object"
        ? textOrOptions
        : {
            text: textOrOptions,
            language: legacyLanguage,
            pitch: legacyPitch,
            speed: legacySpeed,
            onStart: legacyOnStart,
            onEnd: legacyOnEnd,
            voice: legacyVoice,
            style: legacyStyle,
          };

    const {
      text,
      language = "en",
      pitch = 1.0,
      speed = 1.0,
      onStart,
      onEnd,
    } = opts;

    this.stopSpeech();
    this.initContext();
    this.duckMusic(true);

    const sessionId = ++this.currentSessionId;
    if (onStart) onStart();

    const chunks = this.splitIntoSpeechChunks(text);

    // 1. If only 1 chunk or empty text, standard fast synthesis
    if (chunks.length <= 1) {
      const singleText = chunks[0] || text;
      const res = await this.fetchTtsAudio(singleText, opts);
      if (sessionId !== this.currentSessionId) {
        if (res) URL.revokeObjectURL(res.url);
        return false;
      }

      if (res) {
        const { audio, url } = res;
        this.currentSpeechAudio = audio;

        let hasFiredEnd = false;
        const fireEndOnce = () => {
          if (hasFiredEnd) return;
          hasFiredEnd = true;
          if (sessionId === this.currentSessionId) {
            if (onEnd) onEnd();
          }
        };

        const wordTimings = res.words;
        // Edge-TTS leaves ~200-240ms of dead silence at the end of MP3 files.
        // Trigger onEnd early to allow instantaneous, seamless conversational turnover between dialogue speakers!
        audio.ontimeupdate = () => {
          if (sessionId === this.currentSessionId && audio.duration) {
            if (opts.onProgress) {
              opts.onProgress(audio.currentTime / audio.duration, audio.currentTime, audio.duration);
            }
            if (opts.onWordBoundary && wordTimings && wordTimings.length > 0) {
              const currentMs = audio.currentTime * 1000;
              const wordIdx = wordTimings.findIndex((w, i) => {
                const next = wordTimings[i + 1];
                return currentMs >= w.start_ms && (!next || currentMs < next.start_ms);
              });
              if (wordIdx >= 0) {
                opts.onWordBoundary(wordIdx, wordTimings);
              }
            }
            if (!hasFiredEnd) {
              const cutoffSilenceSeconds = 0.22;
              if (audio.duration > 0.5 && audio.currentTime >= audio.duration - cutoffSilenceSeconds) {
                fireEndOnce();
              }
            }
          }
        };

        audio.onended = () => {
          if (sessionId === this.currentSessionId) {
            this.duckMusic(false);
            URL.revokeObjectURL(url);
            this.currentSpeechAudio = null;
            fireEndOnce();
          }
        };

        audio.onerror = () => {
          if (sessionId === this.currentSessionId) {
            this.duckMusic(false);
            URL.revokeObjectURL(url);
            this.currentSpeechAudio = null;
            fireEndOnce();
          }
        };

        await audio.play();
        return true;
      }
    } else {
      // 2. Multi-chunk Long Text: Instant Start + Prefetch Queue
      const prefetchPromises: (Promise<{ audio: HTMLAudioElement; url: string } | null> | null)[] = new Array(chunks.length).fill(null);

      const getChunkPromise = (idx: number) => {
        if (idx >= chunks.length) return Promise.resolve(null);
        if (!prefetchPromises[idx]) {
          prefetchPromises[idx] = this.fetchTtsAudio(chunks[idx], opts);
        }
        return prefetchPromises[idx]!;
      };

      // Kick off chunk 0 and prefetch chunk 1 immediately
      getChunkPromise(0);
      if (chunks.length > 1) getChunkPromise(1);

      let currentIdx = 0;
      const chunkWordCounts = chunks.map((c) => Math.max(1, c.trim().split(/\s+/).filter(Boolean).length));
      const totalSpeechWords = chunkWordCounts.reduce((a, b) => a + b, 0);

      const playNextChunk = async () => {
        if (sessionId !== this.currentSessionId) return;

        if (currentIdx >= chunks.length) {
          this.duckMusic(false);
          this.currentSpeechAudio = null;
          if (onEnd) onEnd();
          return;
        }

        // Prefetch next 2 chunks in advance
        getChunkPromise(currentIdx + 1);
        getChunkPromise(currentIdx + 2);

        const currentRes = await getChunkPromise(currentIdx);
        if (sessionId !== this.currentSessionId) {
          if (currentRes) URL.revokeObjectURL(currentRes.url);
          return;
        }

        if (currentRes) {
          const { audio, url } = currentRes;
          this.currentSpeechAudio = audio;

          let hasFiredNext = false;
          const fireNextChunk = () => {
            if (hasFiredNext) return;
            hasFiredNext = true;
            if (sessionId === this.currentSessionId) {
              URL.revokeObjectURL(url);
              currentIdx++;
              playNextChunk();
            }
          };

          audio.ontimeupdate = () => {
            if (sessionId === this.currentSessionId && audio.duration) {
              if (opts.onProgress) {
                let wordsBefore = 0;
                for (let k = 0; k < currentIdx; k++) {
                  wordsBefore += chunkWordCounts[k];
                }
                const chunkFrac = Math.max(0, Math.min(1, audio.currentTime / audio.duration));
                const currentWordsInChunk = chunkFrac * chunkWordCounts[currentIdx];
                const totalProgress = Math.min(0.999, (wordsBefore + currentWordsInChunk) / totalSpeechWords);
                opts.onProgress(totalProgress, audio.currentTime, audio.duration);
              }
              if (!hasFiredNext) {
                const cutoffSilenceSeconds = 0.22;
                if (audio.duration > 0.5 && audio.currentTime >= audio.duration - cutoffSilenceSeconds) {
                  fireNextChunk();
                }
              }
            }
          };

          audio.onended = () => {
            fireNextChunk();
          };

          audio.onerror = () => {
            fireNextChunk();
          };

          try {
            await audio.play();
          } catch {
            currentIdx++;
            playNextChunk();
          }
        } else {
          // Skip failed chunk and continue
          currentIdx++;
          playNextChunk();
        }
      };

      await playNextChunk();
      return true;
    }

    // 3. Fallback to browser Web Speech API
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.pitch = Math.max(0.5, Math.min(2.0, pitch));
      utterance.rate = Math.max(0.5, Math.min(2.0, speed));

      const voices = window.speechSynthesis.getVoices();
      let langCode = "en-US";
      if (language === "ar") langCode = "ar";
      if (language === "fr") langCode = "fr";

      const matchedVoice = voices.find((v) =>
        v.lang.toLowerCase().startsWith(langCode)
      );
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }
      utterance.lang = langCode;

      utterance.onend = () => {
        this.duckMusic(false);
        if (onEnd) onEnd();
      };

      utterance.onerror = () => {
        this.duckMusic(false);
        if (onEnd) onEnd();
      };

      window.speechSynthesis.speak(utterance);
      return true;
    }

    this.duckMusic(false);
    if (onEnd) onEnd();
    return false;
  }

  public stopSpeech() {
    this.currentSessionId++;
    if (this.currentSpeechAudio) {
      this.currentSpeechAudio.pause();
      this.currentSpeechAudio = null;
    }
    for (const url of this.activeObjectUrls) {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // Ignore
      }
    }
    this.activeObjectUrls = [];

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    this.duckMusic(false);
  }

  // ==========================================
  // 2. CINEMATIC BACKGROUND SOUNDTRACK ENGINE
  // ==========================================

  /**
   * Start or switch to a cinematic soundtrack bed
   */
  public playMusic(trackId: string = "none"): boolean {
    if (!trackId || trackId === "none") {
      this.stopMusic();
      return false;
    }

    // Normalize track filename without forcing .wav
    let cleanId = trackId.trim();
    if (!cleanId.includes(".")) {
      cleanId = `${cleanId}.ogg`;
    }

    const isSameTrack = this.currentTrackId === cleanId;
    this.currentTrackId = cleanId;

    // If already playing this exact track, make sure volume is target
    if (this.isMusicPlaying && this.currentMusicAudio && isSameTrack) {
      this.currentMusicAudio.volume = this.calculateTargetVolume();
      return true;
    }

    this.stopMusic();
    this.currentTrackId = cleanId;
    this.initContext();

    try {
      const audio = new Audio(`/audio/${cleanId}`);
      audio.loop = true;
      audio.volume = this.calculateTargetVolume();
      this.currentMusicAudio = audio;

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            this.isMusicPlaying = true;
            this.notifyMusicState();
          })
          .catch((err) => {
            console.warn("Audio file play error:", err);
            this.isMusicPlaying = false;
            this.notifyMusicState();
          });
      }
      return true;
    } catch (err) {
      console.warn("HTML5 audio playback error:", err);
      this.isMusicPlaying = false;
      this.notifyMusicState();
      return false;
    }
  }

  /**
   * Pause background music
   */
  public pauseMusic() {
    if (this.currentMusicAudio) {
      this.currentMusicAudio.pause();
    }
    this.isMusicPlaying = false;
    this.notifyMusicState();
  }

  /**
   * Stop background music completely
   */
  public stopMusic() {
    if (this.currentMusicAudio) {
      this.currentMusicAudio.pause();
      this.currentMusicAudio.currentTime = 0;
      this.currentMusicAudio = null;
    }
    this.isMusicPlaying = false;
    this.notifyMusicState();
  }

  /**
   * Toggle music on/off
   */
  public toggleMusic(trackId?: string): boolean {
    if (this.isMusicPlaying) {
      this.stopMusic();
      return false;
    } else {
      return this.playMusic(trackId || this.currentTrackId);
    }
  }

  /**
   * Adjust master music volume (0.0 to 1.0)
   */
  public setMusicVolume(volume: number) {
    this.musicVolume = Math.max(0.0, Math.min(1.0, volume));
    const target = this.calculateTargetVolume();

    if (this.currentMusicAudio) {
      this.currentMusicAudio.volume = target;
    }
    if (this.ctx && this.musicGainNode) {
      this.musicGainNode.gain.setValueAtTime(target, this.ctx.currentTime);
    }
  }

  /**
   * Compatibility method for ducking settings (ducking disabled to preserve pure instrumental tone)
   */
  public setDuckingDb(db: number) {
    this.duckingDb = Math.max(-30, Math.min(0, db));
  }

  /**
   * Compatibility alias for startAmbientBed
   */
  public startAmbientBed(trackId: string = "beethoven_moonlight.ogg") {
    this.playMusic(trackId);
  }

  /**
   * Compatibility alias for stopAmbientBed
   */
  public stopAmbientBed() {
    this.stopMusic();
  }

  /**
   * Auto-ducking is intentionally disabled to eliminate pumping noise and audio artifacts.
   * Background pure instruments stay at the exact stable volume chosen by the user.
   */
  public duckMusic(_duck: boolean) {
    // No-op: preserve steady, crystal-clear acoustic instrument playback
  }

  private calculateTargetVolume(): number {
    if (!this.isMusicPlaying) return 0;
    return Math.max(0.0, Math.min(1.0, this.musicVolume));
  }

  /**
   * Stop all active playback (speech narration and background music)
   */
  public stopAll() {
    this.stopSpeech();
    this.stopMusic();
  }

  // ==========================================
  // 4. STATE GETTERS & SUBSCRIPTIONS
  // ==========================================

  public isMusicActive(): boolean {
    return this.isMusicPlaying;
  }

  public getCurrentTrack(): string {
    return this.currentTrackId;
  }

  public getMusicVolume(): number {
    return this.musicVolume;
  }

  public getDuckingDb(): number {
    return this.duckingDb;
  }

  public subscribeMusicState(listener: (playing: boolean, track: string) => void): () => void {
    this.stateListeners.add(listener);
    listener(this.isMusicPlaying, this.currentTrackId);
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  private notifyMusicState() {
    for (const listener of this.stateListeners) {
      try {
        listener(this.isMusicPlaying, this.currentTrackId);
      } catch {
        // Ignore
      }
    }
  }
}

export const audioEngine = new AudioEngine();
