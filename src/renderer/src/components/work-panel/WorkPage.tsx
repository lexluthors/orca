import React from 'react'
import { ListChecks } from 'lucide-react'
import { WorkListPanel } from './WorkListPanel'
import { MemoEditor } from './MemoEditor'
import { TodoEditor } from './TodoEditor'
import { useWorkStore } from './use-work-store'

/**
 * WorkPage — main page component for the Work panel.
 * Left: merged todo + memo list with bottom toolbar.
 * Right: item editor (always visible, shows editor for selected todo or memo).
 */
export function WorkPage(): React.JSX.Element {
  const activeItemId = useWorkStore((s) => s.activeItemId)
  const setActiveItemId = useWorkStore((s) => s.setActiveItemId)
  const items = useWorkStore((s) => s.items)
  const activeItem = items.find((i) => i.id === activeItemId) ?? null

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left panel — merged work list */}
      <div className="w-1/2 border-r border-border/50">
        <WorkListPanel
          activeItemId={activeItemId}
          onItemSelect={setActiveItemId}
        />
      </div>

      {/* Right panel — always visible editor */}
      <div className="w-1/2 overflow-hidden">
        {activeItem ? (
          activeItem.type === 'memo' ? (
            <MemoEditor memo={activeItem} />
          ) : (
            <TodoEditor item={activeItem} />
          )
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
            <ListChecks className="mb-3 size-10 opacity-20" />
            <p className="text-sm opacity-60">Select an item to edit</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default WorkPage
