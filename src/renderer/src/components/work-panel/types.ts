/** Work item type discriminator. */
export type WorkItemType = 'todo' | 'memo'

/** Priority levels for todos. */
export type WorkItemPriority = 'high' | 'medium' | 'low'

/** Filter for todo list display. */
export type TodoFilter = 'all' | 'active' | 'completed'

/** Sort order for work items. */
export type WorkItemSort = 'newest' | 'oldest' | 'priority'

/** Active tab in the work panel. */
export type WorkPanelTab = 'todos' | 'memos'

/** A todo or memo item. */
export interface WorkItem {
  id: string
  type: WorkItemType
  title: string
  content: string
  completed: boolean
  /** ISO-8601 date string or null. */
  dueAt: string | null
  /** Priority — only meaningful for todos, defaults to 'medium'. */
  priority: WorkItemPriority
  /** Color hex — only meaningful for memos. */
  color: string
  /** Pinned — only meaningful for memos. */
  pinned: boolean
  createdAt: number
  updatedAt: number
}

/** Memo card color presets. */
export const MEMO_COLORS = [
  '#fef3c7', // amber-100
  '#dbeafe', // blue-100
  '#dcfce7', // green-100
  '#fce7f3', // pink-100
  '#f3e8ff', // purple-100
] as const

export const DEFAULT_MEMO_COLOR = MEMO_COLORS[0]

/** Work-hours configuration (ported from cc_history WorkHours). */
export const WORK_HOURS = {
  workStartHour: 9,
  workStartMinute: 0,
  morningEndHour: 12,
  morningEndMinute: 0,
  afternoonStartHour: 14,
  afternoonStartMinute: 0,
  workEndHour: 18,
  workEndMinute: 0,
} as const
