import React, { useEffect, useState, useCallback } from 'react'
import { GitBranch } from 'lucide-react'
import { PlatformSidebar } from './PlatformSidebar'
import { RepoListView } from './RepoListView'
import { PlatformConfigDialog } from './PlatformConfigDialog'
import { useGitPlatformsStore } from './use-git-platforms-store'
import type { GitPlatformConnection } from '../../../../shared/git-platforms'

/**
 * GitPlatformsPage — top-level page for the Git Platform Manager.
 * Layout: sidebar (connections) + main content (repos).
 */
export function GitPlatformsPage(): React.JSX.Element {
  const selectedConnectionId = useGitPlatformsStore((s) => s.selectedConnectionId)
  const loadConnections = useGitPlatformsStore((s) => s.loadConnections)
  const removeConnection = useGitPlatformsStore((s) => s.removeConnection)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingConnection, setEditingConnection] = useState<GitPlatformConnection | null>(null)

  // Load connections on mount
  useEffect(() => {
    loadConnections()
  }, [loadConnections])

  const handleAddClick = useCallback(() => {
    setEditingConnection(null)
    setDialogOpen(true)
  }, [])

  const handleEditClick = useCallback((conn: GitPlatformConnection) => {
    setEditingConnection(conn)
    setDialogOpen(true)
  }, [])

  const handleDeleteClick = useCallback(
    (conn: GitPlatformConnection) => {
      // Simple confirm — could be replaced with a proper dialog later
      const confirmed = window.confirm(
        `Remove connection "${conn.name}"? This cannot be undone.`
      )
      if (confirmed) {
        removeConnection(conn.id)
      }
    },
    [removeConnection]
  )

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left sidebar — connections */}
      <div className="w-[280px] shrink-0 border-r border-border/50">
        <PlatformSidebar
          onAddClick={handleAddClick}
          onEditClick={handleEditClick}
          onDeleteClick={handleDeleteClick}
        />
      </div>

      {/* Right content — repo list */}
      <div className="flex-1 overflow-hidden">
        {selectedConnectionId ? (
          <RepoListView />
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
            <GitBranch className="mb-3 size-10 opacity-20" />
            <p className="text-sm font-medium opacity-60">Add a platform to get started</p>
            <p className="mt-1 text-xs opacity-40">
              Connect to GitHub, GitLab, or Gitee to browse your repositories.
            </p>
          </div>
        )}
      </div>

      {/* Config dialog */}
      <PlatformConfigDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingConnection={editingConnection}
      />
    </div>
  )
}

export default GitPlatformsPage
