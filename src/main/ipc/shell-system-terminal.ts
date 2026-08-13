// Why: OS-terminal execution (spawn helpers + execute/system-terminal IPC) is a
// distinct concern from shell path/editor integration; keeping it separate keeps
// both files under the repo's max-lines budget without a disable comment.
import { ipcMain } from 'electron'
import { spawn } from 'node:child_process'
import { access, constants } from 'node:fs/promises'
import { dirname, extname } from 'node:path'
import type {
  ShellOpenLocalPathFailureReason,
  ShellOpenLocalPathResult
} from '../../shared/shell-open-types'
import { getSpawnArgsForWindows } from '../win32-utils'

type SpawnResult = { ok: true } | { ok: false; reason: ShellOpenLocalPathFailureReason }

type ValidateLocalPathTarget = (
  pathValue: string
) => Promise<{ ok: true; path: string } | { ok: false; reason: 'not-absolute' | 'not-found' }>

// Spawns a detached process, resolving once the child starts (or fails to start).
// The child is unreffed so the Electron process does not wait for it to exit.
function spawnDetached(command: string, args: string[]): Promise<SpawnResult> {
  return new Promise<SpawnResult>((resolve) => {
    let settled = false
    function settle(result: SpawnResult): void {
      if (settled) {
        return
      }
      settled = true
      child.off('error', onError)
      child.off('spawn', onSpawn)
      resolve(result)
    }
    function onError(): void {
      settle({ ok: false, reason: 'launch-failed' })
    }
    function onSpawn(): void {
      child.unref()
      settle({ ok: true })
    }
    const child = spawn(command, args, { detached: true, stdio: 'ignore' })
    child.once('error', onError)
    child.once('spawn', onSpawn)
  })
}

function buildExecuteCommand(filePath: string, isAppImage: boolean): string {
  if (isAppImage) {
    return `'${filePath}'`
  }
  const ext = extname(filePath).toLowerCase()
  switch (ext) {
    case '.deb':
      return `sudo apt install -y '${filePath}'`
    case '.apk':
      return `adb install '${filePath}'`
    case '.py':
      return `python3 '${filePath}'`
    case '.sh':
      return `bash '${filePath}'`
    default:
      return `'${filePath}'`
  }
}

async function spawnTerminalCommand(
  targetPath: string,
  isDirectory: boolean,
  command: string | null
): Promise<SpawnResult> {
  if (process.platform === 'linux') {
    let terminalCmd: string
    let terminalArgs: string[]
    if (command) {
      // Execute a command and keep terminal open afterwards for the user to read output.
      const fullCommand = `${command} ; echo "" ; read -n 1 -s -r -p "Press any key to close..."`
      terminalCmd = 'gnome-terminal'
      terminalArgs = ['--', 'bash', '-c', fullCommand]
    } else {
      // Open terminal at a directory.
      const cwd = isDirectory ? targetPath : dirname(targetPath)
      terminalCmd = 'gnome-terminal'
      terminalArgs = [`--working-directory=${cwd}`]
    }
    return spawnDetached(terminalCmd, terminalArgs)
  }

  if (process.platform === 'darwin') {
    if (command) {
      const escaped = command.replace(/'/g, "'\\''")
      const script = `tell application "Terminal" to do script "${escaped}"`
      return spawnDetached('osascript', ['-e', script])
    }
    const cwd = isDirectory ? targetPath : dirname(targetPath)
    const script = `tell application "Terminal" to do script "cd '${cwd.replace(/'/g, "'\\''")}'"`
    return spawnDetached('osascript', ['-e', script])
  }

  if (process.platform === 'win32') {
    if (command) {
      const { spawnCmd, spawnArgs } = getSpawnArgsForWindows('cmd.exe', [
        '/K',
        `${command} & echo. & pause`
      ])
      return spawnDetached(spawnCmd, spawnArgs)
    }
    const cwd = isDirectory ? targetPath : dirname(targetPath)
    const { spawnCmd, spawnArgs } = getSpawnArgsForWindows('cmd.exe', ['/K', `cd /d "${cwd}"`])
    return spawnDetached(spawnCmd, spawnArgs)
  }

  return { ok: false, reason: 'unsupported-platform' }
}

export function registerShellSystemTerminalHandlers(
  validateLocalPathTarget: ValidateLocalPathTarget
): void {
  // Why: opens the user's OS-level terminal (gnome-terminal / Terminal.app / cmd.exe)
  // at the given path. For files, the terminal opens in the file's parent directory.
  ipcMain.handle(
    'shell:openSystemTerminal',
    async (
      _event,
      args: { path: string; isDirectory: boolean }
    ): Promise<ShellOpenLocalPathResult> => {
      const target = await validateLocalPathTarget(args.path)
      if (!target.ok) {
        return target
      }
      const result = await spawnTerminalCommand(target.path, args.isDirectory, null)
      if (!result.ok) {
        return { ok: false, reason: result.reason }
      }
      return { ok: true }
    }
  )

  // Why: runs a script or installer (.deb/.AppImage/.apk/.py/.sh) in the OS-level
  // terminal so the user can see interactive prompts (sudo password, adb progress)
  // and the output after execution. AppImage files are auto-chmodded if needed.
  ipcMain.handle(
    'shell:executeFile',
    async (_event, filePath: string): Promise<ShellOpenLocalPathResult> => {
      const target = await validateLocalPathTarget(filePath)
      if (!target.ok) {
        return target
      }

      const ext = extname(target.path).toLowerCase()
      const isAppImage = target.path.endsWith('.AppImage')
      const executableExts = ['.deb', '.apk', '.py', '.sh']
      if (!isAppImage && !executableExts.includes(ext)) {
        return { ok: false, reason: 'unsupported-file-type' }
      }

      // AppImage files need execute permission; chmod +x if not already set.
      if (isAppImage) {
        try {
          await access(target.path, constants.X_OK)
        } catch {
          try {
            await spawnDetached('chmod', ['+x', target.path])
          } catch {
            return { ok: false, reason: 'chmod-failed' }
          }
        }
      }

      const command = buildExecuteCommand(target.path, isAppImage)
      const result = await spawnTerminalCommand(target.path, false, command)
      if (!result.ok) {
        return { ok: false, reason: result.reason }
      }
      return { ok: true }
    }
  )
}