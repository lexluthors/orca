import React, { useState, useCallback } from 'react'
import { CalendarClock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useWorkStore } from './use-work-store'
import {
  formatDueDate,
  addWorkHours,
  subtractWorkHours,
  addWorkDays,
  subtractWorkDays
} from './work-hours'
import type { WorkItem, WorkItemPriority } from './types'
import { translate } from '@/i18n/i18n'

export function TodoEditDialog({
  item,
  onClose
}: {
  item: WorkItem
  onClose: () => void
}): React.JSX.Element {
  const updateTodo = useWorkStore((s) => s.updateTodo)

  const [title, setTitle] = useState(item.title)
  const [content, setContent] = useState(item.content)
  const [priority, setPriority] = useState<WorkItemPriority>(item.priority)
  const [dueAt, setDueAt] = useState<string | null>(item.dueAt)

  const dueInfo = formatDueDate(dueAt)

  const adjustDueHours = useCallback(
    (hours: number) => {
      const base = dueAt ? new Date(dueAt) : new Date()
      const adjusted = hours > 0 ? addWorkHours(base, hours) : subtractWorkHours(base, -hours)
      setDueAt(adjusted.toISOString())
    },
    [dueAt]
  )

  const adjustDueDays = useCallback(
    (days: number) => {
      const base = dueAt ? new Date(dueAt) : new Date()
      const adjusted = days > 0 ? addWorkDays(base, days) : subtractWorkDays(base, -days)
      setDueAt(adjusted.toISOString())
    },
    [dueAt]
  )

  const handleSave = useCallback(() => {
    updateTodo(item.id, {
      title: title.trim() || item.title,
      content,
      priority,
      dueAt
    })
    onClose()
  }, [item.id, item.title, title, content, priority, dueAt, updateTodo, onClose])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        handleSave()
      }
    },
    [handleSave]
  )

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle className="text-base">
            {translate('auto.components.work-panel.TodoEditDialog.editTodoTitle', 'Edit Todo')}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-2">
          {/* Title */}
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={translate(
              'auto.components.work-panel.TodoEditDialog.todoTitlePlaceholder',
              'Todo title'
            )}
            className="text-sm font-medium"
            autoFocus
          />

          {/* Content */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={translate(
              'auto.components.work-panel.TodoEditDialog.detailsPlaceholder',
              'Details (optional)'
            )}
            rows={3}
            className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />

          {/* Priority */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {translate('auto.components.work-panel.TodoEditDialog.priorityLabel', 'Priority:')}
            </span>
            <Select value={priority} onValueChange={(v) => setPriority(v as WorkItemPriority)}>
              <SelectTrigger className="h-7 w-24 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">
                  {translate('auto.components.work-panel.TodoEditDialog.priorityHigh', 'High')}
                </SelectItem>
                <SelectItem value="medium">
                  {translate('auto.components.work-panel.TodoEditDialog.priorityMedium', 'Medium')}
                </SelectItem>
                <SelectItem value="low">
                  {translate('auto.components.work-panel.TodoEditDialog.priorityLow', 'Low')}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Due date */}
          <div className="flex items-center gap-2">
            <CalendarClock className="size-3.5 text-muted-foreground" />
            <span
              className={cn('text-xs font-medium', dueInfo?.colorClass ?? 'text-muted-foreground')}
            >
              {dueInfo
                ? translate('auto.components.work-panel.TodoEditDialog.due', 'Due {{text}}', {
                    text: dueInfo.text
                  })
                : translate('auto.components.work-panel.TodoEditDialog.noDueDate', 'No due date')}
            </span>
            <div className="ml-auto flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-6 px-1.5 text-[11px]"
                onClick={() => adjustDueHours(-2)}
              >
                {translate('auto.components.work-panel.TodoEditDialog.minusTwoHours', '-2h')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-6 px-1.5 text-[11px]"
                onClick={() => adjustDueHours(-1)}
              >
                {translate('auto.components.work-panel.TodoEditDialog.minusOneHour', '-1h')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-6 px-1.5 text-[11px]"
                onClick={() => adjustDueDays(-1)}
              >
                {translate('auto.components.work-panel.TodoEditDialog.minusOneDay', '-1D')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-6 px-1.5 text-[11px]"
                onClick={() => adjustDueDays(1)}
              >
                {translate('auto.components.work-panel.TodoEditDialog.plusOneDay', '+1D')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-6 px-1.5 text-[11px]"
                onClick={() => adjustDueHours(1)}
              >
                {translate('auto.components.work-panel.TodoEditDialog.plusOneHour', '+1h')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-6 px-1.5 text-[11px]"
                onClick={() => adjustDueHours(2)}
              >
                {translate('auto.components.work-panel.TodoEditDialog.plusTwoHours', '+2h')}
              </Button>
              {dueAt && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-1.5 text-[11px] text-muted-foreground"
                  onClick={() => setDueAt(null)}
                >
                  {translate('auto.components.work-panel.TodoEditDialog.clear', 'Clear')}
                </Button>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {translate('auto.components.work-panel.TodoEditDialog.cancel', 'Cancel')}
          </Button>
          <Button onClick={handleSave}>
            {translate('auto.components.work-panel.TodoEditDialog.save', 'Save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
