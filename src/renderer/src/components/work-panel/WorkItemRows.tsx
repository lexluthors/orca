import React from 'react'
import { Check, Trash2, StickyNote, Pin } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDueDate } from './work-hours'
import type { WorkItem, WorkItemPriority } from './types'

export const PRIORITY_STYLES: Record<WorkItemPriority, string> = {
  high: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400',
  low: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400'
}

export function TodoRow({
  item,
  isActive,
  onToggle,
  onSelect,
  onDelete
}: {
  item: WorkItem
  isActive: boolean
  onToggle: () => void
  onSelect: () => void
  onDelete: () => void
}): React.JSX.Element {
  const dueInfo = formatDueDate(item.dueAt)

  return (
    <div
      className={cn(
        'group flex items-start gap-2.5 rounded-lg px-3 py-2.5 transition-colors cursor-pointer',
        isActive ? 'bg-primary/10' : 'hover:bg-muted/50',
        item.completed && !isActive && 'opacity-60'
      )}
      onClick={onSelect}
    >
      {/* Checkbox */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onToggle()
        }}
        className={cn(
          'mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 transition-colors',
          item.completed
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-muted-foreground/40 hover:border-primary'
        )}
      >
        {item.completed && <Check className="size-3" strokeWidth={3} />}
      </button>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'text-[13px] leading-snug',
              item.completed && 'line-through text-muted-foreground'
            )}
          >
            {item.title}
          </span>
          <span
            className={cn(
              'inline-flex rounded px-1 py-px text-[10px] font-medium uppercase',
              PRIORITY_STYLES[item.priority]
            )}
          >
            {item.priority}
          </span>
        </div>

        {item.content && (
          <p className="mt-0.5 truncate text-[12px] text-muted-foreground">{item.content}</p>
        )}

        {dueInfo && (
          <p className={cn('mt-1 text-[11px] font-medium', dueInfo.colorClass)}>
            Due {dueInfo.text}
          </p>
        )}
      </div>

      {/* Actions — visible on hover */}
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          title="Delete"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  )
}

export function MemoRow({
  item,
  isActive,
  onSelect,
  onPin,
  onDelete
}: {
  item: WorkItem
  isActive: boolean
  onSelect: () => void
  onPin: () => void
  onDelete: () => void
}): React.JSX.Element {
  const dueInfo = formatDueDate(item.dueAt)

  return (
    <div
      className={cn(
        'group flex items-start gap-2.5 rounded-lg px-3 py-2.5 transition-colors cursor-pointer',
        isActive ? 'bg-primary/10' : 'hover:bg-muted/50'
      )}
      onClick={onSelect}
    >
      {/* Memo icon */}
      <div className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center">
        <StickyNote
          className="size-4"
          style={{ color: item.color || '#fef3c7' }}
          fill={item.color || '#fef3c7'}
          fillOpacity={0.3}
        />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[13px] leading-snug font-medium">{item.title || 'Untitled'}</span>
          {item.pinned && <Pin className="size-3 shrink-0 fill-current text-primary" />}
        </div>

        {item.content && (
          <p className="mt-0.5 truncate text-[12px] text-muted-foreground">{item.content}</p>
        )}

        {dueInfo && (
          <p className={cn('mt-1 text-[11px] font-medium', dueInfo.colorClass)}>
            Due {dueInfo.text}
          </p>
        )}
      </div>

      {/* Actions — visible on hover */}
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onPin()
          }}
          className={cn(
            'rounded p-1 text-muted-foreground transition-colors hover:text-foreground',
            item.pinned && 'text-primary'
          )}
          title={item.pinned ? 'Unpin' : 'Pin'}
        >
          <Pin className={cn('size-3.5', item.pinned && 'fill-current')} />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          title="Delete"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  )
}
