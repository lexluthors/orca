/**
 * Zustand store for the Work Panel (todos + memos).
 * Persists to localStorage for portability.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  WorkItem,
  WorkItemType,
  WorkItemPriority,
  WorkPanelTab,
  TodoFilter,
  WorkItemSort,
} from './types'
import { DEFAULT_MEMO_COLOR } from './types'
import { getDefaultDueDate } from './work-hours'

function generateId(type: WorkItemType): string {
  return `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

interface WorkState {
  // --- Data ---
  items: WorkItem[]

  // --- UI state ---
  activeTab: WorkPanelTab
  todoFilter: TodoFilter
  todoSort: WorkItemSort
  memoSearchQuery: string
  activeItemId: string | null

  // --- Notification state ---
  pendingNotifications: string[]
  dismissedNotifications: string[]

  // --- Tab ---
  setActiveTab: (tab: WorkPanelTab) => void

  // --- Todo actions ---
  addTodo: (
    title: string,
    content?: string,
    priority?: WorkItemPriority,
    dueAt?: string | null
  ) => void
  toggleTodo: (id: string) => void
  updateTodo: (id: string, updates: Partial<WorkItem>) => void
  deleteTodo: (id: string) => void
  clearCompletedTodos: () => void
  setTodoFilter: (filter: TodoFilter) => void
  setTodoSort: (sort: WorkItemSort) => void

  // --- Memo actions ---
  addMemo: (title?: string, content?: string, color?: string, dueAt?: string | null) => string
  updateMemo: (id: string, updates: Partial<WorkItem>) => void
  deleteMemo: (id: string) => void
  toggleMemoPin: (id: string) => void
  setMemoSearchQuery: (query: string) => void
  setActiveItemId: (id: string | null) => void

  // --- Notification actions ---
  addNotification: (id: string) => void
  dismissNotification: (id: string) => void
}

export const useWorkStore = create<WorkState>()(
  persist(
    (set, _get) => ({
      // --- Data ---
      items: [],

      // --- UI state ---
      activeTab: 'todos',
      todoFilter: 'all',
      todoSort: 'newest',
      memoSearchQuery: '',
      activeItemId: null,

      // --- Notification state ---
      pendingNotifications: [],
      dismissedNotifications: [],

      // --- Tab ---
      setActiveTab: (tab) => set({ activeTab: tab }),

      // --- Todo actions ---
      addTodo: (title, content = '', priority = 'medium', dueAt) => {
        const now = Date.now()
        const resolvedDueAt = dueAt !== undefined ? dueAt : getDefaultDueDate().toISOString()
        const id = generateId('todo')
        const item: WorkItem = {
          id,
          type: 'todo',
          title: title.trim() || content.slice(0, 100),
          content,
          completed: false,
          dueAt: resolvedDueAt,
          priority,
          color: '',
          pinned: false,
          createdAt: now,
          updatedAt: now,
        }
        set((s) => ({ items: [item, ...s.items], activeItemId: id }))
      },

      toggleTodo: (id) =>
        set((s) => ({
          items: s.items.map((item) =>
            item.id === id
              ? { ...item, completed: !item.completed, updatedAt: Date.now() }
              : item
          ),
        })),

      updateTodo: (id, updates) =>
        set((s) => {
          // If dueAt is being changed, remove from dismissed so notification can fire again
          const shouldResetNotification =
            'dueAt' in updates && updates.dueAt !== undefined
          return {
            items: s.items.map((item) =>
              item.id === id ? { ...item, ...updates, updatedAt: Date.now() } : item
            ),
            dismissedNotifications: shouldResetNotification
              ? s.dismissedNotifications.filter((nid) => nid !== id)
              : s.dismissedNotifications,
            pendingNotifications: shouldResetNotification
              ? s.pendingNotifications.filter((nid) => nid !== id)
              : s.pendingNotifications,
          }
        }),

      deleteTodo: (id) =>
        set((s) => ({
          items: s.items.filter((item) => item.id !== id),
          activeItemId: s.activeItemId === id ? null : s.activeItemId,
          pendingNotifications: s.pendingNotifications.filter((nid) => nid !== id),
          dismissedNotifications: s.dismissedNotifications.filter((nid) => nid !== id),
        })),

      clearCompletedTodos: () =>
        set((s) => ({
          items: s.items.filter((item) => !(item.type === 'todo' && item.completed)),
        })),

      setTodoFilter: (filter) => set({ todoFilter: filter }),
      setTodoSort: (sort) => set({ todoSort: sort }),

      // --- Memo actions ---
      addMemo: (title = '', content = '', color = DEFAULT_MEMO_COLOR, dueAt = null) => {
        const now = Date.now()
        const id = generateId('memo')
        const item: WorkItem = {
          id,
          type: 'memo',
          title: title.trim() || 'Untitled',
          content,
          completed: false,
          dueAt: dueAt ?? null,
          priority: 'medium',
          color,
          pinned: false,
          createdAt: now,
          updatedAt: now,
        }
        set((s) => ({
          items: [item, ...s.items],
          activeItemId: id,
        }))
        return id
      },

      updateMemo: (id, updates) =>
        set((s) => ({
          items: s.items.map((item) =>
            item.id === id ? { ...item, ...updates, updatedAt: Date.now() } : item
          ),
        })),

      deleteMemo: (id) =>
        set((s) => ({
          items: s.items.filter((item) => item.id !== id),
          activeItemId: s.activeItemId === id ? null : s.activeItemId,
        })),

      toggleMemoPin: (id) =>
        set((s) => ({
          items: s.items.map((item) =>
            item.id === id
              ? { ...item, pinned: !item.pinned, updatedAt: Date.now() }
              : item
          ),
        })),

      setMemoSearchQuery: (query) => set({ memoSearchQuery: query }),
      setActiveItemId: (id) => set({ activeItemId: id }),

      // --- Notification actions ---
      addNotification: (id) =>
        set((s) => ({
          pendingNotifications: s.pendingNotifications.includes(id)
            ? s.pendingNotifications
            : [...s.pendingNotifications, id],
        })),

      dismissNotification: (id) =>
        set((s) => ({
          pendingNotifications: s.pendingNotifications.filter((nid) => nid !== id),
          dismissedNotifications: s.dismissedNotifications.includes(id)
            ? s.dismissedNotifications
            : [...s.dismissedNotifications, id],
        })),
    }),
    {
      name: 'orca-work-panel',
      partialize: (state) => ({
        items: state.items,
        todoFilter: state.todoFilter,
        todoSort: state.todoSort,
        dismissedNotifications: state.dismissedNotifications,
      }),
    }
  )
)

/** Selectors — derived todo counts (stable primitive values, no re-render loops). */
export function useTodoCounts() {
  const total = useWorkStore((s) => s.items.filter((i) => i.type === 'todo').length)
  const active = useWorkStore(
    (s) => s.items.filter((i) => i.type === 'todo' && !i.completed).length
  )
  const completed = total - active
  return { total, active, completed }
}

/** Selectors — derived data for the merged work items list (todos + memos). */
export function useMergedWorkItems() {
  const items = useWorkStore((s) => s.items)
  const filter = useWorkStore((s) => s.todoFilter)
  const sort = useWorkStore((s) => s.todoSort)

  // Filter: applies to todos only; memos always show
  const filtered = items.filter((item) => {
    if (item.type === 'memo') return true
    // todo
    if (filter === 'all') return true
    if (filter === 'active') return !item.completed
    if (filter === 'completed') return item.completed
    return true
  })

  const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 }

  // Sort: pinned memos first, then by sort criteria
  return [...filtered].sort((a, b) => {
    // Pinned memos always on top
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    if (sort === 'newest') return b.createdAt - a.createdAt
    if (sort === 'oldest') return a.createdAt - b.createdAt
    if (sort === 'priority') {
      // Memos have no priority, sort by createdAt
      if (a.type === 'memo' && b.type === 'memo') return b.createdAt - a.createdAt
      if (a.type === 'memo') return -1
      if (b.type === 'memo') return 1
      return (priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1)
    }
    return 0
  })
}
