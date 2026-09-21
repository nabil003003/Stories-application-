# StoryForge Studio — Build Specification & Agent Operating Contract

**Version:** 2.0
**Purpose:** This document is the single source of truth for an AI coding agent building StoryForge Studio. It is also committed to the repo as `AGENT.md` (or `CLAUDE.md`) so every session starts from the same contract.

---

## PART 0 — HOW TO USE THIS DOCUMENT

**Do not paste this entire document and say "build it."** That produces a plausible-looking skeleton full of stubs — the exact failure mode Part 1 forbids.

Correct usage:

1. **Session 1:** Paste Parts 0–4 plus **Milestone 0**. The agent produces a plan and a skeleton, and stops.
2. **Session N:** Paste Parts 0–4 (short, always in context) plus **exactly one milestone** from Part 5. The agent completes it, proves it works, updates `STATE.md`, and stops.
3. Part 6 is reference detail. Paste only the sections relevant to the current milestone.

Each milestone must end with a **runnable application**. If a milestone can't be finished, the agent ships the working subset and writes the gap into `STATE.md` — it does not ship stubs.

---

## PART 1 — AGENT OPERATING CONTRACT

You are building a desktop application that a real person will use daily to produce narrated audio and vertical video from long-form stories. Not a demo. Not a portfolio piece.

### 1.1 The working-state invariant

After **every** commit:

```
pnpm install && pnpm tauri dev          # app launches, no console errors
pnpm -r typecheck && pnpm -r lint       # clean
uv run pytest                           # green
uv run ruff check . && uv run mypy app  # clean
```

If a change breaks any of these, fix it before moving on. Never commit red.

### 1.2 Hard rules

| Rule | Meaning |
|---|---|
| No fake UI | Every control does what it says or is not rendered. No disabled-with-tooltip placeholders for core features. |
| No TODO for scoped work | If it's in the current milestone, implement it. If it's out of scope, it's not in the UI. |
| No invented APIs | Before using any library API, verify against current docs. Your training data may be stale. If you cannot verify, say so and pick a verified alternative. |
| No secrets in code | API keys come from OS credential store via Tauri, never from frontend source, never logged, never returned by the API. |
| No silent cloud | Never send user text/audio to a remote service unless the user explicitly configured that provider and the UI shows `CLOUD` before the action. |
| No shell from model output | LLM output never becomes a shell command, a file path, or a SQL fragment. Whitelisted operation schema only. |
| Files are atomic | Write to temp, fsync, rename. Never truncate a project or an export in place. |
| Sources are immutable | Never modify or overwrite imported media or source text as a side effect of audio work. |

### 1.3 Ask vs. decide

**Decide and document** (write it to `DECISIONS.md`): library choices, file layout, schema shape, algorithm selection, naming, UI micro-decisions.

**Stop and ask** only when:
- A requirement contradicts another requirement in this document.
- A choice creates an irreversible data-format commitment not specified here.
- A dependency requires a paid account or a license that may not permit the intended use.
- Hardware/platform reality makes a stated requirement impossible.

Ask at most 3 questions, batched, then proceed on stated assumptions if unanswered.

### 1.4 Session continuity

Maintain three files at repo root. Read them at the start of every session; update them at the end.

- **`STATE.md`** — current milestone, what works, what's stubbed, what's broken, next 3 tasks, how to verify the last thing you built.
- **`DECISIONS.md`** — append-only ADR log: `Date | Decision | Alternatives rejected | Why | Reversible?`
- **`RISKS.md`** — known unverified assumptions, license uncertainties, performance unknowns.

### 1.5 Work granularity

Commit in units that are individually reviewable and individually revertable. Conventional commits. A commit that touches >15 files or >600 lines should have been two commits, unless it's a generated migration or a mechanical rename.

### 1.6 Definition of Done for any feature

1. Implemented, typed, no `any` / no bare `dict`.
2. Unit tests for the logic; integration test for the seam.
3. Error paths produce actionable messages (Part 6.11), not stack traces.
4. Long operations are cancellable and report progress.
5. The feature appears in `STATE.md` under "works."
6. A one-line manual verification recipe exists ("open X, click Y, expect Z").

---

## PART 2 — PRODUCT SCOPE

