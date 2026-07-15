import { app } from 'electron'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import type {
  GitPlatformConnection,
  CreateGitPlatformConnectionArgs,
  UpdateGitPlatformConnectionArgs
} from '../../shared/git-platforms'
import { generateConnectionId } from '../../shared/git-platforms'

const getConnectionsDir = (): string =>
  join(app.getPath('userData'), 'git-platforms')

const getConnectionsFile = (): string =>
  join(getConnectionsDir(), 'connections.json')

let _cache: GitPlatformConnection[] | null = null

const ensureDir = async (): Promise<void> => {
  await mkdir(getConnectionsDir(), { recursive: true })
}

export const loadConnections = async (): Promise<GitPlatformConnection[]> => {
  if (_cache) {
    return _cache
  }
  try {
    const raw = await readFile(getConnectionsFile(), 'utf-8')
    const parsed = JSON.parse(raw)
    _cache = Array.isArray(parsed) ? (parsed as GitPlatformConnection[]) : []
  } catch {
    _cache = []
  }
  return _cache
}

const persistConnections = async (connections: GitPlatformConnection[]): Promise<void> => {
  await ensureDir()
  await writeFile(getConnectionsFile(), JSON.stringify(connections, null, 2), 'utf-8')
  _cache = connections
}

export const getConnection = async (
  id: string
): Promise<GitPlatformConnection | undefined> => {
  const connections = await loadConnections()
  return connections.find((c) => c.id === id)
}

export const saveConnection = async (
  args: CreateGitPlatformConnectionArgs
): Promise<GitPlatformConnection> => {
  const connections = await loadConnections()
  const now = Date.now()
  const conn: GitPlatformConnection = {
    id: generateConnectionId(),
    type: args.type,
    name: args.name,
    baseUrl: args.baseUrl,
    token: args.token,
    tokenType: args.tokenType ?? 'pat',
    defaultBranch: args.defaultBranch,
    sshEnabled: args.sshEnabled ?? false,
    sshKeyPath: args.sshKeyPath,
    createdAt: now,
    updatedAt: now
  }
  await persistConnections([...connections, conn])
  return conn
}

export const updateConnection = async (
  id: string,
  patch: UpdateGitPlatformConnectionArgs
): Promise<GitPlatformConnection | null> => {
  const connections = await loadConnections()
  const index = connections.findIndex((c) => c.id === id)
  if (index === -1) {
    return null
  }
  const updated: GitPlatformConnection = {
    ...connections[index],
    ...patch,
    updatedAt: Date.now()
  }
  const next = [...connections]
  next[index] = updated
  await persistConnections(next)
  return updated
}

export const deleteConnection = async (id: string): Promise<boolean> => {
  const connections = await loadConnections()
  const filtered = connections.filter((c) => c.id !== id)
  if (filtered.length === connections.length) {
    return false
  }
  await persistConnections(filtered)
  return true
}

/**
 * Mark a connection's lastSyncAt timestamp to now.
 */
export const touchConnectionSync = async (id: string): Promise<void> => {
  const connections = await loadConnections()
  const index = connections.findIndex((c) => c.id === id)
  if (index === -1) {
    return
  }
  const next = [...connections]
  next[index] = { ...next[index], lastSyncAt: Date.now(), updatedAt: Date.now() }
  await persistConnections(next)
}
