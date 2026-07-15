import React, { useCallback, useEffect, useMemo } from 'react'
import {
  Search,
  RefreshCw,
  ArrowDown,
  ArrowUp,
  GitBranch,
  FolderOpen,
  ChevronRight,
  ChevronDown
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { RepoCard } from './RepoCard'
import { useGitPlatformsStore } from './use-git-platforms-store'
import type { RemoteRepository } from '../../../../shared/git-platforms'

/** Group repos by their namespace field. */
function groupByNamespace(
  repos: RemoteRepository[]
): { namespace: string; repos: RemoteRepository[] }[] {
  const map = new Map<string, RemoteRepository[]>()
  for (const repo of repos) {
    const key = repo.namespace || 'Other'
    let group = map.get(key)
    if (!group) {
      group = []
      map.set(key, group)
    }
    group.push(repo)
  }
  return Array.from(map.entries())
    .map(([namespace, repos]) => ({ namespace, repos }))
    .sort((a, b) => a.namespace.localeCompare(b.namespace))
}

/** Collapsible group header. */
function GroupHeader({
  namespace,
  count,
  collapsed,
  onToggle
}: {
  namespace: string
  count: number
  collapsed: boolean
  onToggle: () => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted/50"
    >
      {collapsed ? (
        <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/50" />
      ) : (
        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground/50" />
      )}
      <FolderOpen className="size-3.5 shrink-0 text-muted-foreground/60" />
      <span className="flex-1 truncate text-xs font-semibold text-foreground/80">
        {namespace}
      </span>
      <span className="shrink-0 rounded-full bg-muted px-1.5 py-px text-[10px] font-medium text-muted-foreground">
        {count}
      </span>
    </button>
  )
}

export function RepoListView(): React.JSX.Element {
  const selectedConnectionId = useGitPlatformsStore((s) => s.selectedConnectionId)
  const repos = useGitPlatformsStore((s) => s.repos)
  const isLoadingRepos = useGitPlatformsStore((s) => s.isLoadingRepos)
  const searchQuery = useGitPlatformsStore((s) => s.searchQuery)
  const visibilityFilter = useGitPlatformsStore((s) => s.visibilityFilter)
  const sortBy = useGitPlatformsStore((s) => s.sortBy)
  const sortOrder = useGitPlatformsStore((s) => s.sortOrder)
  const lastError = useGitPlatformsStore((s) => s.lastError)

  const setSearchQuery = useGitPlatformsStore((s) => s.setSearchQuery)
  const setVisibilityFilter = useGitPlatformsStore((s) => s.setVisibilityFilter)
  const setSortBy = useGitPlatformsStore((s) => s.setSortBy)
  const setSortOrder = useGitPlatformsStore((s) => s.setSortOrder)
  const loadRepos = useGitPlatformsStore((s) => s.loadRepos)
  const syncRepos = useGitPlatformsStore((s) => s.syncRepos)

  // Track collapsed groups
  const [collapsedGroups, setCollapsedGroups] = React.useState<Set<string>>(new Set())

  const toggleGroup = useCallback((namespace: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(namespace)) {
        next.delete(namespace)
      } else {
        next.add(namespace)
      }
      return next
    })
  }, [])

  // Load repos when connection changes
  useEffect(() => {
    if (selectedConnectionId) {
      loadRepos(selectedConnectionId)
    }
  }, [selectedConnectionId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Client-side filtering, sorting, and grouping
  const groups = useMemo(() => {
    let result = [...repos]

    // Text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.fullName.toLowerCase().includes(q) ||
          (r.description?.toLowerCase().includes(q) ?? false) ||
          r.namespace.toLowerCase().includes(q)
      )
    }

    // Visibility filter
    if (visibilityFilter === 'public') {
      result = result.filter((r) => !r.isPrivate)
    } else if (visibilityFilter === 'private') {
      result = result.filter((r) => r.isPrivate)
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0
      switch (sortBy) {
        case 'name':
          cmp = a.name.localeCompare(b.name)
          break
        case 'updated':
          cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
          break
        case 'stars':
          cmp = a.starsCount - b.starsCount
          break
      }
      return sortOrder === 'desc' ? -cmp : cmp
    })

    return groupByNamespace(result)
  }, [repos, searchQuery, visibilityFilter, sortBy, sortOrder])

  const handleSync = useCallback(() => {
    if (selectedConnectionId) {
      syncRepos(selectedConnectionId)
    }
  }, [selectedConnectionId, syncRepos])

  if (!selectedConnectionId) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
        <GitBranch className="mb-3 size-10 opacity-20" />
        <p className="text-sm opacity-60">Select a platform to browse repositories</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-border/50 px-4 py-2.5">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/40" />
          <Input
            placeholder="Search repositories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-sm"
          />
        </div>

        {/* Visibility filter */}
        <select
          value={visibilityFilter}
          onChange={(e) => setVisibilityFilter(e.target.value as 'all' | 'public' | 'private')}
          className="h-8 rounded-md border border-border bg-transparent px-2 text-xs text-muted-foreground outline-none focus:border-ring"
        >
          <option value="all">All</option>
          <option value="public">Public</option>
          <option value="private">Private</option>
        </select>

        {/* Sort by */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'name' | 'updated' | 'stars')}
          className="h-8 rounded-md border border-border bg-transparent px-2 text-xs text-muted-foreground outline-none focus:border-ring"
        >
          <option value="updated">Updated</option>
          <option value="name">Name</option>
          <option value="stars">Stars</option>
        </select>

        {/* Sort order toggle */}
        <button
          type="button"
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
        >
          {sortOrder === 'asc' ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />}
        </button>

        {/* Sync button */}
        <button
          type="button"
          onClick={handleSync}
          disabled={isLoadingRepos}
          className="flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
          title="Sync repositories from platform"
        >
          <RefreshCw className={cn('size-3.5', isLoadingRepos && 'animate-spin')} />
          Sync
        </button>
      </div>

      {/* Error banner */}
      {lastError && (
        <div className="border-b border-destructive/20 bg-destructive/5 px-4 py-2 text-xs text-destructive">
          {lastError}
        </div>
      )}

      {/* Repo list — grouped by namespace */}
      {isLoadingRepos && repos.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <div className="size-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
            <p className="text-sm">Loading all repositories...</p>
          </div>
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <GitBranch className="size-8 opacity-20" />
            <p className="text-sm opacity-60">
              {searchQuery ? 'No repositories match your search' : 'No repositories found'}
            </p>
          </div>
        </div>
      ) : (
        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-4 p-4">
            {groups.map((group) => {
              const isCollapsed = collapsedGroups.has(group.namespace)
              return (
                <div key={group.namespace}>
                  <GroupHeader
                    namespace={group.namespace}
                    count={group.repos.length}
                    collapsed={isCollapsed}
                    onToggle={() => toggleGroup(group.namespace)}
                  />
                  {!isCollapsed && (
                    <div className="mt-1.5 flex flex-col gap-2 pl-5">
                      {group.repos.map((repo) => (
                        <RepoCard key={repo.id} repo={repo} />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </ScrollArea>
      )}

      {/* Footer with count */}
      <div className="border-t border-border/50 px-4 py-1.5 text-xs text-muted-foreground/60">
        {repos.length} {repos.length === 1 ? 'repository' : 'repositories'}
        {groups.length > 1 && (
          <span className="ml-2">
            in {groups.length} {groups.length === 1 ? 'group' : 'groups'}
          </span>
        )}
      </div>
    </div>
  )
}
