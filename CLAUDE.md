# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
pnpm dev                    # Start Electron dev app (electron-vite hot reload)
pnpm dev-stable-name        # Dev with stable app name (Dock shows "Orca" not "Orca: feat/xxx")
pnpm dev:web                # Web-only dev server (Vite on 127.0.0.1, no Electron)

# Build
pnpm build                  # Full build: desktop + native
pnpm build:desktop          # Desktop only: typecheck + relay + CLI + electron-vite + web
pnpm build:mac              # macOS distributable (DMG + zip)
pnpm build:linux            # Linux distributable (AppImage + deb)
pnpm build:win              # Windows distributable (NSIS installer)
pnpm build:cli              # CLI binary only (tsc → out/cli/)
pnpm build:relay            # Relay bundle only (deployed to remote hosts via SSH)

# Type Checking (uses tsgo, the TypeScript native preview — much faster than tsc)
pnpm tc                     # All three: node + cli + web
pnpm tc:node                # Main + preload + shared + relay
pnpm tc:cli                 # CLI + shared + selected main files
pnpm tc:web                 # Renderer + preload types + shared

# Linting & Formatting
pnpm lint                   # oxlint + switch-exhaustiveness + styled-scrollbars + reliability-gates + localization
pnpm format                 # oxfmt --write .

# Testing
pnpm test                   # Unit tests (vitest, node env, 30s timeout)
pnpm test -- <file>         # Single test file: pnpm test -- src/main/worktree-create-base.test.ts
pnpm test -- -t <pattern>   # Tests matching pattern: pnpm test -- -t "worktree create"
pnpm test:e2e               # E2E (Playwright + Electron headless, builds app first)
SKIP_BUILD=1 pnpm test:e2e  # E2E without rebuild (faster iteration)
pnpm test:e2e:headful       # E2E with visible window (pointer-capture tests)

# Benchmarks
pnpm bench:startup          # App startup time
pnpm bench:daemon-coldstart # Daemon cold start
pnpm bench:idle-cpu         # Idle CPU usage
```

## Architecture

Orca is an Electron desktop app — "the AI Orchestrator" — that runs coding agents (Claude Code, Codex, OpenCode, 20+ others) in parallel git worktrees, with embedded terminal, browser, editor, and integrations for GitHub/GitLab/Linear/Jira. Targets macOS, Linux, Windows; supports SSH remote worktrees.

### Process Model

```
┌─────────────────────────────────────────────────────────┐
│  Electron Main (src/main/)                              │
│  ┌───────────┐  ┌──────────┐  ┌───────────────────────┐ │
│  │ Daemon    │  │ Relay    │  │ Runtime RPC Server    │ │
│  │ (PTY mgr) │  │ (remote) │  │ (WebSocket/Unix sock) │ │
│  └─────┬─────┘  └────┬─────┘  └──────────┬────────────┘ │
│        │              │                   │              │
│  ┌─────┴──────────────┴───────────────────┴──────────┐  │
│  │  IPC Handlers (src/main/ipc/)                     │  │
│  │  registerCoreHandlers() wires ~50 handler groups  │  │
│  └───────────────────────┬───────────────────────────┘  │
└──────────────────────────┼──────────────────────────────┘
                           │ contextBridge (src/preload/)
┌──────────────────────────┼──────────────────────────────┐
│  Electron Renderer (src/renderer/)                       │
│  React 19 + Zustand + Tailwind 4 + shadcn/ui             │
│  @renderer / @ alias → src/renderer/src                  │
└──────────────────────────────────────────────────────────┘

External clients (same JSON-RPC protocol):
  • CLI binary (src/cli/) — `orca worktree create`, `orca terminal send`, etc.
  • Mobile app (mobile/) — React Native / Expo, WebSocket port 6768
  • Web client (src/renderer/src/web/) — pairs via QR code + E2EE
  • SSH Relay (src/relay/) — deployed to remote hosts, framed JSON-RPC over SSH stdio
