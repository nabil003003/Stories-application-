# StoryForge Studio — Licenses & Model Disclosures

This document lists licenses, authors, sources, and usage terms for all third-party models, libraries, audio assets, and fonts bundled with StoryForge Studio.

---

## 1. AI Models

| Model | Provider / Author | Code License | Weights License | Commercial Use | Notes |
|---|---|---|---|---|---|
| **Chatterbox Multilingual** | Resemble AI | MIT | Check repository | Yes (with disclosure) | Audio carries Resemble AI's **PerTh neural watermark**. This watermark is preserved intact. |
| **Piper TTS** | Rhasspy / Michael Hansen | MIT | MIT / Open Data | Yes | ONNX runtime inference. Arabic voice `ar_JO-kareem`. |

---

## 2. Core Dependencies & Runtimes

| Component | License | Purpose |
|---|---|---|
| **Tauri 2** | MIT / Apache 2.0 | Native desktop application shell and sidecar supervisor |
| **React 18** | MIT | UI rendering engine |
| **FastAPI** | MIT | High-performance backend sidecar |
| **FFmpeg** | LGPL 2.1+ / GPL (with libx264) | Authoritative audio/video transcoding & libass burn-in |
| **SQLite** | Public Domain | Structured project metadata and job queue persistence |
| **uv** | Apache 2.0 / MIT | Hermetic Python runtime and dependency isolation |

---

## 3. Fonts

| Font Family | License | Coverage |
|---|---|---|
| **Noto Sans / Naskh Arabic** | SIL Open Font License (OFL) | Arabic, Latin, French diacritics for video subtitle burn-in |
| **Inter / System Sans** | SIL OFL | Application UI |

---

## 4. Audio Asset Library Policy
Every bundled reference audio clip, music bed, ambience track, and SFX item must include documented `license`, `source_url`, `author`, and `commercial_ok` fields in its manifest. No assets with ambiguous or unverified provenance are permitted in StoryForge Studio.
