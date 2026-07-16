/**
 * Todo due-date notification monitor.
 *
 * Runs a singleton interval that checks every 30 seconds for todos
 * approaching their due date and dispatches system notifications via
 * Electron's Notification IPC. Repeats every 5 minutes until the todo
 * is completed or falls outside the notification window (30 min before
 * due → 30 min after overdue).
 *
 * Designed to be started from the App root via startTodoNotificationMonitor()
 * so monitoring runs regardless of which sidebar view is active. Uses
 * useWorkStore.getState() for imperative store access — no React hooks
 * are called, so this adds zero hook calls to the App component and is
 * safe across Vite HMR boundary changes.
 */

import { useWorkStore } from './use-work-store'

const CHECK_INTERVAL_MS = 30_000 // Check every 30 seconds
const NOTIFY_THRESHOLD_MS = 30 * 60 * 1000 // Notify 30 minutes before due
const OVERDUE_WINDOW_MS = 30 * 60 * 1000 // Keep notifying until 30 min overdue
const REPEAT_INTERVAL_MS = 5 * 60 * 1000 // Re-notify every 5 minutes

let monitorStarted = false
// Tracks last notification timestamp per todo ID for repeat logic
const lastNotifiedAt = new Map<string, number>()

function dispatchNotification(args: Record<string, unknown>): void {
  const api = (
    window as unknown as {
      api?: {
        notifications?: {
          dispatch: (a: Record<string, unknown>) => Promise<unknown>
        }
      }
    }
  ).api
  api?.notifications?.dispatch(args).catch(() => {
    // Silent fail — notification delivery is best-effort
  })
}

function check(): void {
  const now = Date.now()
  const { items } = useWorkStore.getState()
  const activeIds = new Set<string>()

  for (const item of items) {
    if (item.type !== 'todo') {
      continue
    }
    if (item.completed) {
      continue
    }
    if (!item.dueAt) {
      continue
    }

    const dueTime = new Date(item.dueAt).getTime()
    const timeLeft = dueTime - now

    // In the notification window: 30 min before due → 30 min after overdue
    if (timeLeft <= NOTIFY_THRESHOLD_MS && timeLeft > -OVERDUE_WINDOW_MS) {
      activeIds.add(item.id)

      const lastSent = lastNotifiedAt.get(item.id) ?? 0
      const elapsed = now - lastSent

      // Notify on first entry, then repeat every REPEAT_INTERVAL_MS
      if (elapsed >= REPEAT_INTERVAL_MS) {
        const overdue = timeLeft < 0
        const timeLabel = overdue
          ? `Overdue by ${formatTimeDiff(Math.abs(timeLeft))}`
          : `Due in ${formatTimeDiff(timeLeft)}`

        dispatchNotification({
          source: 'todo-due',
          notificationId: item.id,
          title: overdue ? '⚠️ Todo Overdue' : '🔔 Todo Due Soon',
          body: `${item.title}\n${timeLabel}`
        })

        lastNotifiedAt.set(item.id, now)
      }
    }
  }

  // Clean up entries for items no longer in the notification window
  for (const id of lastNotifiedAt.keys()) {
    if (!activeIds.has(id)) {
      lastNotifiedAt.delete(id)
    }
  }
}

/**
 * Start the singleton todo notification monitor.
 * Safe to call multiple times — subsequent calls are no-ops.
 * No React hooks are called; uses Zustand store imperatively.
 */
export function startTodoNotificationMonitor(): void {
  if (monitorStarted) {
    return
  }
  monitorStarted = true
  check()
  setInterval(check, CHECK_INTERVAL_MS)
}

/**
 * @deprecated Use startTodoNotificationMonitor() at the App root instead.
 * Kept for backward compatibility — delegates to the singleton monitor.
 */
export function useTodoNotifications(): void {
  startTodoNotificationMonitor()
}

function formatTimeDiff(ms: number): string {
  const totalMinutes = Math.round(ms / 60_000)
  if (totalMinutes < 60) {
    return `${totalMinutes} min`
  }
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
}