### 2.1 What this is

A local-first desktop studio that turns a long written story into professional narrated audio and vertical video. It combines a story/scene editor, a character-to-voice manager, a long-form TTS pipeline, a multitrack timeline, an auto-ducking mixer, a subtitle engine, and a video renderer.

Inspiration is drawn from interaction patterns in narration tools, short-form video editors, and DAWs. **Do not copy any proprietary code, branding, visual identity, assets, or UI from any product.**

### 2.2 The load-bearing workflow (optimize the architecture for this, not for a 60-second demo)

```
100,000-word story · Arabic + English + French · 8 characters
→ ~2 hours of narration · 20 music regions · 50 SFX · 100+ timeline clips
→ subtitles · vertical video · stem exports
```

Everything follows from this: chunking, caching, resumable jobs, virtualized UI, streaming audio, incremental render.

### 2.3 v1 scope — BUILD THIS

- Project create/open/save/recover, `.storyforge` project directory
- Import: paste, TXT, DOCX, PDF
- Story editor with chapter/scene outline, virtualized
- Deterministic scene/character/dialogue segmentation (rules-based) + **optional** LLM enrichment
- Character → voice assignment with versioning
- Local TTS: Chatterbox Multilingual (primary), Piper (fallback) — AR/EN/FR minimum
- Long-form chunking, caching, resumable job queue, per-chunk retry
- Multitrack timeline with real editable clip objects: move/trim/split/fade/gain/pan/mute/solo/lock
- Music + ambience + SFX from **local library and user import**
- Mixer: gain, pan, HPF, EQ, compressor, limiter, **sidechain ducking**, LUFS normalization
- Subtitles: SRT + VTT, RTL-correct
- Vertical 9:16 MP4 render with burned-in or sidecar captions
- Export: MP3, WAV, SRT, VTT, MP4, stems
- Undo/redo, autosave, crash recovery
- Windows installer with bundled Python sidecar

### 2.4 v1 NON-scope — DO NOT BUILD

Cut ruthlessly. These are `RISKS.md` entries and post-v1 milestones, not v1 code:

- ❌ AI **music generation** (local or cloud) — v1 uses a licensed local library + user import only
- ❌ Per-instrument generative tracks — the instrument system is just additional audio tracks in v1
- ❌ Stem separation
- ❌ Cloud TTS providers (ElevenLabs etc.) — define the interface, ship **one** local provider pair; add cloud in v1.1
- ❌ Reverb (ship HPF/EQ/comp/limiter first; reverb is a quality nicety)
- ❌ 4K video, animated backgrounds, Ken Burns — v1 does static image or looped background video
- ❌ Word-by-word caption animation (needs forced alignment — see 4.5)
- ❌ macOS/Linux builds (architecture must not block them; do not spend time on them)
- ❌ Cost estimation UI, PostgreSQL server mode, cloud storage, GitHub/HuggingFace integrations
- ❌ Full i18n of the UI — externalize strings from day one, ship English only

The provider abstraction must make each of these an additive change, not a rewrite. That is the point of the abstraction — not to ship six half-working providers.

---

## PART 3 — ARCHITECTURE DECISIONS (ALREADY MADE — DO NOT RE-LITIGATE)

Record each of these in `DECISIONS.md` on day one with its rationale.

### 3.1 Stack

| Layer | Choice | Notes |
|---|---|---|
| Shell | Tauri 2 (Rust) | Windows 10/11 x64 primary |
| Frontend | React + TypeScript (strict) + Vite + Tailwind + shadcn/ui + Zustand | |
| Backend | Python 3.11 + FastAPI, packaged as a Tauri **sidecar** | user never installs Python or Node |
| AI | PyTorch; Chatterbox Multilingual; Piper (ONNX Runtime) | |
| Audio | FFmpeg (bundled binary) + numpy/soundfile for DSP | |
| DB | SQLite per project + one app-level SQLite for settings/recents | Alembic migrations |
| Package mgmt | pnpm workspaces; `uv` for Python | |

Pin every version in a lockfile. No floating majors.

### 3.2 Where audio actually happens (the original spec left this ambiguous — it is the #1 architecture hole)

Two engines, one contract:

