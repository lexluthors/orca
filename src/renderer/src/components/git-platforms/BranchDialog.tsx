import React, { useEffect, useState, useCallback } from 'react'
import { GitBranch, Shield, Star, Copy, Check } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useGitPlatformsStore } from './use-git-platforms-store'
import type { RemoteRepository, RemoteBranch } from '../../../../shared/git-platforms'

type BranchDialogProps = {
  repo: RemoteRepository
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BranchDialog({ repo, open, onOpenChange }: BranchDialogProps): React.JSX.Element {
  const listBranches = useGitPlatformsStore((s) => s.listBranches)

  const [branches, setBranches] = useState<RemoteBranch[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedName, setCopiedName] = useState<string | null>(null)

  const fetchBranches = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    setBranches([])
    try {
      // GitLab uses numeric project ID; GitHub/Gitee use full name
      const repoId = repo.platform === 'gitlab' ? repo.id : repo.fullName
      const result = await listBranches(repo.connectionId, repoId)
      // Mark the default branch based on repo.defaultBranch
      const marked = result.map((b) => ({
        ...b,
        isDefault: b.isDefault || b.name === repo.defaultBranch
      }))
      // Sort: default branch first, then alphabetically
      marked.sort((a, b) => {
        if (a.isDefault && !b.isDefault) {
          return -1
        }
        if (!a.isDefault && b.isDefault) {
          return 1
        }
        return a.name.localeCompare(b.name)
      })
      setBranches(marked)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load branches'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [repo, listBranches])

  useEffect(() => {
    if (open) {
      fetchBranches()
    } else {
      setBranches([])
      setError(null)
      setCopiedName(null)
    }
  }, [open, fetchBranches])

  const handleCopyBranch = useCallback(async (name: string) => {
    await window.api.ui.writeClipboardText(name)
    setCopiedName(name)
    setTimeout(() => setCopiedName(null), 1500)
  }, [])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="size-4" />
            Branches
          </DialogTitle>
          <DialogDescription>
            {repo.fullName} — {branches.length} {branches.length === 1 ? 'branch' : 'branches'}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-[200px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <div className="size-5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
              <p className="mt-2 text-xs">Loading branches...</p>
            </div>
          ) : error ? (
            <div className="rounded-md bg-destructive/5 p-3 text-xs text-destructive">{error}</div>
          ) : branches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <GitBranch className="size-6 opacity-30" />
              <p className="mt-2 text-xs">No branches found</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[400px]">
              <div className="flex flex-col gap-0.5 pr-3">
                {branches.map((branch) => (
                  <div
                    key={branch.name}
                    className={cn(
                      'group flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors hover:bg-muted/60',
                      branch.isDefault && 'bg-primary/5'
                    )}
                  >
                    <GitBranch
                      className={cn(
                        'size-3.5 shrink-0',
                        branch.isDefault ? 'text-primary' : 'text-muted-foreground/50'
                      )}
                    />
                    <span
                      className={cn(
                        'flex-1 truncate font-mono text-xs',
                        branch.isDefault && 'font-semibold text-foreground'
                      )}
                    >
                      {branch.name}
                    </span>
                    {branch.isDefault && (
                      <span className="flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-px text-[10px] font-medium text-primary">
                        <Star className="size-2.5" />
                        default
                      </span>
                    )}
                    {branch.isProtected && !branch.isDefault && (
                      <span className="flex items-center gap-0.5 rounded-full bg-muted px-1.5 py-px text-[10px] text-muted-foreground">
                        <Shield className="size-2.5" />
                        protected
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleCopyBranch(branch.name)}
                      className="shrink-0 rounded p-0.5 text-muted-foreground/40 opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                      title="Copy branch name"
                    >
                      {copiedName === branch.name ? (
                        <Check className="size-3 text-green-500" />
                      ) : (
                        <Copy className="size-3" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
