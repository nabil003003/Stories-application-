# StoryForge Studio — Current State (`STATE.md`)

**Current Milestone:** Milestone 0 — Plan & Skeleton  
**Status:** Verification Ready (Golden Invariant Passed)  
**Last Updated:** 2026-09-18

---

## 1. What Works
- [x] Agent contract specification established (`AGENT.md`, `storyforge-agent-prompt.md`)
- [x] High-level architectural specification defined (`ARCHITECTURE.md`)
- [x] Architecture Decision Records pre-seeded with ADR-001 through ADR-010 (`DECISIONS.md`)
- [x] Technical risk register pre-seeded (`RISKS.md`)
- [x] Root licenses and model watermark disclosures documented (`LICENSES.md`)
- [x] Local toolchains verified & operational:
  - Node.js `v20.20.0`
  - pnpm `v12.4.2`
  - Rust & Cargo `v1.98.1`
  - Python `v3.11.16` isolated hermetically via `uv` `v0.12.16`
- [x] Monorepo workspace skeleton operational:
  - `apps/desktop` (React 18 + Vite + Tailwind CSS + Lucide + Zustand)
  - `apps/backend` (FastAPI + Python 3.11 sidecar with full module architecture)
  - `packages/shared-types` (Strict TypeScript interfaces synchronized with backend Pydantic models)
  - `packages/story-schema` (Core story & project schema types)
  - `src-tauri` (Tauri 2 Rust shell with sidecar lifecycle supervisor & token IPC bridge)
- [x] Backend sidecar security & diagnostics:
  - Dynamic localhost port binding
  - Cryptographic 32-byte Bearer token authentication middleware
  - `GET /api/health` endpoint returning live host telemetry: OS, CPU model & cores, RAM total/available, GPU/VRAM/CUDA, and Disk space
  - 100% passing unit tests (`test_health.py`)
- [x] Complete Golden Invariant Passing:
  - `pnpm -r typecheck` -> Clean
  - `pnpm -r lint` -> Clean
  - `uv run pytest` -> Green (3 passed)
  - `uv run ruff check .` -> Clean (All checks passed)
  - `uv run mypy app` -> Clean (0 errors across 18 source files)
  - `pnpm --filter desktop build` -> Clean (Built in 18.1s)
  - `cargo check` in `src-tauri` -> Clean (Built in 1.17s)

---

## 2. What's Stubbed
- [ ] Milestone 1: Project CRUD & `.storyforge` directory bundle
- [ ] Milestone 1: SQLite with Alembic migrations
- [ ] Milestone 1: Undo/redo command stack with journal recovery

---

## 3. What's Broken / Blocked
- None. All Milestone 0 requirements satisfied.

---

## 4. Next 3 Tasks (Milestone 1 — Project Foundation)
1. Implement `.storyforge` directory bundle layout and project manifest schema (`project.json`).
2. Initialize SQLite project database with Alembic migration pipeline.
3. Build the Undo/Redo command stack and crash recovery journal.

---

## 5. Verification Recipe (Milestone 0)
1. Ensure toolchain in PATH (Node, pnpm, uv, cargo).
2. Run backend test suite:
   ```powershell
   cd apps/backend; uv run pytest; uv run ruff check .; uv run mypy app
   ```
3. Run workspace typecheck:
   ```powershell
   pnpm -r typecheck
   ```
4. Launch the application:
   ```powershell
   pnpm tauri dev
   ```
5. Observe desktop window titled **StoryForge Studio** displaying the high-contrast DAW UI shell, header with `LOCAL` badge, and live hardware diagnostics matching the host machine.
