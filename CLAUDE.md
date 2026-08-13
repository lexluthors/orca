# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What Orca is

Orca is an Electron desktop app (plus an `orca` CLI and a React Native mobile companion) that orchestrates third-party CLI coding agents — Claude Code, Codex, OpenCode, and any other terminal agent — each running in its own git worktree, with terminal splits, an embedded browser, GitHub/Linear integration, and SSH remote workspaces. Welcome to v1.4.x; the app ships daily.

## Commands

Node 24 and pnpm 10.24 (`packageManager` pins both) are required. `mobile/` is its own pnpm workspace — see below.

### Build & run

| Task | Command |
|---|---|
| Install | `pnpm install` |
| Dev (desktop app) | `pnpm dev` — ensures the native runtime, then runs electron-vite HMR |
| Renderer in browser only | `pnpm dev:web` |
| Full build | `pnpm build` = typecheck → `build:desktop` (relay, cli, electron-vite, skills verify, web build) → `build:native` (per-platform helpers in `native/`) |
| Per-platform packaged builds | `pnpm build:linux` / `build:mac` / `build:win` / `build:unpack` (`electron-builder`) |
| Install dev `orca` CLI | `pnpm build:cli` — compiles `src/cli` to `out/` and installs a dev binary that connects to the dev app |

### Test

| Task | Command |
|---|---|
| All unit/integration tests | `pnpm test` (`vitest run --config config/vitest.config.ts`) |
| Single test / file | `pnpm exec vitest run --config config/vitest.config.ts <path>.test.ts` |
| Filter by test name | append `-t "name"` |
| E2E (Playwright, headless Electron) | `pnpm test:e2e` — globalSetup builds the app and seeds a git repo; `SKIP_BUILD=1` skips the rebuild for iteration |
| Single E2E spec | `npx playwright test tests/e2e/foo.spec.ts --config tests/playwright.config.ts --project electron-headless` |
| E2E visible-window | `pnpm test:e2e:headful` (specs tagged `@headful`) |

Unit tests are co-located with sources (`*.test.ts`/`*.test.tsx`); integration tests use `*.integration.test.ts`; Playwright specs live in `tests/e2e/`; benchmarks and repro scripts in `tests/tools/`. `config/reliability-gates.jsonc` records the exact vitest invocation for each guarded behavior.

### Typecheck & lint

| Task | Command |
|---|---|
| Typecheck (all three targets) | `pnpm typecheck` (or `tc:node` / `tc:cli` / `tc:web`) |
| Lint | `pnpm lint` — oxlint, type-aware code-quality audits, reliability gates, max-lines ratchet, skill-guide/manifest sync, and localization catalog/extraction/coverage checks |

Pre-commit (husky + lint-staged) runs oxlint, react-doctor, and oxfmt on staged files. Before a PR, run the CI gate set: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`.

New UI copy goes through the i18n catalogs — run `pnpm sync:localization-catalog` after adding strings; `pnpm lint` verifies extraction and coverage.

## Architecture

The repo is a monorepo-style single package: `src/` holds the Electron app, CLI, and remote relay; `mobile/` and `native/` are separate trees.

### The five `src/` areas

- **`src/main`** — Electron main process: app lifecycle (`index.ts`), typed IPC handlers (`ipc/`, one module per domain), PTY providers (local, daemon, SSH), agent launching, agent hooks, browser, SSH, daemon, persistence. Services are wired by hand in `index.ts` — follow the existing registration pattern when adding a domain.
- **`src/preload`** — context bridge; `api-types.ts` is the typed API surface shared with the renderer and E2E tests.
- **`src/renderer`** — React 19 UI (Tailwind v4 + shadcn primitives in `components/ui/`, zustand stores in `store/` with a selectors discipline). Re-render and layout performance is a hard requirement — stores expose narrow selectors, and fanout is benchmarked (`check:zustand-selector-fanout`).
- **`src/shared`** — pure logic shared across main, renderer, preload, CLI, and the remote relay (agent detection, hooks protocol, wire frames, contract types). It must stay importable everywhere the app runs — no Electron or node-only APIs.
- **`src/cli`** — the `orca` CLI (compiled by `tsc` to `out/`). Routes to the app or the daemon via `src/cli/runtime/...` over a framed JSON-RPC protocol.

### The relay and the remote wire

**`src/relay`** is a standalone daemon deployed to remote hosts (SSH worktrees): it speaks the framed JSON-RPC protocol (`relay/protocol.ts`) over stdin/stdout of an SSH exec channel, and serves PTY, git, fs, workspace, and AI-vault handlers on the remote side. It survives client disconnects by parking PTYs on a Unix socket and reconnecting later. The protocol/contract modules in `src/shared` (e.g. `protocol-version.ts`, `runtime-rpc-envelope.ts`) are what the desktop app, CLI, relay, and old clients exchange — before changing anything a paired client and host sends, follow `docs/reference/remote-wire-compatibility.md` (new optional fields are safe; new opcodes need capability negotiation; hosts publish to old clients too).

### Agent orchestration

Agents are third-party CLI runtimes (Claude Code, Codex, OpenCode, …) launched in PTYs. `src/shared/agent-kind.ts` + `src/shared/agent-*` do detection (how each agent behaves in a terminal); `src/main/agent-hooks/` installs per-agent hook scripts that stream session lifecycle events (status, questions, messages) into the app so the renderer can show agent state without scraping the terminal. Orca's own `skills/` (agent-visible SKILL.md bundles, version-matched, served by the `orca` binary; mirrored in `skill-guides/` and `skill-stubs/`) let the agents drive Orca back.

### Native and mobile

- **`native/`** — per-platform helper binaries (computer-use, macOS notification status, Windows CLI launcher) built by `build:native`. Linux binaries must stay on the glibc 2.31 floor (see `docs/reference/linux-glibc-compatibility.md`).
- **`mobile/`** — the Expo/React Native companion app, an independent pnpm workspace with its own lockfile. The root `pnpm-workspace.yaml` deliberately declares `packages: []` — never add `mobile/**` to the root workspace (patched deps break). Mobile commands run from inside `mobile/` (`pnpm start` / `pnpm test` / `pnpm typecheck`); root scripts do not cover it.

### Config and CI tooling

`config/` holds all the build/test scaffolding: per-target tsconfigs (`tsconfig.node/cli/web.json`), vitest and electron-builder configs, oxlint configs, native-deps rebuild, and a large `config/scripts/` of workflow/verify scripts (many are wired into `package.json`). `docs/reference/` is the authoritative set of compatibility contracts (git 2.25 baseline, remote wire, glibc floor, Windows setup shell).