/* Git Platform Manager preload bindings — split out of
   `src/preload/index.ts` so adding or changing a channel
   doesn't surface as a merge conflict on every upstream sync
   of the central preload file. Composed back into `api.gitPlatforms`
   from `index.ts`. */
import { ipcRenderer } from 'electron'

export const gitPlatformsApi = {
  listConnections: (): Promise<unknown> =>
    ipcRenderer.invoke('git-platforms:list-connections'),

  addConnection: (args: unknown): Promise<unknown> =>
    ipcRenderer.invoke('git-platforms:add-connection', args),

  updateConnection: (id: string, args: unknown): Promise<unknown> =>
    ipcRenderer.invoke('git-platforms:update-connection', { id, ...args as Record<string, unknown> }),

  removeConnection: (id: string): Promise<unknown> =>
    ipcRenderer.invoke('git-platforms:remove-connection', { id }),

  testConnection: (args: unknown): Promise<unknown> =>
    ipcRenderer.invoke('git-platforms:test-connection', args),

  listRepos: (args: unknown): Promise<unknown> =>
    ipcRenderer.invoke('git-platforms:list-repos', args),

  syncRepos: (connectionId: string): Promise<unknown> =>
    ipcRenderer.invoke('git-platforms:sync-repos', { connectionId })
}
