/**
 * Zustand store for the Git Platform Manager.
 * Manages connections, repos, filters, and sorting.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  GitPlatformType,
  GitPlatformConnection,
  RemoteRepository,
  RemoteBranch,
  RemoteReposPage,
  ConnectionTestResult,
  CreateGitPlatformConnectionArgs,
  UpdateGitPlatformConnectionArgs,
  ListRemoteReposArgs,
  ListRemoteBranchesArgs
} from '../../../../shared/git-platforms'

// The IPC API surface exposed by the main process under window.api.gitPlatforms
type GitPlatformsApi = {
  listConnections: () => Promise<GitPlatformConnection[]>
  addConnection: (args: CreateGitPlatformConnectionArgs) => Promise<GitPlatformConnection>
  updateConnection: (
    id: string,
    args: UpdateGitPlatformConnectionArgs
  ) => Promise<GitPlatformConnection>
  removeConnection: (id: string) => Promise<void>
  testConnection: (args: {
    type: GitPlatformType
    baseUrl: string
    token: string
    tokenType: 'pat' | 'oauth'
  }) => Promise<ConnectionTestResult>
  listRepos: (args: ListRemoteReposArgs) => Promise<RemoteReposPage>
  syncRepos: (connectionId: string) => Promise<RemoteRepository[]>
  listBranches: (args: ListRemoteBranchesArgs) => Promise<RemoteBranch[]>
}

type WindowWithApi = Window & { api: { gitPlatforms: GitPlatformsApi } }

function getApi(): GitPlatformsApi {
  return (window as unknown as WindowWithApi).api.gitPlatforms
}

function getErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback
}

type GitPlatformsState = {
  // --- Data ---
  connections: GitPlatformConnection[]
  selectedConnectionId: string | null
  repos: RemoteRepository[]
  reposByConnection: Record<string, RemoteRepository[]>

  // --- UI state ---
  isLoadingConnections: boolean
  isLoadingRepos: boolean
  searchQuery: string
  platformFilter: GitPlatformType | 'all'
  visibilityFilter: 'all' | 'public' | 'private'
  sortBy: 'name' | 'updated' | 'stars'
  sortOrder: 'asc' | 'desc'
  lastError: string | null

  // --- Actions ---
  loadConnections: () => Promise<void>
  addConnection: (args: CreateGitPlatformConnectionArgs) => Promise<void>
  updateConnection: (id: string, patch: UpdateGitPlatformConnectionArgs) => Promise<void>
  removeConnection: (id: string) => Promise<void>
  testConnection: (args: {
    type: GitPlatformType
    baseUrl: string
    token: string
    tokenType: 'pat' | 'oauth'
  }) => Promise<ConnectionTestResult>
  selectConnection: (id: string | null) => void
  loadRepos: (connectionId: string) => Promise<void>
  syncRepos: (connectionId: string) => Promise<void>
  listBranches: (connectionId: string, repoId: string) => Promise<RemoteBranch[]>
  setSearchQuery: (query: string) => void
  setPlatformFilter: (filter: GitPlatformType | 'all') => void
  setVisibilityFilter: (filter: 'all' | 'public' | 'private') => void
  setSortBy: (sort: 'name' | 'updated' | 'stars') => void
  setSortOrder: (order: 'asc' | 'desc') => void
  clearError: () => void
}

export const useGitPlatformsStore = create<GitPlatformsState>()(
  persist(
    (set, get) => ({
      // --- Data ---
      connections: [],
      selectedConnectionId: null,
      repos: [],
      reposByConnection: {},

      // --- UI state ---
      isLoadingConnections: false,
      isLoadingRepos: false,
      searchQuery: '',
      platformFilter: 'all',
      visibilityFilter: 'all',
      sortBy: 'updated',
      sortOrder: 'desc',
      lastError: null,

      // --- Actions ---
      loadConnections: async () => {
        set({ isLoadingConnections: true, lastError: null })
        try {
          const connections = await getApi().listConnections()
          set({ connections, isLoadingConnections: false })
        } catch (err: unknown) {
          set({
            isLoadingConnections: false,
            lastError: getErrorMessage(err, 'Failed to load connections')
          })
        }
      },

      addConnection: async (args) => {
        set({ lastError: null })
        try {
          const conn = await getApi().addConnection(args)
          set((s) => ({ connections: [...s.connections, conn] }))
        } catch (err: unknown) {
          set({ lastError: getErrorMessage(err, 'Failed to add connection') })
          throw err
        }
      },

      updateConnection: async (id, patch) => {
        set({ lastError: null })
        try {
          const updated = await getApi().updateConnection(id, patch)
          set((s) => ({
            connections: s.connections.map((c) => (c.id === id ? updated : c))
          }))
        } catch (err: unknown) {
          set({ lastError: getErrorMessage(err, 'Failed to update connection') })
          throw err
        }
      },

      removeConnection: async (id) => {
        set({ lastError: null })
        try {
          await getApi().removeConnection(id)
          set((s) => {
            const nextReposByConnection = { ...s.reposByConnection }
            delete nextReposByConnection[id]
            return {
              connections: s.connections.filter((c) => c.id !== id),
              selectedConnectionId: s.selectedConnectionId === id ? null : s.selectedConnectionId,
              repos: s.selectedConnectionId === id ? [] : s.repos,
              reposByConnection: nextReposByConnection
            }
          })
        } catch (err: unknown) {
          set({ lastError: getErrorMessage(err, 'Failed to remove connection') })
          throw err
        }
      },

      testConnection: async (args) => {
        return await getApi().testConnection(args)
      },

      selectConnection: (id) => {
        set({ selectedConnectionId: id })
        if (id) {
          const cached = get().reposByConnection[id]
          if (cached) {
            set({ repos: cached })
          } else {
            // Auto-load repos for the selected connection
            get().loadRepos(id)
          }
        } else {
          set({ repos: [] })
        }
      },

      loadRepos: async (connectionId) => {
        set({ isLoadingRepos: true, lastError: null })
        try {
          const page = await getApi().listRepos({
            connectionId,
            query: get().searchQuery || undefined,
            visibility: get().visibilityFilter,
            sort: get().sortBy,
            order: get().sortOrder
          })
          set((s) => ({
            repos: page.repos,
            reposByConnection: { ...s.reposByConnection, [connectionId]: page.repos },
            isLoadingRepos: false
          }))
        } catch (err: unknown) {
          set({ isLoadingRepos: false, lastError: getErrorMessage(err, 'Failed to load repos') })
        }
      },

      syncRepos: async (connectionId) => {
        set({ isLoadingRepos: true, lastError: null })
        try {
          const repos = await getApi().syncRepos(connectionId)
          set((s) => ({
            repos,
            reposByConnection: { ...s.reposByConnection, [connectionId]: repos },
            isLoadingRepos: false
          }))
        } catch (err: unknown) {
          set({ isLoadingRepos: false, lastError: getErrorMessage(err, 'Failed to sync repos') })
        }
      },

      listBranches: async (connectionId, repoId) => {
        return await getApi().listBranches({ connectionId, repoId })
      },

      setSearchQuery: (query) => set({ searchQuery: query }),
      setPlatformFilter: (filter) => set({ platformFilter: filter }),
      setVisibilityFilter: (filter) => set({ visibilityFilter: filter }),
      setSortBy: (sort) => set({ sortBy: sort }),
      setSortOrder: (order) => set({ sortOrder: order }),
      clearError: () => set({ lastError: null })
    }),
    {
      name: 'orca-git-platforms',
      partialize: (state) => ({
        selectedConnectionId: state.selectedConnectionId,
        platformFilter: state.platformFilter,
        visibilityFilter: state.visibilityFilter,
        sortBy: state.sortBy,
        sortOrder: state.sortOrder
      })
    }
  )
)
