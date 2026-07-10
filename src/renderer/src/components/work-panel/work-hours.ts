/**
 * Work-hours calculation utility.
 * Ported from cc_history/lib/utils/work_hours.dart.
 *
 * Work time: Mon–Fri, 09:00–12:00 and 14:00–18:00.
 * Lunch break: 12:00–14:00 (not counted as work time).
 */

import { WORK_HOURS } from './types'

const {
  workStartHour,
  workStartMinute,
  morningEndHour,
  morningEndMinute,
  afternoonStartHour,
  afternoonStartMinute,
  workEndHour,
  workEndMinute,
} = WORK_HOURS

function toMinutes(hour: number, minute: number): number {
  return hour * 60 + minute
}

/** Is the given date a weekday (Mon–Fri)? */
export function isWorkday(date: Date): boolean {
  const day = date.getDay() // 0=Sun, 6=Sat
  return day >= 1 && day <= 5
}

/** Is the given time in the lunch break (12:00–14:00)? */
export function isLunchTime(date: Date): boolean {
  const m = toMinutes(date.getHours(), date.getMinutes())
  return (
    m >= toMinutes(morningEndHour, morningEndMinute) &&
    m < toMinutes(afternoonStartHour, afternoonStartMinute)
  )
}

/** Is the given time within work hours? */
export function isWorkTime(date: Date): boolean {
  if (!isWorkday(date)) return false
  if (isLunchTime(date)) return false
  const m = toMinutes(date.getHours(), date.getMinutes())
  return (
    m >= toMinutes(workStartHour, workStartMinute) &&
    m < toMinutes(workEndHour, workEndMinute)
  )
}

/**
 * Snap a datetime to the nearest valid work-time boundary.
 * - Before 09:00 → same day 09:00
 * - Lunch 12:00–14:00 → same day 14:00
 * - After 18:00 → next workday 09:00
 * - Weekend → next Monday 09:00
 */
export function normalizeToWorkTime(date: Date): Date {
  const d = new Date(date)

  // Weekend → advance to Monday
  while (!isWorkday(d)) {
    d.setDate(d.getDate() + 1)
  }

  const m = toMinutes(d.getHours(), d.getMinutes())
  const workStart = toMinutes(workStartHour, workStartMinute)
  const lunchStart = toMinutes(morningEndHour, morningEndMinute)
  const lunchEnd = toMinutes(afternoonStartHour, afternoonStartMinute)
  const workEnd = toMinutes(workEndHour, workEndMinute)

  if (m < workStart) {
    d.setHours(workStartHour, workStartMinute, 0, 0)
    return d
  }
  if (m >= lunchStart && m < lunchEnd) {
    d.setHours(afternoonStartHour, afternoonStartMinute, 0, 0)
    return d
  }
  if (m >= workEnd) {
    d.setDate(d.getDate() + 1)
    while (!isWorkday(d)) {
      d.setDate(d.getDate() + 1)
    }
    d.setHours(workStartHour, workStartMinute, 0, 0)
    return d
  }

  // Already in work time — zero out seconds
  d.setSeconds(0, 0)
  return d
}

function nextWorkdayStart(date: Date): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + 1)
  while (!isWorkday(d)) {
    d.setDate(d.getDate() + 1)
  }
  d.setHours(workStartHour, workStartMinute, 0, 0)
  return d
}

function previousWorkdayEnd(date: Date): Date {
  const d = new Date(date)
  d.setDate(d.getDate() - 1)
  while (!isWorkday(d)) {
    d.setDate(d.getDate() - 1)
  }
  d.setHours(workEndHour, workEndMinute, 0, 0)
  return d
}

/**
 * Add N work hours to a base time, skipping lunch, evenings, weekends.
 */
export function addWorkHours(base: Date, hours: number): Date {
  if (hours === 0) return normalizeToWorkTime(base)
  if (hours < 0) return subtractWorkHours(base, -hours)

  let current = normalizeToWorkTime(base)
  let remaining = hours

  while (remaining > 0) {
    const m = toMinutes(current.getHours(), current.getMinutes())
    const morningEnd = toMinutes(morningEndHour, morningEndMinute)
    const afternoonEnd = toMinutes(workEndHour, workEndMinute)

    if (m < morningEnd) {
      const minutesToLunch = morningEnd - m
      const hoursToLunch = minutesToLunch / 60
      if (remaining <= hoursToLunch) {
        current = new Date(current.getTime() + remaining * 3600000)
        remaining = 0
      } else {
        remaining = Math.round(remaining - hoursToLunch)
        current = new Date(current)
        current.setHours(afternoonStartHour, afternoonStartMinute, 0, 0)
      }
    } else if (m < afternoonEnd) {
      const minutesToEnd = afternoonEnd - m
      const hoursToEnd = minutesToEnd / 60
      if (remaining <= hoursToEnd) {
        current = new Date(current.getTime() + remaining * 3600000)
        remaining = 0
      } else {
        remaining = Math.round(remaining - hoursToEnd)
        current = nextWorkdayStart(current)
      }
    } else {
      current = nextWorkdayStart(current)
    }
  }

  return current
}

