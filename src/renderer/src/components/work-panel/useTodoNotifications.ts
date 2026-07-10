/**
 * Hook that monitors todos for upcoming due dates and triggers system notifications.
 * Checks every 30 seconds. Notifies when a todo is due within 30 minutes.
 * Uses the app's existing notification IPC (notifications:dispatch) which
 * routes through Electron's native Notification class.
 */

import { useEffect, useRef } from 'react'
import { useWorkStore } from './use-work-store'

const CHECK_INTERVAL_MS = 30_000 // Check every 30 seconds
const NOTIFY_THRESHOLD_MS = 30 * 60 * 1000 // Notify 30 minutes before due
const OVERDUE_WINDOW_MS = 5 * 60 * 1000 // Also notify if overdue within last 5 min

function dispatchNotification(args: Record<string, unknown>): void {
  const api = (window as unknown as { api?: { notifications?: { dispatch: (a: Record<string, unknown>) => Promise<unknown> } } }).api
  api?.notifications?.dispatch(args).catch(() => {
    // Silent fail — notification delivery is best-effort
  })
}

export function useTodoNotifications(): void {
  const items = useWorkStore((s) => s.items)
  const dismissedNotifications = useWorkStore((s) => s.dismissedNotifications)
  const addNotification = useWorkStore((s) => s.addNotification)

  const itemsRef = useRef(items)
  const dismissedRef = useRef(dismissedNotifications)
  const addNotificationRef = useRef(addNotification)

  useEffect(() => {
    itemsRef.current = items
    dismissedRef.current = dismissedNotifications
    addNotificationRef.current = addNotification
  })

  useEffect(() => {
    function check() {
      const now = Date.now()
      const allItems = itemsRef.current
      const dismissed = new Set(dismissedRef.current)

      for (const item of allItems) {
        if (item.type !== 'todo') continue
        if (item.completed) continue
        if (!item.dueAt) continue
        if (dismissed.has(item.id)) continue

        const dueTime = new Date(item.dueAt).getTime()
        const timeLeft = dueTime - now

        if (timeLeft <= NOTIFY_THRESHOLD_MS && timeLeft > -OVERDUE_WINDOW_MS) {
          const overdue = timeLeft < 0
          const timeLabel = overdue
            ? `Overdue by ${formatTimeDiff(Math.abs(timeLeft))}`
            : `Due in ${formatTimeDiff(timeLeft)}`

          dispatchNotification({
            source: 'todo-due',
            notificationId: item.id,
            title: overdue ? '⚠️ Todo Overdue' : '🔔 Todo Due Soon',
            body: `${item.title}\n${timeLabel}`,
          })

          addNotificationRef.current(item.id)
        }
      }
    }

    check()
    const timer = setInterval(check, CHECK_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [])
}

function formatTimeDiff(ms: number): string {
  const totalMinutes = Math.round(ms / 60_000)
  if (totalMinutes < 60) return `${totalMinutes} min`
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
}
