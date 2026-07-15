import type {
  ListRemoteReposArgs,
  RemoteReposPage
} from '../../shared/git-platforms'
import { getConnection } from './connection-store'
import { touchConnectionSync } from './connection-store'
import { getAdapter } from './platform-router'

const CACHE_TTL_MS = 5 * 60 * 1000

type CacheEntry = {
  repos: RemoteReposPage
  timestamp: number
}

const _cache = new Map<string, CacheEntry>()

export const getCachedRepos = (
  connectionId: string,
  args?: ListRemoteReposArgs
): RemoteReposPage | null => {
  const key = buildCacheKey(connectionId, args)
  const entry = _cache.get(key)
  if (!entry) {
    return null
  }
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    _cache.delete(key)
    return null
  }
  return entry.repos
}

const buildCacheKey = (
  connectionId: string,
  args?: ListRemoteReposArgs
): string => {
  if (!args) {
    return `${connectionId}:default`
  }
  return `${connectionId}:${args.page ?? 1}:${args.perPage ?? 20}:${args.query ?? ''}:${args.visibility ?? 'all'}`
}

export const syncRepos = async (
  connectionId: string,
  args: ListRemoteReposArgs
): Promise<RemoteReposPage> => {
  // Check cache first
  const cached = getCachedRepos(connectionId, args)
  if (cached) {
    return cached
  }

  const connection = await getConnection(connectionId)
  if (!connection) {
    throw new Error(`Connection not found: ${connectionId}`)
  }

  const adapter = getAdapter(connection.type)
  const result = await adapter.listRepos(connection.baseUrl, connection.token, args)

  // Cache the result
  const key = buildCacheKey(connectionId, args)
  _cache.set(key, { repos: result, timestamp: Date.now() })

  // Update connection sync timestamp
  await touchConnectionSync(connectionId)

  return result
}

/**
 * Clear cached repos for a specific connection, or all connections.
 */
export const clearRepoCache = (connectionId?: string): void => {
  if (!connectionId) {
    _cache.clear()
    return
  }
  for (const key of _cache.keys()) {
    if (key.startsWith(`${connectionId}:`)) {
      _cache.delete(key)
    }
  }
}
