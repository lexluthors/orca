import React, { useCallback, useState } from 'react'
import {
  Star,
  GitFork,
  Clock,
  Copy,
  GitBranch,
  Lock,
  Globe,
  ExternalLink,
  List
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { RemoteRepository } from '../../../../shared/git-platforms'
import { BranchDialog } from './BranchDialog'
import { CloneDialog } from './CloneDialog'

type RepoCardProps = {
  repo: RemoteRepository
}

function formatRelativeTime(isoDate: string): string {
  const now = Date.now()
  const then = new Date(isoDate).getTime()
  const diffMs = now - then
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffDay > 30) {
    const diffMonth = Math.floor(diffDay / 30)
    if (diffMonth > 12) {
      const diffYear = Math.floor(diffMonth / 12)
      return `${diffYear}y ago`
    }
    return `${diffMonth}mo ago`
  }
  if (diffDay > 0) {
    return `${diffDay}d ago`
  }
  if (diffHr > 0) {
    return `${diffHr}h ago`
  }
  if (diffMin > 0) {
    return `${diffMin}m ago`
  }
  return 'just now'
}

function copyToClipboard(text: string): void {
  window.api.ui.writeClipboardText(text)
}

/** Derive the web browser URL for a repo from its HTTP clone URL. */
function getRepoWebUrl(repo: RemoteRepository): string {
  // HTTP clone URLs look like:
  //   GitHub: https://github.com/owner/repo.git
  //   GitLab: https://gitlab.example.com/group/repo.git
  //   Gitee:  https://gitee.com/owner/repo.git
  // Strip .git suffix to get the web URL.
  return repo.httpUrl.replace(/\.git$/, '')
}

export function RepoCard({ repo }: RepoCardProps): React.JSX.Element {
  const [branchDialogOpen, setBranchDialogOpen] = useState(false)
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false)

  const handleCopyHttp = useCallback(() => copyToClipboard(repo.httpUrl), [repo.httpUrl])
  const handleCopySsh = useCallback(() => copyToClipboard(repo.sshUrl), [repo.sshUrl])
  const handleOpenInBrowser = useCallback(() => {
    const url = getRepoWebUrl(repo)
    window.api.shell.openUrl(url)
  }, [repo])

  return (
    <div className="rounded-lg border border-border/50 bg-card p-4 transition-colors hover:border-border">
      {/* Top row: name + visibility */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 overflow-hidden">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-foreground">{repo.name}</h3>
            <Badge
              variant={repo.isPrivate ? 'secondary' : 'outline'}
              className="shrink-0 text-[10px]"
            >
              {repo.isPrivate ? (
                <>
                  <Lock className="size-2.5" /> Private
                </>
              ) : (
                <>
                  <Globe className="size-2.5" /> Public
                </>
              )}
            </Badge>
            {repo.isFork && (
              <Badge variant="outline" className="shrink-0 text-[10px]">
                <GitFork className="size-2.5" /> Fork
              </Badge>
            )}
          </div>
          {repo.namespace && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground/60">{repo.namespace}</p>
          )}
        </div>
      </div>

      {/* Description */}
      {repo.description && (
        <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{repo.description}</p>
      )}

      {/* Stats row */}
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground/70">
        {repo.language && (
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-primary/60" />
            {repo.language}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Star className="size-3" />
          {repo.starsCount}
        </span>
        <span className="flex items-center gap-1">
          <GitFork className="size-3" />
          {repo.forksCount}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="size-3" />
          {formatRelativeTime(repo.updatedAt)}
        </span>
        <span className="flex items-center gap-1">
          <GitBranch className="size-3" />
          {repo.defaultBranch}
        </span>
      </div>

      {/* Action row */}
      <div className="mt-3 flex items-center gap-1.5">
        <button
          type="button"
          onClick={handleCopyHttp}
          className={cn(
            'flex items-center gap-1 rounded-md border border-border/50 px-2 py-1 text-[11px]',
            'text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
          )}
          title="Copy HTTP URL"
        >
          <Copy className="size-3" />
          HTTP
        </button>
        <button
          type="button"
          onClick={handleCopySsh}
          className={cn(
            'flex items-center gap-1 rounded-md border border-border/50 px-2 py-1 text-[11px]',
            'text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
          )}
          title="Copy SSH URL"
        >
          <Copy className="size-3" />
          SSH
        </button>
        <button
          type="button"
          onClick={() => setBranchDialogOpen(true)}
          className={cn(
            'flex items-center gap-1 rounded-md border border-border/50 px-2 py-1 text-[11px]',
            'text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
          )}
          title="View all branches"
        >
          <List className="size-3" />
          Branches
        </button>
        <button
          type="button"
          onClick={handleOpenInBrowser}
          className={cn(
            'flex items-center gap-1 rounded-md border border-border/50 px-2 py-1 text-[11px]',
            'text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
          )}
          title="Open in browser"
        >
          <ExternalLink className="size-3" />
          Browse
        </button>
        <button
          type="button"
          onClick={() => setCloneDialogOpen(true)}
          className={cn(
            'flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-[11px]',
            'text-primary transition-colors hover:bg-primary/20'
          )}
          title="Clone repository"
        >
          <GitBranch className="size-3" />
          Clone
        </button>
      </div>

      {/* Dialogs */}
      <BranchDialog repo={repo} open={branchDialogOpen} onOpenChange={setBranchDialogOpen} />
      <CloneDialog repo={repo} open={cloneDialogOpen} onOpenChange={setCloneDialogOpen} />
    </div>
  )
}
