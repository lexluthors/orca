export {
  loadConnections,
  saveConnection,
  updateConnection,
  deleteConnection,
  getConnection,
  touchConnectionSync
} from './connection-store'

export { getAdapter, fetchAllPages } from './platform-router'
export type { PlatformAdapter } from './platform-router'

export {
  syncRepos,
  getCachedRepos,
  clearRepoCache
} from './repo-sync-service'