```

### Key Processes

- **Daemon** (`src/main/daemon/`) — Out-of-process PTY manager. Owns all terminal sessions, scrollback, headless terminals for agent detection. Main talks via `daemon-client.ts`. Socket at `<userData>/daemon/daemon-v18.sock`.
- **Relay** (`src/relay/`) — Lightweight Node script deployed to SSH hosts. Handles git, fs, PTY, port scan, agent-exec, workspace sessions remotely. Built via `pnpm build:relay`, installed via `src/main/ssh/ssh-relay-deploy.ts`. Zero Electron deps.
- **Runtime RPC** (`src/main/runtime/rpc/`) — JSON-RPC server exposing ~50 method groups. Transport: WebSocket (mobile/web) or Unix socket (CLI). Methods mirror IPC handlers but are cross-process.

### Code Layers

| Layer | Path | What lives here |
|-------|------|----------------|
| **main** | `src/main/` | Electron main process. Services, IPC handlers, agent integrations, SSH, browser, daemon spawner, updater, telemetry |
| **preload** | `src/preload/` | contextBridge API. `api-types.ts` is the single contract — renderer and preload stay in lockstep via this file |
| **renderer** | `src/renderer/src/` | React UI. Components, Zustand store (slices), hooks, i18n, web pairing |
| **relay** | `src/relay/` | Standalone remote daemon. Must have zero Electron deps. Shares `src/shared/` types |
| **cli** | `src/cli/` | Standalone CLI binary. Specs in `specs/`, handlers in `handlers/`, runtime client in `runtime/` |
| **shared** | `src/shared/` | Types, constants, pure logic shared across all layers. ~180 files |
| **types** | `src/types/` | Ambient `.d.ts` shims only. Owned types go in `.ts` files — `skipLibCheck: true` silences errors in `.d.ts` |

### Feature Domains

#### Workspace & Repo Management
Core data model: **Repo** → **Project** → **Worktree**. A repo has projects; each project spawns worktrees (git worktree).

- Main: `ipc/repos.ts`, `worktrees.ts`, `workspace-space.ts`, `workspace-cleanup.ts`, `workspace-ports.ts`
- Renderer: `slices/repos.ts`, `worktrees.ts`, `workspace-space.ts`
- UI: `components/sidebar/` (repo/worktree tree), `components/worktree-creation/`
- Lifecycle: `worktree-create-base.ts` → `worktree-root-preparation.ts` → `worktree-removal-safety.ts`

#### Terminal & PTY
Ghostty-class terminals with WebGL rendering via xterm.js 6.

- **Daemon** (`src/main/daemon/`) owns all PTYs. `daemon-pty-provider.ts` / `daemon-pty-router.ts` route I/O.
- **Providers** (`src/main/providers/`) — `local-pty-provider.ts` for local, `ssh-pty-provider.ts` for remote.
- **PTY config** (`src/main/pty/`) — Shell startup env, terminal color schemes, WSL env, node-pty native runtime relocation.
- **Ghostty themes** (`src/main/ghostty/`) — Import Ghostty theme configs.
- Renderer: `components/terminal/`, `terminal-pane/`, `floating-terminal/`; `slices/terminals.ts`

#### Agent Integration (20+ agents)
Each agent has `src/main/<agent>/hook-service.ts` managing shell hooks for status detection.

| Agent | Dir | Notes |
|-------|-----|-------|
| Claude Code | `claude/` | Usage: `claude-usage/`. Accounts: `claude-accounts/` |
| Codex | `codex/` | Config mirror, session bridge. Usage: `codex-usage/`. Accounts: `codex-accounts/` |
| OpenCode | `opencode/` | Usage: `opencode-usage/` |
| Copilot | `copilot/` | Hook service |
| Cursor | `cursor/` | Hook service |
| Amp | `amp/` | Hook service |
| Grok | `grok/` | Hook service |
| Gemini | `gemini/` | Hook service |
| Devin | `devin/` | Hook service + settings |
| Hermes | `hermes/` | Hook service |
| Droid | `droid/` | Hook service |
| Kimi | `kimi/` | Hook service + TOML config |
| MiMo | `mimo/` | Hook service |
| MiniMax | `minimax/` | Cookie store |
| Pi | `pi/` | Agent status extension, prefill, titlebar services |
| OpenClaude | `openclaude/` | Hook service |
| Antigravity | `antigravity/` | Hook service |
| Command Code | `command-code/` | Managed script + hook service |

**Agent detection pipeline:** PTY output → OSC title extraction (`shared/agent-detection.ts`) → status parsing (`shared/agent-status-osc.ts`) → `OrcaRuntimeService` broadcasts to renderer.

**Agent hooks:** Shell hooks (`src/main/agent-hooks/`) injected into agent processes to capture lifecycle events.

#### SSH & Remote
Full remote development: agents, terminals, file editing, git all work over SSH.

- `src/main/ssh/` — Connection manager, relay deploy, port forwarding, SFTP, config parsing, remote CLI
- `src/main/providers/ssh-*.ts` — SSH PTY and filesystem providers
- `src/relay/` — Remote daemon. Handlers: `pty-handler.ts`, `fs-handler.ts`, `git-handler.ts`, `agent-exec-handler.ts`, `port-scan-handler.ts`, `workspace-session-handler.ts`
- Relay protocol: Binary-framed JSON-RPC over SSH stdio (`src/relay/protocol.ts`)
- Renderer: `slices/ssh.ts`

#### Embedded Browser
Full Chromium browser with Design Mode (click element → send HTML/CSS/screenshot to agent).

- `src/main/browser/` — Browser manager, CDP bridge, screencast, cookie import, anti-detection, session registry
- `src/main/computer/` — Desktop automation provider (screenshot, click, keyboard). Native binaries in `native/`
- Renderer: `components/browser-pane/`; `slices/browser.ts`

#### Source Control & Code Review
Multi-provider: GitHub, GitLab, Gitea, Bitbucket, Azure DevOps.

- `src/main/source-control/` — Forge provider abstraction, hosted review (PR/MR creation)
- `src/main/github/` — GitHub API client, PRs, issues, checks, project views
- `src/main/gitlab/` — GitLab API client, MRs, issues, todos
- `src/main/gitea/` + `bitbucket/` + `azure-devops/` — PR creation for each provider
- `src/main/linear/` — Linear issues, projects, teams
- `src/main/jira/` — Jira issues, ADF↔Markdown
- `src/main/git/` — Git operations: branch, checkout, commit, fetch, fork sync, worktree ops
- Renderer: `components/source-control/`, `diff-comments/`, `github/`, `gitlab/`; slices: `github.ts`, `linear.ts`, `jira.ts`, `hosted-review.ts`

#### Automations & Orchestration
Run agents on schedules, orchestrate multi-agent workflows.

- `src/main/automations/` — Automation service, dispatch, precheck, headless workspace create
- `src/main/runtime/orchestration/` — Coordinator, DB, groups, lifecycle reconciliation, preamble injection
- Renderer: `components/automations/`, `components/dashboard/`
- Skills: `skills/orchestration/`

#### Computer Use
Let agents operate desktop apps via screenshots + input.

- `src/main/computer/` — Provider lifecycle, action validation, sidecar client, desktop script bridge
- `native/computer-use-macos/` — Swift · `native/computer-use-linux/` — Python · `native/computer-use-windows/` — PowerShell
- Build: `pnpm build:computer-macos`, `pnpm build:native`

#### Mobile Companion
React Native (Expo) app in `mobile/`. Monitor/steer agents from phone.

- Pairs via QR code → WebSocket RPC on port 6768
- `src/main/ipc/mobile.ts`, `src/main/runtime/mobile-pairing-files.ts`
- `mobile/src/` — session, terminal, worktree, browser, source-control, dictation, notifications, transport

#### Android/iOS Emulator
- `src/main/emulator/` — Emulator bridge, gesture sender, session registry
- `src/main/emulator/android/` — ADB, AVD management, scrcpy streaming, logcat, UIAutomator
- `src/main/emulator/backends/` — Android + iOS backend abstraction
- Renderer: `components/emulator-pane/`

#### AI Vault & Native Chat
Scan and resume agent sessions across Codex, Claude, OpenCode, Devin, Grok, Kimi, Droid, etc.

- `src/main/ai-vault/` — Session scanner with per-agent parsers
- `src/main/native-chat/` — Transcript reader, file resolver, watch
- Renderer: `components/native-chat/`

#### CLI (`orca` command)
Standalone binary that talks to the desktop app via WebSocket/Unix socket.

- `src/cli/specs/` — Command definitions · `src/cli/handlers/` — Implementations · `src/cli/runtime/` — WebSocket client
- Subcommands: `worktree`, `terminal`, `browser`, `computer`, `orchestration`, `repo`, `project`, `linear`, `emulator`, `diagnostics`, `vm`, `file`, `agent-hooks`, `automations`, `environment`, `core`

#### Other Features
- **Speech/Dictation** — `src/main/speech/` (sherpa-onnx STT + OpenAI Whisper), `components/dictation/`
- **Text Generation** — `src/main/text-generation/` (commit messages, PR descriptions)
- **Skills** — `src/main/skills/` (discovery), `skills/` (SKILL.md definitions for agent guidance)
- **Keybindings** — `src/main/keybindings/`, `components/settings/`
- **Updater** — `src/main/updater*.ts` (electron-updater, stable + rc channels)
- **Telemetry** — `src/main/telemetry/` (PostHog, gated by compile-time `ORCA_BUILD_IDENTITY` constant; disabled in dev)
- **Observability** — `src/main/observability/` (OpenTelemetry tracing, diagnostic bundles)
- **Crash Reporting** — `src/main/crash-reporting/`
- **Usage Tracking** — `claude-usage/`, `codex-usage/`, `opencode-usage/`, `rate-limits/`
- **Star Nag** — `src/main/star-nag/` (prompt users to star the repo)
- **i18n** — `src/main/i18n/` + `src/renderer/src/i18n/` (i18next, locales in `renderer/src/i18n/locales/`)
- **Persistence** — `src/main/persistence.ts` (JSON store in userData), `src/main/sqlite/` (SQLite sync DB)
- **Warp Themes** — `src/main/warp-themes/`
- **WSL** — `src/main/wsl*.ts` (Windows Subsystem for Linux)
- **Ephemeral VMs** — `src/main/ephemeral-vm-*.ts` (recipe runner, runtime service)

### Data Flow Patterns

**IPC (renderer ↔ main):**
```
Renderer → window.orcaApi.<method>() → preload contextBridge → ipcMain.handle() in src/main/ipc/
```
Wired in `registerCoreHandlers()` → ~50 `register*Handlers()` functions.

**Runtime RPC (CLI/mobile/web ↔ main):**
```
Client → WebSocket or Unix socket → OrcaRuntimeRpcServer → dispatcher → methods/*
```
Methods in `src/main/runtime/rpc/methods/` (~45 files). Transport: `ws-transport.ts`, `unix-socket-transport.ts`.

**Relay (main ↔ remote host):**
```
Main → SSH exec channel → relay.ts (stdin/stdout framed JSON-RPC) → handlers (git, fs, pty, ...)
```
Deployed via SCP + SSH. Grace period + reconnect via Unix domain socket on disconnect.

**Daemon (main ↔ daemon process):**
```
Main → daemon-client.ts → daemon-entry.ts (forked process) → daemon-pty-provider → node-pty
```

**Agent Status Pipeline:**
```
PTY output → OSC title extraction → agent-detection.ts → agent-status-osc.ts → OrcaRuntimeService → IPC → renderer Zustand store
```

### Renderer State

Zustand store with slices in `src/renderer/src/store/slices/`. Key slices:

| Slice | What it manages |
|-------|----------------|
| `worktrees.ts` | Worktree list, creation, deletion, git status |
| `repos.ts` | Repo list, host management, project groups |
| `tabs.ts` / `tabs-hydration.ts` | Tab state, hydration from persisted sessions |
| `terminals.ts` | Terminal pane layout, split state |
| `agent-status.ts` | Live agent status from PTY output |
| `detected-agents.ts` | Detected agent environments per worktree |
| `browser.ts` | Browser sessions, tabs |
| `editor.ts` | Monaco editor state, file tabs |
| `github.ts` / `linear.ts` / `jira.ts` | Issue tracker data |
| `hosted-review.ts` | PR/MR review state |
| `settings.ts` | App settings |
| `ssh.ts` | SSH connections |
| `ui.ts` | UI state (sidebar width, panel layout) |
| `preflight.ts` | Environment preflight checks |

### Design System

See `docs/STYLEGUIDE.md` for full details. Key points:
- Tokens in `src/renderer/src/assets/main.css` (`:root` + `.dark`)
- shadcn primitives in `src/renderer/src/components/ui/`
- Font: Geist (sans), `var(--font-mono)` (mono)
- Monochrome + quiet; color reserved for state (git decorations, selection, destructive)
- Never hardcode hex — use CSS variables

## Dev vs Packaged Instance Isolation

**Dev (`pnpm dev`) and packaged (deb/dmg/exe) use separate userData directories on purpose.** They cannot share state and must not run simultaneously against the same userData.

| Platform | Packaged userData | Dev userData |
|----------|------------------|--------------|
| Linux | `~/.config/orca/` | `~/.config/orca-dev/` |
| macOS | `~/Library/Application Support/Orca/` | `~/Library/Application Support/orca-dev/` |
| Windows | `%APPDATA%/orca/` | `%APPDATA%/orca-dev/` |

**Why:** Both publish runtime bootstrap files (daemon socket, CLI registration) under userData. If shared, `pnpm dev` overwrites the packaged app's runtime pointer, making the `orca` CLI route to the wrong instance. Dev also crashes more often — isolation protects your real data.

**Key env vars for dev:**

| Variable | Effect |
|----------|--------|
| `ORCA_DEV_USER_DATA_PATH` | Override dev userData path entirely (e.g. point dev at packaged data) |
| `ORCA_DEV_BRANCH` | Override branch label shown in window title |
| `ORCA_DEV_WORKTREE_NAME` | Override worktree name in identity |
| `ORCA_DEV_INSTANCE_LABEL` | Override the full dev label |
| `ORCA_DEV_STABLE_NAME=1` | Use stable Electron app name (same as `--stable-name` flag) |

**To make dev use packaged data:** `ORCA_DEV_USER_DATA_PATH=~/.config/orca pnpm dev` (close packaged app first).

## Cross-Cutting Concerns

**Platform compatibility:** All changes must work on macOS, Linux, and Windows. Use `navigator.userAgent.includes('Mac')` for keyboard shortcuts, `CmdOrCtrl` in Electron menus, `path.join` for paths.

**SSH compatibility:** Don't assume local-only. File paths, credentials, shells, and network paths may be remote.

**Agent/provider neutrality:** Keep generic behavior agent-neutral. Guard integration-specific logic behind explicit checks.

**Git provider compatibility:** Support GitHub, GitLab, Gitea, Bitbucket, Azure DevOps. Don't assume GitHub-only.

**Type declarations:** Owned types go in `.ts` files, not `.d.ts`. `skipLibCheck: true` means `.d.ts` errors silently become `any`.

## Build Details

- **Node 24** required (`engines` + `volta`)
- **pnpm 10.24** package manager
- **electron-vite** bundles main/preload/renderer
- **tsgo** (`@typescript/native-preview`) for type-checking
- **oxlint** + **oxfmt** for lint/format (not ESLint/Prettier)
- **vitest** for unit tests (colocated `*.test.ts`)
- **Playwright** for E2E tests (`tests/e2e/`)
- Native deps rebuilt for Electron: `node-pty`, `@parcel/watcher`, `sherpa-onnx`, `esbuild`
- Relay bundled separately (`pnpm build:relay`) — zero Electron deps required
- CLI compiled separately (`pnpm build:cli`) via tsc
- Compile-time constants: `ORCA_BUILD_IDENTITY`, `ORCA_POSTHOG_WRITE_KEY` — only set in CI release builds; telemetry is disabled in dev/contributor builds
- Linux deb: package name `orca-ide` (avoids conflict with GNOME Orca screen reader), executable name `orca-ide`, depends on python3 + xvfb + xdotool + xclip
