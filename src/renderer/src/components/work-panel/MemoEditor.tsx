import React, { useState, useCallback } from 'react'
import { Pin, Trash2, Eye, EyeOff, Palette } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useWorkStore } from './use-work-store'
import { MEMO_COLORS } from './types'
import type { WorkItem } from './types'

export function MemoEditor({ memo }: { memo: WorkItem }): React.JSX.Element {
  const updateMemo = useWorkStore((s) => s.updateMemo)
  const deleteMemo = useWorkStore((s) => s.deleteMemo)
  const toggleMemoPin = useWorkStore((s) => s.toggleMemoPin)
  const setActiveItemId = useWorkStore((s) => s.setActiveItemId)

  const [showPreview, setShowPreview] = useState(false)
  const [showColors, setShowColors] = useState(false)

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateMemo(memo.id, { title: e.target.value })
    },
    [memo.id, updateMemo]
  )

  const handleContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateMemo(memo.id, { content: e.target.value })
    },
    [memo.id, updateMemo]
  )

  const handleColorChange = useCallback(
    (color: string) => {
      updateMemo(memo.id, { color })
      setShowColors(false)
    },
    [memo.id, updateMemo]
  )

  const handleDelete = useCallback(() => {
    deleteMemo(memo.id)
    setActiveItemId(null)
  }, [memo.id, deleteMemo, setActiveItemId])

  return (
    <div
      className="flex h-full flex-col"
      style={{
        backgroundColor: `color-mix(in srgb, ${memo.color || '#fef3c7'} 15%, transparent)`,
      }}
    >
      {/* Toolbar */}
      <div className="flex items-center gap-1 border-b border-border/30 px-4 py-2">
        <Button
          variant="ghost"
          size="sm"
          className={cn('h-7 w-7 p-0', memo.pinned && 'text-primary')}
          onClick={() => toggleMemoPin(memo.id)}
          title={memo.pinned ? 'Unpin' : 'Pin'}
        >
          <Pin className={cn('size-3.5', memo.pinned && 'fill-current')} />
        </Button>

        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setShowColors(!showColors)}
            title="Color"
          >
            <Palette className="size-3.5" />
          </Button>
          {showColors && (
            <div className="absolute top-8 left-0 z-10 flex gap-1.5 rounded-lg border border-border bg-popover p-2 shadow-md">
              {MEMO_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => handleColorChange(color)}
                  className={cn(
                    'h-5 w-5 rounded-full border-2 transition-transform hover:scale-110',
                    memo.color === color
                      ? 'border-primary ring-2 ring-primary/30'
                      : 'border-transparent'
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          className={cn('h-7 w-7 p-0', showPreview && 'text-primary')}
          onClick={() => setShowPreview(!showPreview)}
          title={showPreview ? 'Edit' : 'Preview'}
        >
          {showPreview ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
        </Button>

        <div className="ml-auto">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
            onClick={handleDelete}
            title="Delete memo"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Title */}
      <div className="px-4 pt-3">
        <Input
          value={memo.title}
          onChange={handleTitleChange}
          placeholder="Memo title"
          className="border-none bg-transparent text-lg font-semibold shadow-none focus-visible:ring-0"
        />
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {showPreview ? (
          <div className="prose prose-sm dark:prose-invert max-w-none py-2 text-[13px]">
            <ReactMarkdown>{memo.content || '*No content*'}</ReactMarkdown>
          </div>
        ) : (
          <textarea
            value={memo.content}
            onChange={handleContentChange}
            placeholder="Write your memo here... (Markdown supported)"
            className="h-full w-full resize-none border-none bg-transparent py-2 text-[13px] leading-relaxed placeholder:text-muted-foreground focus-visible:outline-none"
          />
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border/30 px-4 py-1.5 text-[10px] text-muted-foreground/60">
        Updated {new Date(memo.updatedAt).toLocaleString('zh-CN')}
      </div>
    </div>
  )
}
