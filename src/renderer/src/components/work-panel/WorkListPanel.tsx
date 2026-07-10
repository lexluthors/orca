import React, { useState, useCallback, useRef, useEffect } from 'react'
import {
  Check,
  Trash2,
  ChevronDown,
  ListChecks,
  CalendarClock,
  Pin,
  StickyNote,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import {
  useWorkStore,
  useMergedWorkItems,
  useTodoCounts,
} from './use-work-store'
import {
  formatDueDate,
  addWorkHours,
  subtractWorkHours,
  addWorkDays,
  subtractWorkDays,
  getDefaultDueDate,
} from './work-hours'
import type { WorkItem, WorkItemPriority, TodoFilter, WorkItemSort } from './types'
import { MEMO_COLORS } from './types'
import { useTodoNotifications } from './useTodoNotifications'

const FILTER_OPTIONS: { value: TodoFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
]

const SORT_OPTIONS: { value: WorkItemSort; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'priority', label: 'Priority' },
]

const PRIORITY_STYLES: Record<WorkItemPriority, string> = {
  high: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400',
  low: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
}

/**
 * WorkListPanel — merged todo + memo list with bottom toolbar.
 */
export function WorkListPanel({
  activeItemId,
  onItemSelect,
}: {
  activeItemId: string | null
  onItemSelect: (id: string | null) => void
}): React.JSX.Element {
  const items = useMergedWorkItems()
  const { total: totalCount, active: activeCount, completed: completedCount } = useTodoCounts()
  const filter = useWorkStore((s) => s.todoFilter)
  const sort = useWorkStore((s) => s.todoSort)
  const setTodoFilter = useWorkStore((s) => s.setTodoFilter)
  const setTodoSort = useWorkStore((s) => s.setTodoSort)
  const addTodo = useWorkStore((s) => s.addTodo)
  const addMemo = useWorkStore((s) => s.addMemo)
  const toggleTodo = useWorkStore((s) => s.toggleTodo)
  const deleteTodo = useWorkStore((s) => s.deleteTodo)
  const deleteMemo = useWorkStore((s) => s.deleteMemo)
  const toggleMemoPin = useWorkStore((s) => s.toggleMemoPin)
  const clearCompletedTodos = useWorkStore((s) => s.clearCompletedTodos)

  // --- Bottom toolbar state ---
  const [newTitle, setNewTitle] = useState('')
  const [newPriority, setNewPriority] = useState<WorkItemPriority>('medium')
  const [dueDate, setDueDate] = useState<Date>(() => getDefaultDueDate())
  const inputRef = useRef<HTMLInputElement>(null)

  // Start monitoring todos for upcoming due dates (system notifications)
  useTodoNotifications()

  // Auto-focus input when panel mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus()
    }, 50)
    return () => clearTimeout(timer)
  }, [])

  // --- Handlers ---
  const handleAddTodo = useCallback(() => {
    const trimmed = newTitle.trim()
    if (!trimmed) return
    addTodo(trimmed, '', newPriority, dueDate.toISOString())
    setNewTitle('')
  }, [newTitle, newPriority, dueDate, addTodo])

  const handleAddMemo = useCallback(() => {
    const trimmed = newTitle.trim()
    if (!trimmed) return
    const color = MEMO_COLORS[Math.floor(Math.random() * MEMO_COLORS.length)]
    addMemo(trimmed, '', color, null)
    setNewTitle('')
  }, [newTitle, addMemo])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        if (e.shiftKey) {
          handleAddMemo()
        } else {
          handleAddTodo()
        }
      }
    },
    [handleAddTodo, handleAddMemo]
  )

  const adjustDueDate = useCallback(
    (type: 'hour' | 'day', delta: number) => {
      setDueDate((prev) => {
        if (type === 'hour') {
          return delta > 0 ? addWorkHours(prev, delta) : subtractWorkHours(prev, -delta)
        } else {
          return delta > 0 ? addWorkDays(prev, delta) : subtractWorkDays(prev, -delta)
        }
      })
    },
    []
  )

  const dueDateText = (() => {
    const month = dueDate.getMonth() + 1
    const day = dueDate.getDate()
    const hours = dueDate.getHours().toString().padStart(2, '0')
    const minutes = dueDate.getMinutes().toString().padStart(2, '0')
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const weekDay = weekDays[dueDate.getDay()]
    return `${month}/${day} ${weekDay} ${hours}:${minutes}`
  })()

  const sortLabel = SORT_OPTIONS.find((o) => o.value === sort)?.label ?? 'Newest'

  return (
    <div className="flex h-full flex-col">
      {/* Filter + Sort bar */}
      <div className="flex items-center gap-2 border-b border-border/50 px-4 py-2">
        <div className="flex items-center gap-1">
          {FILTER_OPTIONS.map((opt) => {
            const count =
              opt.value === 'all'
                ? totalCount
                : opt.value === 'active'
                  ? activeCount
                  : completedCount
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTodoFilter(opt.value)}
                className={cn(
                  'rounded-md px-2 py-1 text-xs font-medium transition-colors',
                  filter === opt.value
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted'
                )}
              >
                {opt.label}
                <span className="ml-1 text-[10px] opacity-60">({count})</span>
              </button>
            )
          })}
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 gap-1 px-2 text-[11px]">
                {sortLabel}
                <ChevronDown className="size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-28">
              {SORT_OPTIONS.map((opt) => (
                <DropdownMenuItem
                  key={opt.value}
                  onClick={() => setTodoSort(opt.value)}
                  className={cn(
                    'text-xs',
                    sort === opt.value && 'bg-primary/10 text-primary'
                  )}
                >
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {completedCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[11px] text-muted-foreground"
              onClick={clearCompletedTodos}
            >
              <Trash2 className="mr-1 size-3" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Merged list */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <ListChecks className="mb-3 size-8 opacity-30" />
            <p className="text-sm">No items yet</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {items.map((item) =>
              item.type === 'todo' ? (
                <TodoRow
                  key={item.id}
                  item={item}
                  isActive={item.id === activeItemId}
                  onToggle={() => toggleTodo(item.id)}
                  onSelect={() => onItemSelect(item.id)}
                  onDelete={() => {
                    deleteTodo(item.id)
                    if (item.id === activeItemId) onItemSelect(null)
                  }}
                />
              ) : (
                <MemoRow
                  key={item.id}
                  item={item}
                  isActive={item.id === activeItemId}
                  onSelect={() => onItemSelect(item.id)}
                  onPin={() => toggleMemoPin(item.id)}
                  onDelete={() => {
                    deleteMemo(item.id)
                    if (item.id === activeItemId) onItemSelect(null)
                  }}
                />
              )
            )}
          </div>
        )}
      </div>

      {/* Bottom toolbar */}
      <div className="border-t border-border/50 px-4 py-2">
        {/* Date picker row */}
        <div className="flex items-center gap-2 mb-2">
          <CalendarClock className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="text-xs font-medium text-foreground min-w-[120px]">
            {dueDateText}
          </span>
          <div className="flex items-center gap-1 ml-auto">
            <Button
              variant="outline"
              size="sm"
              className="h-6 px-1.5 text-[11px]"
              onClick={() => adjustDueDate('hour', -2)}
            >
              -2h
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-6 px-1.5 text-[11px]"
              onClick={() => adjustDueDate('hour', -1)}
            >
              -1h
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-6 px-1.5 text-[11px]"
              onClick={() => adjustDueDate('day', -1)}
            >
              -1D
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-6 px-1.5 text-[11px]"
              onClick={() => adjustDueDate('day', 1)}
            >
              +1D
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-6 px-1.5 text-[11px]"
              onClick={() => adjustDueDate('hour', 1)}
            >
              +1h
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-6 px-1.5 text-[11px]"
              onClick={() => adjustDueDate('hour', 2)}
            >
              +2h
            </Button>
          </div>
        </div>

        {/* Priority checkboxes row */}
        <div className="flex items-center gap-4 mb-2">
          <span className="text-xs text-muted-foreground">Priority:</span>
          {(['low', 'medium', 'high'] as const).map((p) => (
            <label key={p} className="flex items-center gap-1.5 cursor-pointer">
              <Checkbox
                checked={newPriority === p}
                onCheckedChange={() => setNewPriority(p)}
                className="h-3.5 w-3.5"
              />
              <span
                className={cn(
                  'text-xs font-medium capitalize',
                  p === 'high'
                    ? 'text-red-600 dark:text-red-400'
                    : p === 'medium'
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : 'text-blue-600 dark:text-blue-400'
                )}
              >
                {p}
              </span>
            </label>
          ))}
        </div>

        {/* Input + buttons row */}
        <div className="flex items-center gap-2">
          <Input
            ref={inputRef}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a new item... (Enter for todo, Shift+Enter for memo)"
            className="h-8 flex-1 text-sm"
          />
          <Button
            size="sm"
            onClick={handleAddTodo}
            disabled={!newTitle.trim()}
            className="h-8 gap-1"
          >
            <Check className="size-3.5" />
            Todo
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleAddMemo}
            disabled={!newTitle.trim()}
            className="h-8 gap-1"
          >
            <StickyNote className="size-3.5" />
            Memo
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────── Todo Row ─────────────── */

function TodoRow({
  item,
  isActive,
  onToggle,
  onSelect,
  onDelete,
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
          <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
            {item.content}
          </p>
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

/* ─────────────── Memo Row ─────────────── */

function MemoRow({
  item,
  isActive,
  onSelect,
  onPin,
  onDelete,
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
          <span className="text-[13px] leading-snug font-medium">
            {item.title || 'Untitled'}
          </span>
          {item.pinned && (
            <Pin className="size-3 shrink-0 fill-current text-primary" />
          )}
        </div>

        {item.content && (
          <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
            {item.content}
          </p>
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
