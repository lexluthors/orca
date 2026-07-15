import React from 'react'
import { GitBranch } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store'

/**
 * Sidebar nav button for the Git Platform Manager.
 * Placed between Work and Tasks buttons in SidebarNav.
 */
export function SidebarGitNavButton(): React.JSX.Element {
  const openGitPage = useAppStore((s) => s.openGitPage)
  const activeView = useAppStore((s) => s.activeView)

  const gitActive = activeView === 'git'

  return (
    <button
      type="button"
      onClick={openGitPage}
      aria-current={gitActive ? 'page' : undefined}
      className={cn(
        'group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] font-medium tracking-tight transition-colors',
        gitActive
          ? 'bg-worktree-sidebar-accent text-worktree-sidebar-accent-foreground'
          : 'text-worktree-sidebar-foreground/60 hover:bg-worktree-sidebar-foreground/8'
      )}
    >
      <GitBranch
        className={cn('size-4 shrink-0', !gitActive && 'text-worktree-sidebar-foreground/30')}
        strokeWidth={gitActive ? 2.25 : 1.75}
      />
      <span className="flex-1">Git</span>
    </button>
  )
}
