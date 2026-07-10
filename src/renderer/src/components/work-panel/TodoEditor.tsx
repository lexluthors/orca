import React, { useCallback } from 'react'
import { CalendarClock, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useWorkStore } from './use-work-store'
import {
  addWorkHours,
  subtractWorkHours,
  addWorkDays,
  subtractWorkDays,
} from './work-hours'
import type { WorkItem, WorkItemPriority } from './types'

/**
 * TodoEditor — inline editor for a selected todo item.
 * Displayed in the right panel of WorkPage.
 */
export function TodoEditor({ item }: { item: WorkItem }): React.JSX.Element {
  const updateTodo = useWorkStore((s) => s.updateTodo)
  const deleteTodo = useWorkStore((s) => s.deleteTodo)
  const setActiveItemId = useWorkStore((s) => s.setActiveItemId)

  const adjustDueHours = useCallback(
    (hours: number) => {
      const base = item.dueAt ? new Date(item.dueAt) : new Date()
      const adjusted = hours > 0 ? addWorkHours(base, hours) : subtractWorkHours(base, -hours)
      updateTodo(item.id, { dueAt: adjusted.toISOString() })
    },
    [item.id, item.dueAt, updateTodo]
  )

  const adjustDueDays = useCallback(
    (days: number) => {
      const base = item.dueAt ? new Date(item.dueAt) : new Date()
      const adjusted = days > 0 ? addWorkDays(base, days) : subtractWorkDays(base, -days)
      updateTodo(item.id, { dueAt: adjusted.toISOString() })
    },
    [item.id, item.dueAt, updateTodo]
  )

  const dueDateText = item.dueAt
    ? (() => {
        const d = new Date(item.dueAt)
        const month = d.getMonth() + 1
        const day = d.getDate()
        const hours = d.getHours().toString().padStart(2, '0')
        const minutes = d.getMinutes().toString().padStart(2, '0')
        return `${month}/${day} ${hours}:${minutes}`
      })()
    : 'No due date'

  const dueInfo = (() => {
    if (!item.dueAt) return null
    const diff = new Date(item.dueAt).getTime() - Date.now()
    if (diff < 0) return 'text-red-500'
    if (diff < 86400000) return 'text-orange-500'
    return 'text-blue-500'
  })()

  const handleDelete = useCallback(() => {
    deleteTodo(item.id)
    setActiveItemId(null)
  }, [item.id, deleteTodo, setActiveItemId])

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-1 border-b border-border/30 px-4 py-2">
        <span
          className={cn(
            'rounded px-1.5 py-0.5 text-[10px] font-medium uppercase',
            item.priority === 'high'
              ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
              : item.priority === 'medium'
                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400'
                : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400'
          )}
        >
          {item.priority}
        </span>

        {item.completed && (
          <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-950 dark:text-green-400">
            Done
          </span>
        )}

        <div className="ml-auto">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
            onClick={handleDelete}
            title="Delete todo"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Title */}
      <div className="px-4 pt-3">
        <Input
          value={item.title}
          onChange={(e) => updateTodo(item.id, { title: e.target.value })}
          placeholder="Todo title"
          className="border-none bg-transparent text-lg font-semibold shadow-none focus-visible:ring-0"
        />
      </div>

      {/* Content + controls */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <textarea
          value={item.content}
          onChange={(e) => updateTodo(item.id, { content: e.target.value })}
          placeholder="Add details... (optional)"
          className="h-32 w-full resize-none border-none bg-transparent py-2 text-[13px] leading-relaxed placeholder:text-muted-foreground focus-visible:outline-none"
        />

        {/* Priority */}
        <div className="flex items-center gap-2 border-t border-border/30 pt-3">
          <span className="text-xs text-muted-foreground">Priority:</span>
          <Select
            value={item.priority}
            onValueChange={(v) => updateTodo(item.id, { priority: v as WorkItemPriority })}
          >
            <SelectTrigger className="h-7 w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Due date */}
        <div className="flex flex-wrap items-center gap-2 border-t border-border/30 pt-3">
          <CalendarClock className="size-3.5 shrink-0 text-muted-foreground" />
          <span className={cn('text-xs font-medium', dueInfo ?? 'text-muted-foreground')}>
            {dueDateText}
          </span>
          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-6 px-1.5 text-[11px]"
              onClick={() => adjustDueHours(-2)}
            >
              -2h
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-6 px-1.5 text-[11px]"
              onClick={() => adjustDueHours(-1)}
            >
              -1h
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-6 px-1.5 text-[11px]"
              onClick={() => adjustDueDays(-1)}
            >
              -1D
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-6 px-1.5 text-[11px]"
              onClick={() => adjustDueDays(1)}
            >
              +1D
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-6 px-1.5 text-[11px]"
              onClick={() => adjustDueHours(1)}
            >
              +1h
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-6 px-1.5 text-[11px]"
              onClick={() => adjustDueHours(2)}
            >
              +2h
            </Button>
            {item.dueAt && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-1.5 text-[11px] text-muted-foreground"
                onClick={() => updateTodo(item.id, { dueAt: null })}
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border/30 px-4 py-1.5 text-[10px] text-muted-foreground/60">
        Updated {new Date(item.updatedAt).toLocaleString('zh-CN')}
      </div>
    </div>
  )
}
