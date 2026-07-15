import React, { useState, useCallback, useEffect } from 'react'
import { GitBranch, FolderOpen, Copy, Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { RemoteRepository } from '../../../../shared/git-platforms'
import type { Repo } from '../../../../shared/types'

type CloneDialogProps = {
  repo: RemoteRepository
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CloneDialog({ repo, open, onOpenChange }: CloneDialogProps): React.JSX.Element {
  const [cloneMethod, setCloneMethod] = useState<'ssh' | 'http'>('http')
  const [destination, setDestination] = useState('')
  const [isCloning, setIsCloning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<{ phase: string; percent: number } | null>(null)
  const [copiedUrl, setCopiedUrl] = useState(false)

  const cloneUrl = cloneMethod === 'ssh' ? repo.sshUrl : repo.httpUrl

  // Listen to clone progress events
  useEffect(() => {
    if (!isCloning) {
      return
    }
    return window.api.repos.onCloneProgress(setProgress)
  }, [isCloning])

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setDestination('')
      setIsCloning(false)
      setError(null)
      setProgress(null)
      setCopiedUrl(false)
    }
  }, [open])

  const handlePickDirectory = useCallback(async () => {
    const dir = await window.api.shell.pickDirectory({ defaultPath: destination || undefined })
    if (dir) {
      setDestination(dir)
      setError(null)
    }
  }, [destination])

  const handleCopyUrl = useCallback(async () => {
    await window.api.ui.writeClipboardText(cloneUrl)
    setCopiedUrl(true)
    setTimeout(() => setCopiedUrl(false), 1500)
  }, [cloneUrl])

  const handleClone = useCallback(async () => {
    const trimmedDest = destination.trim()
    if (!trimmedDest) {
      setError('Please select a destination directory')
      return
    }
    setIsCloning(true)
    setError(null)
    setProgress(null)
    try {
      const repo = (await window.api.repos.clone({
        url: cloneUrl,
        destination: trimmedDest
      })) as Repo
      toast.success('Repository cloned', { description: repo.displayName })
      onOpenChange(false)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
    } finally {
      setIsCloning(false)
    }
  }, [cloneUrl, destination, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 truncate">
            <GitBranch className="size-4 shrink-0" />
            <span className="truncate">Clone Repository</span>
          </DialogTitle>
          <DialogDescription className="truncate">{repo.fullName}</DialogDescription>
        </DialogHeader>

        <div className="flex min-w-0 flex-col gap-4">
          {/* Clone URL selector */}
          <div className="flex min-w-0 flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Clone URL</label>
            <div className="flex min-w-0 items-center gap-1.5">
              {/* Method toggle */}
              <div className="flex shrink-0 rounded-md border border-border">
                <button
                  type="button"
                  onClick={() => setCloneMethod('http')}
                  className={cn(
                    'rounded-l-md px-2 py-1 text-[11px] transition-colors',
                    cloneMethod === 'http'
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  HTTP
                </button>
                <button
                  type="button"
                  onClick={() => setCloneMethod('ssh')}
                  className={cn(
                    'rounded-r-md px-2 py-1 text-[11px] transition-colors',
                    cloneMethod === 'ssh'
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  SSH
                </button>
              </div>
              {/* URL display */}
              <div className="min-w-0 flex-1 rounded-md border border-border/50 bg-muted/30 px-2.5 py-1.5">
                <span className="block break-all font-mono text-xs text-muted-foreground">
                  {cloneUrl}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyUrl}
                className="shrink-0 rounded-md border border-border/50 p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title="Copy URL"
              >
                {copiedUrl ? (
                  <Check className="size-3 text-green-500" />
                ) : (
                  <Copy className="size-3" />
                )}
              </button>
            </div>
          </div>

          {/* Destination picker */}
          <div className="flex min-w-0 flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Clone to directory</label>
            <div className="flex min-w-0 items-center gap-1.5">
              <Input
                value={destination}
                onChange={(e) => {
                  setDestination(e.target.value)
                  setError(null)
                }}
                placeholder="Select a directory..."
                className="h-8 min-w-0 flex-1 font-mono text-xs"
                disabled={isCloning}
              />
              <button
                type="button"
                onClick={handlePickDirectory}
                disabled={isCloning}
                className="shrink-0 rounded-md border border-border/50 p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                title="Browse..."
              >
                <FolderOpen className="size-3.5" />
              </button>
            </div>
            {destination && (
              <p className="truncate text-[11px] text-muted-foreground/60">
                Repository will be cloned to: {destination}/{repo.name}
              </p>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-md bg-destructive/5 p-2.5 text-xs text-destructive">
              {error}
            </div>
          )}

          {/* Progress */}
          {isCloning && progress && (
            <div className="flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${Math.max(progress.percent, 5)}%` }}
                />
              </div>
              <span className="shrink-0 text-[11px] text-muted-foreground">
                {progress.phase} {progress.percent > 0 ? `${progress.percent}%` : ''}
              </span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isCloning}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleClone} disabled={isCloning || !destination.trim()}>
              {isCloning ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Cloning...
                </>
              ) : (
                <>
                  <GitBranch className="size-3.5" />
                  Clone
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