- **Preview engine (frontend, Web Audio API):** decodes clip audio, schedules playback, applies gain/pan/fades and a *precomputed* ducking gain curve. Fast, scrubbable, approximate.
- **Render engine (backend, Python + FFmpeg):** authoritative. Produces every exported file.

**Contract:** both consume the same `TimelineDocument` JSON and the same deterministic `AutomationCurve` values. The ducking envelope is **computed once in the backend** from narration RMS and stored in the project; the frontend replays it rather than recomputing. Any divergence beyond gain-staging is a bug.

Preview must never require an export. Backend exposes `POST /api/render/preview` for range renders when exact fidelity is needed (final check before export).

### 3.3 Audio format policy

- Internal working format: **48 kHz, float32, mono for voice / stereo for music+SFX**
- Resample on import; never resample mid-pipeline
- Chatterbox outputs at its native SR → resample once at cache-write time, store at 48 kHz
- Store cached segments as **FLAC** (lossless, ~50% of WAV)
- Exports: MP3 (LAME V0 / 192k speech preset), WAV 48k/24-bit, MP4 H.264 + AAC 192k

### 3.4 Job execution model

- **One** GPU worker process. TTS is serialized through a single queue — concurrency on a single GPU causes OOM, not speed.
- CPU-bound audio work (FFmpeg, DSP) runs in a bounded process pool sized to `cpu_count - 2`.
- FastAPI handles I/O with asyncio and never blocks on inference.
- Progress via **SSE** (`GET /api/jobs/{id}/events`), not WebSockets — one-directional, survives reconnect, far simpler. Cancel is a separate POST.
- Jobs and per-chunk state persist in SQLite so a crash resumes instead of restarting.

### 3.5 Sidecar lifecycle & local API security

- Backend binds `127.0.0.1:0`, writes the chosen port + a random 32-byte session token to a file in Tauri's app-data dir.
- **Every** API request requires `Authorization: Bearer <token>`. Without this, any local process can drive the user's studio.
- Tauri reads the port file, health-checks `/api/health`, and supervises: restart on crash (max 3, then surface a diagnostics dialog), graceful shutdown on app exit, kill orphans on startup.

### 3.6 Storage layout

```
MyStory.storyforge/
  project.json          # manifest: schema version, id, name, created, app version
  project.sqlite        # all structured state
  originals/            # imported media — IMMUTABLE
  generated/            # TTS output, addressed by cache key
  processed/            # post-processed segments
  renders/              # scene/chapter intermediate renders
  exports/
  waveforms/            # cached peak data
  video/
  subtitles/
  .recovery/            # crash-recovery journal
```

Large binaries never go in SQLite. SQLite holds metadata and **relative** paths only, so the folder is portable between machines.

### 3.7 Cache key

```
sha256(provider | model_version | voice_id | voice_ref_hash | language |
       normalized_text | settings_json | seed | postprocess_version | audio_format_version)
```

Changing music must not invalidate voice. Changing a voice setting must invalidate only that character's chunks. Bump `postprocess_version` whenever DSP changes; that is your cache-correctness lever.

---

## PART 4 — VERIFIED TECHNICAL REALITIES & REQUIRED MITIGATIONS

These are researched facts. Do not design around assumptions that contradict them.

### 4.1 Chatterbox Multilingual — correct facts

- The model is **"Chatterbox Multilingual"** by Resemble AI. There is no "V3." Package: `chatterbox-tts`. Class: `chatterbox.mtl_tts.ChatterboxMultilingualTTS`.
- **23 languages**, including `ar`, `en`, `fr`. Query them at runtime: `ChatterboxMultilingualTTS.get_supported_languages()` — **never hardcode the list in the UI.**
- `language_id` takes ISO-639-1 two-letter codes and raises on unsupported values.
- Code is MIT. **Verify the model weights' license separately** and record it in `LICENSES.md`.

**Two consequences the original spec missed:**

1. **Chatterbox is zero-shot cloning — it has no built-in voice catalogue.** Every "voice" is a reference audio clip. Therefore the "Voice Library" is a library of *reference clips you must source and license yourself*. Plan for: a small set of bundled, clearly-licensed reference clips (CC0 or explicitly permissive, e.g. from a public-domain speech corpus) per language, plus user-supplied clips. Store `license`, `source_url`, `author`, `consent_confirmed_at` for every one. Do not ship a voice you cannot document.
2. **Output carries Resemble's PerTh neural watermark.** Disclose this in `LICENSES.md` and in Settings. Users publishing commercially should know. Do not attempt to remove it.

