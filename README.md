# StoryForge Studio

**StoryForge Studio** is a professional, local-first desktop application for Windows that converts long-form written text (up to 100k+ words, multi-character, multilingual in Arabic, English, and French) into production-grade narrated audio and vertical (9:16) video with synchronized subtitles.

---

## The Spine
```
Project → Story → Scenes → Characters → Voices → Timeline → Master → Media
```

---

## Key Features
- **Local-First & Offline:** Zero cloud dependency for core workflows. No subscription accounts required.
- **Dual Audio Engines:** Fast, interactive Web Audio preview in React + authoritative 48kHz float32 master rendering via Python/FFmpeg.
- **Envelope-Based Sidechain Ducking:** Precomputed RMS narration envelope replayed identically in frontend preview and backend master render.
- **Arabic First-Class Support:** Text diacritization (tashkīl), bidi UI, and HarfBuzz/FriBidi/libass subtitle video burn-in.
- **Multi-character TTS:** Chatterbox Multilingual (zero-shot cloning from licensed reference clips) with Piper ONNX fallback.
- **Crash Recovery:** SQLite project database with write-ahead journal and resumable chunk queues.

---

## Development Prerequisites
- **Node.js**: v20+
- **pnpm**: v10+ (`npm i -g pnpm`)
- **Python**: 3.11 managed via `uv` (`pip install uv`)
- **Rust & Cargo**: Latest stable (`rustup`)
- **Visual Studio C++ Build Tools**

---

## Quick Start (Dev Mode)
```bash
# 1. Install dependencies
pnpm install

# 2. Setup backend sidecar
cd apps/backend
uv sync

# 3. Launch application
cd ../..
pnpm tauri dev
```

---

## Operational Contract & Quality Invariant
Every commit must satisfy:
```bash
pnpm install && pnpm tauri dev          # app launches, no console errors
pnpm -r typecheck && pnpm -r lint       # clean
uv run pytest                           # green
uv run ruff check . && uv run mypy app  # clean
```
