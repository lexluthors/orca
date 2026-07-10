import React from 'react'
import { Briefcase } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store'

/**
 * Sidebar nav button for the Work panel (Todos + Memos).
 * Placed above the Tasks button in SidebarNav.
 */
export function SidebarWorkNavButton(): React.JSX.Element {
  const openWorkPage = useAppStore((s) => s.openWorkPage)
  const activeView = useAppStore((s) => s.activeView)

  const workActive = activeView === 'work'

  return (
    <button
      type="button"
      onClick={openWorkPage}
      aria-current={workActive ? 'page' : undefined}
      data-contextual-tour-target="sidebar-work"
      className={cn(
        'group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] font-medium tracking-tight transition-colors',
        workActive
          ? 'bg-worktree-sidebar-accent text-worktree-sidebar-accent-foreground'
          : 'text-worktree-sidebar-foreground/60 hover:bg-worktree-sidebar-foreground/8'
      )}
    >
      <Briefcase
        className={cn('size-4 shrink-0', !workActive && 'text-worktree-sidebar-foreground/30')}
        strokeWidth={workActive ? 2.25 : 1.75}
      />
      <span className="flex-1">Work</span>
    </button>
  )
}