### 4.2 Piper is a weak Arabic fallback — design accordingly

Piper ships **one** Arabic voice: `ar_JO-kareem` (low/medium), Jordanian MSA, male. French has a handful (`siwis`, `gilles`, `upmc`, `mls`); English has many.

So: **a multi-character Arabic story cannot fall back to Piper.** The fallback chain must be capability-aware, not blind:

```
requested (character, language, needs_distinct_voice)
  → Chatterbox + reference clip
  → Piper IF a voice exists for that language AND the project needs ≤1 voice in it
  → otherwise: FAIL LOUDLY with "No Arabic voice available for 3 characters.
     Chatterbox model is not installed. [Install model] [Assign shared voice]"
```

Never silently collapse eight characters onto one voice.

### 4.3 Arabic is the hardest requirement in this spec — treat it first-class from Milestone 1

- **Diacritization (tashkīl) drives pronunciation quality.** Undiacritized MSA is ambiguous; TTS guesses vowels and gets names and verb forms wrong. Implement a `TextNormalizer` stage with a pluggable Arabic diacritizer (evaluate options; if none is acceptable, expose a manual per-word override via the pronunciation dictionary and document the limitation in `RISKS.md`). This step must run **before** the cache key is computed.
- **Numbers, dates, currency, Latin names inside Arabic text** must be normalized to spoken Arabic words, not read as digits. Write unit tests for `٢٠٢٤`, `2024`, `15%`, `د.م. 350`, `"Sarah"` inside an Arabic sentence.
- **Editor & subtitles need real bidi**: `dir="auto"` per paragraph, logical-order storage, Unicode bidi isolates around embedded Latin runs.
- **Burned-in Arabic captions:** FFmpeg's `drawtext` does **not** do Arabic shaping or bidi reordering — it will render disconnected, reversed letterforms. You must use the **`subtitles` filter with libass** (which uses HarfBuzz + FriBidi), rendering from an **ASS** file, with a bundled font that has full Arabic coverage (e.g. Noto Naskh Arabic / Noto Sans Arabic, SIL OFL). Verify your FFmpeg build has `--enable-libass --enable-libfribidi --enable-libharfbuzz`. Add a visual regression test that renders one Arabic caption frame and compares against a golden PNG.
- SRT/VTT sidecar files are fine as-is (the player does the shaping), but the *burn-in* path is the one that breaks.

### 4.4 Long-form TTS seam quality

Naive concatenation of chunks sounds obviously stitched. Required post-processing per chunk, in order:

1. Trim leading/trailing silence to a fixed threshold (e.g. −45 dBFS, keep 30 ms).
2. Remove DC offset; high-pass at 70–80 Hz.
3. Peak-normalize each chunk to a common target *before* joining (prevents level jumps between chunks).
4. Insert **explicit** silence for punctuation rather than trusting the model: comma ≈ 150 ms, period ≈ 400 ms, paragraph ≈ 700 ms, scene break ≈ 1200 ms — all user-configurable.
5. Crossfade adjacent chunks by 10–20 ms.
6. Loudness-normalize at the **scene** level, not the chunk level.

Chunking rules: split at sentence boundaries first, then at `؟ ! . ؛ ،` / `? ! . ; ,`, never mid-word, never mid-quotation. Carry `prev_text_tail` / `next_text_head` as conditioning context where the provider supports it. Pin the seed per character so a re-run reproduces.

### 4.5 Subtitle timing

