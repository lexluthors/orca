import React, { useCallback } from 'react'
import { Plus, Trash2, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { PlatformIcon } from './platform-icons'
import { useGitPlatformsStore } from './use-git-platforms-store'
import type { GitPlatformConnection } from '../../../../shared/git-platforms'
import { GIT_PLATFORM_LABELS } from '../../../../shared/git-platforms'

interface PlatformSidebarProps {
  onAddClick: () => void
  onEditClick: (connection: GitPlatformConnection) => void
  onDeleteClick: (connection: GitPlatformConnection) => void
}

export function PlatformSidebar({
  onAddClick,
  onEditClick,
  onDeleteClick
}: PlatformSidebarProps): React.JSX.Element {
  const connections = useGitPlatformsStore((s) => s.connections)
  const selectedConnectionId = useGitPlatformsStore((s) => s.selectedConnectionId)
  const selectConnection = useGitPlatformsStore((s) => s.selectConnection)
  const isLoadingConnections = useGitPlatformsStore((s) => s.isLoadingConnections)

  const handleSelect = useCallback(
    (id: string) => {
      selectConnection(id === selectedConnectionId ? null : id)
    },
    [selectConnection, selectedConnectionId]
  )

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
        <h2 className="text-sm font-semibold">Platforms</h2>
        <span className="text-xs text-muted-foreground">{connections.length}</span>
      </div>

      {/* Connection list */}
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-0.5 p-2">
          {isLoadingConnections && connections.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="size-5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
            </div>
          ) : connections.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-muted-foreground/60">No platforms configured</p>
              <p className="mt-1 text-xs text-muted-foreground/40">
                Add a platform to browse your repositories.
              </p>
            </div>
          ) : (
            connections.map((conn) => (
              <ConnectionItem
                key={conn.id}
                connection={conn}
                isSelected={conn.id === selectedConnectionId}
                onSelect={handleSelect}
                onEdit={onEditClick}
                onDelete={onDeleteClick}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Add button */}
      <div className="border-t border-border/50 p-2">
        <button
          type="button"
          onClick={onAddClick}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Plus className="size-4" />
          Add Platform
        </button>
      </div>
    </div>
  )
}

// --- ConnectionItem ---

interface ConnectionItemProps {
  connection: GitPlatformConnection
  isSelected: boolean
  onSelect: (id: string) => void
  onEdit: (connection: GitPlatformConnection) => void
  onDelete: (connection: GitPlatformConnection) => void
}

function ConnectionItem({
  connection,
  isSelected,
  onSelect,
  onEdit,
  onDelete
}: ConnectionItemProps): React.JSX.Element {
  return (
    <div
      className={cn(
        'group flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors cursor-pointer',
        isSelected
          ? 'bg-muted text-foreground'
          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
      )}
      onClick={() => onSelect(connection.id)}
    >
      <PlatformIcon type={connection.type} className="size-4 shrink-0" />
      <div className="flex-1 overflow-hidden">
        <p className="truncate font-medium">{connection.name}</p>
        <p className="truncate text-xs text-muted-foreground/60">
          {GIT_PLATFORM_LABELS[connection.type]}
        </p>
      </div>
      {/* Action buttons — visible on hover */}
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onEdit(connection)
          }}
          className="rounded p-1 text-muted-foreground/50 hover:bg-muted hover:text-foreground"
          title="Edit"
        >
          <Pencil className="size-3" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(connection)
          }}
          className="rounded p-1 text-muted-foreground/50 hover:bg-destructive/10 hover:text-destructive"
          title="Delete"
        >
          <Trash2 className="size-3" />
        </button>
      </div>
    </div>
  )
}
