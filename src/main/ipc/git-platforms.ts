import { ipcMain } from 'electron'
import type {
  CreateGitPlatformConnectionArgs,
  UpdateGitPlatformConnectionArgs,
  ListRemoteReposArgs
} from '../../shared/git-platforms'
import {
  loadConnections,
  saveConnection,
  updateConnection,
  deleteConnection,
  getConnection
} from '../git-platforms/connection-store'
import { getAdapter, fetchAllPages } from '../git-platforms/platform-router'

export function registerGitPlatformsHandlers(): void {
  ipcMain.handle('git-platforms:list-connections', async () => {
    try {
      return await loadConnections()
    } catch (error) {
      console.error('[git-platforms:list-connections]', error)
      throw error
    }
  })

  ipcMain.handle(
    'git-platforms:add-connection',
    async (_event, args: CreateGitPlatformConnectionArgs) => {
      try {
        return await saveConnection(args)
      } catch (error) {
        console.error('[git-platforms:add-connection]', error)
        throw error
      }
    }
  )

  ipcMain.handle(
    'git-platforms:update-connection',
    async (_event, args: { id: string } & UpdateGitPlatformConnectionArgs) => {
      try {
        return await updateConnection(args.id, args)
      } catch (error) {
        console.error('[git-platforms:update-connection]', error)
        throw error
      }
    }
  )

  ipcMain.handle(
    'git-platforms:remove-connection',
    async (_event, args: { id: string }) => {
      try {
        await deleteConnection(args.id)
        return { success: true }
      } catch (error) {
        console.error('[git-platforms:remove-connection]', error)
        throw error
      }
    }
  )

  ipcMain.handle(
    'git-platforms:test-connection',
    async (
      _event,
      args: { id: string } | CreateGitPlatformConnectionArgs
    ) => {
      try {
        // If an id is provided, test the existing connection; otherwise test
        // the provided args directly (for testing before saving).
        if ('id' in args && args.id) {
          const connection = await getConnection(args.id)
          if (!connection) {
            return { success: false, error: 'Connection not found' }
          }
          const adapter = getAdapter(connection.type)
          return await adapter.testConnection(connection.baseUrl, connection.token)
        }
        // Testing with raw args (before persisting).
        const createArgs = args as CreateGitPlatformConnectionArgs
        const adapter = getAdapter(createArgs.type)
        return await adapter.testConnection(createArgs.baseUrl, createArgs.token)
      } catch (error) {
        console.error('[git-platforms:test-connection]', error)
        const message = error instanceof Error ? error.message : String(error)
        return { success: false, error: message }
      }
    }
  )

  ipcMain.handle(
    'git-platforms:list-repos',
    async (_event, args: ListRemoteReposArgs) => {
      try {
        const connection = await getConnection(args.connectionId)
        if (!connection) {
          throw new Error(`Connection not found: ${args.connectionId}`)
        }
        const adapter = getAdapter(connection.type)
        const repos = await fetchAllPages(
          adapter,
          connection.baseUrl,
          connection.token,
          args.connectionId,
          {
            query: args.query,
            visibility: args.visibility,
            membership: args.membership,
            sort: args.sort,
            order: args.order
          }
        )
        return {
          repos,
          total: repos.length,
          page: 1,
          perPage: repos.length,
          hasMore: false
        }
      } catch (error) {
        console.error('[git-platforms:list-repos]', error)
        throw error
      }
    }
  )

  ipcMain.handle(
    'git-platforms:sync-repos',
    async (_event, args: { connectionId: string }) => {
      try {
        const connection = await getConnection(args.connectionId)
        if (!connection) {
          throw new Error(`Connection not found: ${args.connectionId}`)
        }
        const adapter = getAdapter(connection.type)
        const repos = await fetchAllPages(
          adapter,
          connection.baseUrl,
          connection.token,
          args.connectionId
        )
        return repos
      } catch (error) {
        console.error('[git-platforms:sync-repos]', error)
        throw error
      }
    }
  )
}