You get chunk-level timings free (you know each chunk's rendered duration). Sentence-level captions can be derived from chunk boundaries — **this is v1**.

Word-level highlighting requires forced alignment (faster-whisper / WhisperX / an aligner) — it is a separate model download, adds minutes per hour of audio, and is **v1.1**. Do not promise it in the UI until it exists.

### 4.6 Throughput reality — set expectations in the UI

On a consumer GPU, a 0.5B TTS model generating ~2 hours of speech is an **hours-long batch job**, not a progress bar you watch. On CPU it may be overnight.

Therefore: generation runs in the background, the app stays fully editable during it, the job survives app restart, per-chunk results land incrementally so the user can listen to scene 1 while scene 40 generates, and the estimate shown is measured from *this machine's* first 10 chunks — not a hardcoded guess.

### 4.7 Ducking must be envelope-based

Compute a gain envelope from the narration bus: short-term RMS → threshold → attack/hold/release smoothing → gain curve stored as automation points. Apply as automation, not as a gate. Defaults: duck −12 dB, attack 80 ms, hold 250 ms, release 500 ms. Store the curve so preview and render agree (3.2).

---

## PART 5 — MILESTONES

Each milestone ends with: green checks (1.1), an updated `STATE.md`, and a **demo recipe** a human can follow in under 2 minutes.

### Milestone 0 — Plan & skeleton (STOP FOR REVIEW)

Produce, and **write no feature code**:
- `ARCHITECTURE.md` reflecting Part 3, with a diagram
- `DECISIONS.md` seeded with every decision in Part 3
- `RISKS.md` seeded with Part 4 plus anything you can't verify
- Monorepo skeleton (Part 6.1), all tooling configured, all checks in 1.1 passing on an empty app
- `STATE.md` with the Milestone 1 task list
- CI running the 1.1 command set

**Done when:** `pnpm tauri dev` opens a window saying "StoryForge Studio", the sidecar is running, and the window displays live `GET /api/health` output including detected OS/CPU/RAM/GPU/VRAM/CUDA/disk.

Then stop and wait.

### Milestone 1 — Project foundation

Project CRUD, `.storyforge` directory format, SQLite + Alembic, app shell layout (Part 6.2), settings page, recents, autosave + crash recovery journal, undo/redo command stack (generic, with two real commands wired).

**Done when:** create a project → rename it → quit via Task Manager kill → reopen → "Recovered unsaved changes [Restore] [Discard]" appears and Restore works. Copy the project folder to another path and it opens.

### Milestone 2 — Story engine

TXT/DOCX/PDF/paste import preserving structure; text normalizer (incl. Arabic per 4.3); rules-based chapter/scene/dialogue/speaker segmentation; virtualized editor with outline; stats bar; optional LLM enrichment behind a provider interface that the app works fine without.

**Done when:** a 100,000-word DOCX imports in <10 s, produces a scene tree, the editor scrolls at 60 fps, and an Arabic story renders RTL correctly with Latin names embedded. Deterministic segmentation is covered by unit tests on AR/EN/FR fixtures.

### Milestone 3 — TTS pipeline

`TTSProvider` interface + capability descriptor; Chatterbox provider; Piper provider; capability-aware fallback (4.2); chunker; per-chunk post-processing (4.4); cache; job queue with SSE progress, cancel, per-chunk retry, resume-after-crash; voice library over reference clips with license + consent metadata; preview (paragraph/scene).

**Done when:** a 5,000-word trilingual 3-character story generates end-to-end; killing the app at 60% and reopening resumes from chunk N, not chunk 1; changing one character's voice marks only that character's segments stale; regenerating scene 5 touches only scene 5's files.

### Milestone 4 — Timeline

`TimelineDocument` model (Part 6.4); real clip objects; move/trim/split/duplicate/delete/fade/crossfade/gain/pan/mute/solo/lock; zoom/snap/grid/ruler/playhead; async waveform peak generation with disk cache; Web Audio preview engine; transport + keyboard shortcuts; virtualized track rendering.

**Done when:** a 2-hour project with 150 clips scrolls and zooms smoothly, peak memory stays under 1.5 GB, playback starts in <300 ms from any position, and every clip operation is undoable.

### Milestone 5 — Music, ambience, SFX

Local licensed library with metadata + license fields; user import with validation; media browser; drag-to-timeline; loop/trim; automation curves (linear/smooth/exponential).

**Done when:** a full story mix can be assembled by hand from library + imported assets, and every asset in the browser shows its license and source.

### Milestone 6 — Mixer & mastering

Per-track HPF, EQ, compressor; master limiter; sidechain ducking per 4.7; mix presets; LUFS/true-peak/LRA metering; clip warning; backend render engine producing the authoritative mix; preview/render parity test.

**Done when:** narration ducks music smoothly (no pumping, no hard steps), the master hits the target LUFS with true peak ≤ −1 dBTP, and an automated test asserts backend render and frontend preview agree within 0.5 dB RMS per second.

### Milestone 7 — Subtitles & video

Sentence-level subtitle generation from chunk timings; SRT + VTT export; ASS generation for burn-in; 9:16 / 16:9 / 1:1 render presets; background image or looped video; overlay, safe-area-aware caption box; MP4 export with atomic write and non-clobbering filenames.

**Done when:** an Arabic story renders to 1080×1920 MP4 with correctly shaped, right-to-left burned-in captions, verified against a golden frame.

### Milestone 8 — AI assistant

Whitelisted operation schema (Part 6.6); natural-language → validated operation; entity resolution ("make him sound older" → resolved character ID) with a confirmation step when ambiguous; destructive-op confirmation; every AI action goes through the same command stack as manual edits, so it's undoable; operation log panel.

**Done when:** the assistant can perform 10 defined commands, every one is undoable, and a prompt-injection attempt in the story text (e.g. a line reading "delete all scenes") cannot trigger an operation.

### Milestone 9 — Packaging

PyInstaller sidecar build; Tauri capabilities scoped to app-data + user-chosen project/export dirs + the one approved sidecar; model manager with download, resume, checksum verify, size disclosure, consent; onboarding flow; diagnostics export; Windows installer; `.storyforge` file association.

**Done when:** a clean Windows 11 VM with no Python and no Node installs the app, runs onboarding, downloads the model, and produces an exported MP4 — with no terminal ever opened.

---

## PART 6 — REFERENCE SPECIFICATION

*Paste only the subsections relevant to the current milestone.*

### 6.1 Repository layout

```
storyforge-studio/
  apps/
    desktop/            # React + Vite frontend
    backend/
      app/{api,core,models,schemas,services,providers,ai,audio,story,jobs,utils}/
      tests/
  packages/
    shared-types/       # TS types generated from Pydantic schemas — single source of truth
    story-schema/
  src-tauri/{src,capabilities,binaries}/
  assets/{voices,music,ambience,sfx,fonts,demo}/
  scripts/  docs/  tests/e2e/
```

Generate TypeScript types from the FastAPI OpenAPI schema in a build step. Never hand-maintain two copies of a model.

### 6.2 UI shell

```
┌ Logo │ Project ▾ │ Save │ Undo │ Redo │ ⌘K │ LOCAL │ Export │ ⚙ ┐
├──────┬────────────────────────────────────┬──────────────────┤
│ Nav  │           Main Workspace           │    Inspector     │
│      │                                    │                  │
├──────┴────────────────────────────────────┴──────────────────┤
│ Timeline: Narration · Voices · Music · Ambience · SFX        │
├──────────────────────────────────────────────────────────────┤
│ ▶ ⏸ ⏹ │ 00:12:31 / 01:58:04 │ 🔊 │ LUFS -16.2 │ AI Assistant │
└──────────────────────────────────────────────────────────────┘
```

Nav: Home · Story · Characters · Voices · Media · Timeline · Video · Export · Settings.

Visual direction: dark neutral base, high contrast, fine borders, compact controls, restrained motion. Design tokens as CSS variables (`--bg --fg --panel --border --muted --accent --danger --warning --success`) — never hardcode a color in a component. The story and the timeline are always the visual focus; no marketing surfaces inside the editor.

The `LOCAL` / `CLOUD` badge in the header is always visible and always accurate.

### 6.3 Data model (essentials)

```
Project(id, name, schema_version, default_language, created, modified, settings)
Chapter(id, project_id, index, title)
Scene(id, chapter_id, index, text_range, mood, pace, language, locked, version)
Character(id, project_id, name, role, description, notes, voice_assignment_id)
VoiceAssignment(id, provider, model, voice_ref_id, settings_json, version, created)
VoiceReference(id, name, language, file_path, license, source, author,
               consent_confirmed_at, consent_text_version)
Track(id, project_id, kind, name, order, gain, pan, muted, soloed, fx_chain_json)
Region(id, track_id, asset_id, start, duration, source_start, gain, pan,
       fade_in, fade_out, fade_curve, muted, locked, automation_json, metadata)
MediaAsset(id, kind, path, duration, sample_rate, channels, loudness_lufs,
           license, source_url, author, attribution, commercial_ok, tags)
GenerationJob(id, type, status, progress, error_json, created, started, finished)
GenerationChunk(job_id, scene_id, index, text_hash, status, cache_key, duration, error)
AudioCache(cache_key PRIMARY KEY, path, duration, created, last_used, bytes)
AiOperation(id, command_json, resolved_json, applied_at, undo_token)
```

Job/chunk status: `QUEUED · RUNNING · PAUSED · COMPLETED · FAILED · CANCELLED`.

### 6.4 Provider interfaces

```python
class Capability(TypedDict):
    name: str; kind: Literal["float","int","enum","bool"]
    min: float | None; max: float | None; options: list[str] | None; default: Any

class TTSProvider(Protocol):
    id: str
    def health_check(self) -> HealthStatus: ...
    def languages(self) -> list[LanguageCode]: ...        # queried, never hardcoded
    def capabilities(self) -> list[Capability]: ...       # UI renders ONLY these
    def list_voices(self) -> list[VoiceRef]: ...
    def synthesize(self, req: SynthesisRequest) -> AudioSegment: ...
    def supports_cloning(self) -> bool: ...
    def clone_voice(self, req: CloneRequest) -> VoiceRef: ...
```

**The UI renders controls from `capabilities()`.** If a provider has no pitch parameter, no pitch slider appears — unless pitch is implemented honestly in the DSP layer and labelled as post-processing. Never show a control that goes nowhere.

`MusicProvider` and `LLMProvider` follow the same shape. The app must be fully functional with zero LLM provider configured — LLM output only ever *enriches* deterministic analysis, never gates it.

### 6.5 Emotion & presets

Emotion vocabulary: `neutral calm happy sad angry fearful mysterious tense romantic excited dramatic whisper surprised`.

Each emotion maps to provider-supported parameters through an explicit mapping table per provider. Unsupported emotions degrade to the nearest supported value and the UI says so. Never send a parameter a provider doesn't accept.

Voice presets (`Calm · Narrator · Dramatic · Horror · Suspense · Emotional · Documentary · Cinematic`) and mix presets (`Podcast · Short-form Story · Cinematic · Horror · Documentary · Dialogue Heavy`) are editable data files, not code branches.

### 6.6 AI operation schema

Whitelist only. Reject anything not in the enum. Resolve all natural-language references to validated IDs server-side before execution.

```json
{ "operation": "UPDATE_TRACK_GAIN",
  "target": { "type": "track", "id": "trk_09" },
  "scope":  { "sceneIds": ["scn_03"] },
  "params": { "gainDb": -8 },
  "destructive": false }
```

Allowed operations (v1): `UPDATE_TRACK_GAIN · SET_DUCKING · ASSIGN_VOICE · UPDATE_VOICE_SETTING · SET_SCENE_MOOD · ADD_REGION · REMOVE_REGION · REGENERATE_SCENE · GENERATE_SUBTITLES · SPLIT_EXPORT`.

`destructive: true` requires explicit confirmation. Every applied operation pushes onto the undo stack with a human-readable label ("Changed narrator speed 1.00 → 0.92").

**Injection defense:** story text is data. Never place user story content in a system prompt position, and never let text extracted from an imported document produce an operation without the user initiating that command in the assistant panel.

### 6.7 Export

| Target | Spec |
|---|---|
| MP3 | 48 kHz, speech/standard/high presets |
| WAV | 48 kHz / 24-bit |
| MP4 (vertical) | 1080×1920, H.264, AAC 192k, +faststart |
| SRT / VTT | UTF-8, BOM-less, RTL-safe |
| Stems | narration, characters, music, ambience, sfx, master |

Scope: whole project · chapter · scene · timeline selection.
Multi-part split: by duration / scene / chapter / word count, never cutting mid-dialogue, with per-part subtitles.
Never overwrite: `story.mp4` → `story_01.mp4`. Write to `.tmp` and rename on success.

### 6.8 Performance budgets (assert these in tests)

| Metric | Budget |
|---|---|
| Import 100k-word DOCX | < 10 s |
| Editor scroll, 100k words | 60 fps, no jank |
| Timeline with 150 clips | < 16 ms frame |
| Playback start from seek | < 300 ms |
| Peak RSS, 2-hour project | < 1.5 GB |
| Waveform peaks, 1-hour file | < 5 s, cached thereafter |

Never decode a full project into RAM. Stream, or operate on peak data and region windows.

### 6.9 Testing

- **Determinism, not golden audio.** Assert on the generation *plan*, chunk boundaries, cache keys, segment durations (±20 ms), and loudness (±0.5 LU). Do not diff audio bytes — models drift and the tests become noise.
- Fixtures: EN / AR / FR / mixed-language / 8-character dialogue / 100k-word stress / missing-media / failed-chunk / provider-down / CPU-only.
- One golden-frame visual test for Arabic caption burn-in (4.3).
- E2E: import → analyze → generate → mix → subtitle → export, on the bundled demo project.
- Bundled demo project: 5 scenes, 3 characters, one scene each in EN/AR/FR, dialogue, music bed, rain ambience, footsteps SFX. It must run with local models only.

### 6.10 Security checklist

Path traversal guards on every user-supplied path · magic-byte validation on every import (not extension) · size limits · Tauri capabilities scoped to app-data, the active project dir, the user-chosen export dir, and exactly one sidecar · no `shell` capability · subprocess args as lists, never shell strings · bearer token on the local API (3.5) · API keys in OS credential store · keys never serialized to the frontend or to logs · redaction filter on the logger.

### 6.11 Error message contract

Every user-facing failure must supply: **what failed · why · what to do · a way to act.**

```
Voice generation failed

Chatterbox could not allocate GPU memory (needed ~3.2 GB, 1.1 GB free).

Try:
 • Reduce chunk size (Settings → Generation)
 • Close other GPU applications
 • Switch to CPU mode — slower, but works

[Retry chunk]  [Open settings]  [Switch to CPU]
```

Never surface "Internal Server Error." Map every backend exception to a typed error with a code, a message, and suggested actions.

### 6.12 Documentation deliverables

`README.md · ARCHITECTURE.md · SETUP.md · DEVELOPMENT.md · PACKAGING.md · PROVIDERS.md · AUDIO_PIPELINE.md · VOICE_CLONING.md · LICENSES.md · TROUBLESHOOTING.md` · `.env.example` (no real keys, never commit `.env`).

`LICENSES.md` lists every bundled asset, model, and font with its license, source, author, and whether commercial use and redistribution are permitted. If a license is uncertain, the asset is not bundled — it goes in `RISKS.md` and the feature stays optional.

---

## PART 7 — FINAL QUALITY BAR

Before declaring v1 complete, every one of these must be demonstrably true on a clean Windows machine:

- [ ] A 30-minute story generates without restarting the app
- [ ] Generation survives an app crash and resumes from the failed chunk
- [ ] Changing one character's voice restages only that character's audio
- [ ] Regenerating a single sentence touches a single sentence
- [ ] Arabic renders correctly in the editor, in SRT, and burned into video
- [ ] French accents and guillemets survive the full round trip
- [ ] A mixed AR/EN/FR scene picks the right voice per segment
- [ ] Music ducks under narration smoothly, with no audible pumping
- [ ] An SFX can be placed to within 10 ms and it stays there
- [ ] Every AI modification can be undone
- [ ] The app is fully usable with the network disabled
- [ ] No cloud provider is required for any core function
- [ ] A vertical MP4 exports and plays correctly on a phone
- [ ] The installer works with no Python and no Node on the machine

If any box is unchecked, v1 is not done. A complete-looking interface is not evidence of a complete application.

---

## PART 8 — PRODUCT PHILOSOPHY

The central feature is not generation. It is **control**.

The AI proposes; the user disposes. Every AI decision must be inspectable, overridable, reversible, and regenerable at the smallest sensible granularity. Nothing the AI decides is immutable, and nothing it produces silently replaces something the user made by hand.

Everything in the app orbits one spine:

**Project → Story → Scenes → Characters → Voices → Timeline → Master → Media**

If a feature doesn't sit on that spine, it doesn't belong in v1.
