import { isAbsolute } from 'node:path'
import { pathToFileURL } from 'node:url'

export type ClipboardFileResult = { ok: boolean; reason?: string }

// Injected so the platform branching is unit-testable without the real OS
// clipboard or spawning processes.
export type ClipboardFileDeps = {
  platform: NodeJS.Platform
  // Linux only: the active desktop ($XDG_CURRENT_DESKTOP). KDE and GNOME-family
  // file managers disagree on the clipboard format, so it picks the payload.
  desktop?: string
  // Linux only: the display session type ($XDG_SESSION_TYPE). Used to pick the
  // right clipboard tool — wl-copy on Wayland, xclip on X11.
  sessionType?: string
  resolveFilePath: (
    path: string
  ) => Promise<{ ok: true; path: string } | { ok: false; reason: string }>
  writeBuffer: (format: string, buffer: Buffer) => void
  runCommand: (command: string, args: string[], stdin?: string) => Promise<void>
}

// Put a real OS-level file reference on the clipboard so pasting in Finder /
// Explorer / a file manager drops the actual file (not its path as text). Only
// local files work — remote/SSH files don't exist on this machine. Accepts a
// single path or an array of paths (multi-select copy). Always resolves a
// result and never throws, so the renderer can report failures.
export async function writeFileToClipboard(
  filePath: string | readonly string[],
  deps: ClipboardFileDeps
): Promise<ClipboardFileResult> {
  const paths = Array.isArray(filePath) ? filePath : [filePath]
  if (paths.length === 0) {
    return { ok: false, reason: 'invalid-path' }
  }
  // Validate all paths up front; reject the whole batch if any path is bad.
  const resolvedPaths: string[] = []
  for (const p of paths) {
    if (typeof p !== 'string' || !isAbsolute(p)) {
      return { ok: false, reason: 'invalid-path' }
    }
    const resolved = await deps.resolveFilePath(p)
    if (!resolved.ok) {
      return { ok: false, reason: resolved.reason }
    }
    resolvedPaths.push(resolved.path)
  }

  if (deps.platform === 'darwin') {
    // macOS reads `public.file-url`. For multi-select, Finder accepts a
    // newline-separated list of file URLs in a single buffer.
    try {
      const payload = resolvedPaths.map((p) => pathToFileURL(p).href).join('\n')
      deps.writeBuffer('public.file-url', Buffer.from(payload, 'utf8'))
      return { ok: true }
    } catch {
      return { ok: false, reason: 'clipboard-write-failed' }
    }
  }

  if (deps.platform === 'win32') {
    // Set-Clipboard -LiteralPath accepts an array of paths for multi-select.
    const escaped = resolvedPaths.map((p) => p.replace(/'/g, "''"))
    const literalArg =
      escaped.length === 1 ? `'${escaped[0]}'` : `@(${escaped.map((e) => `'${e}'`).join(', ')})`
    try {
      await deps.runCommand('powershell.exe', [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        `Set-Clipboard -LiteralPath ${literalArg}`
      ])
      return { ok: true }
    } catch {
      return { ok: false, reason: 'clipboard-command-failed' }
    }
  }

  // Linux: write a text/uri-list reference so file managers (Nautilus, Dolphin,
  // Nemo, Caja, …) can paste the file(s). The uri-list format uses \r\n as the
  // line separator per RFC 2483, and supports multiple URIs in one payload.
  //
  // Why: wl-copy only works on Wayland sessions; on X11 it immediately fails
  // ("Failed to connect to a Wayland server") which previously crashed the
  // stdin pipe and prevented xclip from running as fallback. Detect the
  // session type and prefer the matching tool so the first attempt succeeds
  // instead of silently degrading.
  const mime = 'text/uri-list'
  const payload = `${resolvedPaths.map((p) => pathToFileURL(p).href).join('\r\n')}\r\n`
  const isWayland = deps.sessionType === 'wayland'
  const toolOrder: readonly (readonly [string, readonly string[]])[] = isWayland
    ? [
        ['wl-copy', ['--type', mime]],
        ['xclip', ['-selection', 'clipboard', '-t', mime]]
      ]
    : [
        ['xclip', ['-selection', 'clipboard', '-t', mime]],
        ['wl-copy', ['--type', mime]]
      ]
  for (const [command, args] of toolOrder) {
    try {
      await deps.runCommand(command, [...args], payload)
      return { ok: true }
    } catch {
      // try the next tool
    }
  }
  return { ok: false, reason: 'unsupported-platform' }
}