/**
 * Subtract N work hours from a base time, skipping lunch, evenings, weekends.
 */
export function subtractWorkHours(base: Date, hours: number): Date {
  if (hours === 0) return normalizeToWorkTime(base)
  if (hours < 0) return addWorkHours(base, -hours)

  let current = normalizeToWorkTime(base)
  let remaining = hours

  while (remaining > 0) {
    const m = toMinutes(current.getHours(), current.getMinutes())
    const workStart = toMinutes(workStartHour, workStartMinute)
    const afternoonStart = toMinutes(afternoonStartHour, afternoonStartMinute)
    const afternoonEnd = toMinutes(workEndHour, workEndMinute)

    if (m >= afternoonStart && m <= afternoonEnd) {
      const minutesFromStart = m - afternoonStart
      const hoursFromStart = minutesFromStart / 60
      if (hoursFromStart === 0) {
        current = new Date(current)
        current.setHours(morningEndHour, morningEndMinute, 0, 0)
      } else if (remaining <= hoursFromStart) {
        current = new Date(current.getTime() - remaining * 3600000)
        remaining = 0
      } else {
        remaining = Math.round(remaining - hoursFromStart)
        current = new Date(current)
        current.setHours(morningEndHour, morningEndMinute, 0, 0)
      }
    } else if (m > workStart && m < afternoonStart) {
      const minutesFromStart = m - workStart
      const hoursFromStart = minutesFromStart / 60
      if (remaining <= hoursFromStart) {
        current = new Date(current.getTime() - remaining * 3600000)
        remaining = 0
      } else {
        remaining = Math.round(remaining - hoursFromStart)
        current = previousWorkdayEnd(current)
      }
    } else if (m === workStart) {
      current = previousWorkdayEnd(current)
    } else if (m > afternoonEnd) {
      current = new Date(current)
      current.setHours(workEndHour, workEndMinute, 0, 0)
    } else {
      current = new Date(current)
      current.setHours(workStartHour, workStartMinute, 0, 0)
    }
  }

  return current
}

/**
 * Get default due date: this Friday at 17:00.
 * If today is Friday, returns today at 17:00.
 */
export function getDefaultDueDate(): Date {
  const now = new Date()
  const dayOfWeek = now.getDay() // 0=Sun, 5=Fri
  // Days until Friday: (5 - dayOfWeek + 7) % 7, but if already Friday keep 0
  const daysUntilFriday = dayOfWeek === 5 ? 0 : (5 - dayOfWeek + 7) % 7
  const friday = new Date(now)
  friday.setDate(friday.getDate() + daysUntilFriday)
  friday.setHours(17, 0, 0, 0)
  return friday
}

/**
 * Add N work days to a date (skips weekends, preserves time-of-day).
 * E.g. Friday + 1 work day = Monday same time.
 */
export function addWorkDays(base: Date, days: number): Date {
  if (days === 0) return new Date(base)
  if (days < 0) return subtractWorkDays(base, -days)

  const d = new Date(base)
  let added = 0
  while (added < days) {
    d.setDate(d.getDate() + 1)
    if (isWorkday(d)) {
      added++
    }
  }
  return d
}

/**
 * Subtract N work days from a date (skips weekends, preserves time-of-day).
 */
export function subtractWorkDays(base: Date, days: number): Date {
  if (days === 0) return new Date(base)
  if (days < 0) return addWorkDays(base, -days)

  const d = new Date(base)
  let subtracted = 0
  while (subtracted < days) {
    d.setDate(d.getDate() - 1)
    if (isWorkday(d)) {
      subtracted++
    }
  }
  return d
}

/**
 * Format a due date for display with color coding.
 * Returns { text, colorClass } where colorClass is a Tailwind class.
 */
export function formatDueDate(
  dueAt: string | null
): { text: string; colorClass: string } | null {
  if (!dueAt) return null

  const due = new Date(dueAt)
  const now = new Date()
  const diffMs = due.getTime() - now.getTime()
  const diffHours = diffMs / 3600000

  const formatDate = (d: Date): string => {
    const month = d.getMonth() + 1
    const day = d.getDate()
    const hours = d.getHours().toString().padStart(2, '0')
    const minutes = d.getMinutes().toString().padStart(2, '0')
    return `${month}/${day} ${hours}:${minutes}`
  }

  if (diffMs < 0) {
    return { text: formatDate(due), colorClass: 'text-red-500' }
  }
  if (diffHours < 24) {
    return { text: formatDate(due), colorClass: 'text-orange-500' }
  }
  return { text: formatDate(due), colorClass: 'text-blue-500' }
}
