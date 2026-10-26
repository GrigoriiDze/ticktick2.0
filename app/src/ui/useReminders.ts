import { useEffect, useRef } from 'react'
import { buildSchedule } from '../domain/reminders'
import type { Task } from '../domain/types'
import { notificationsSupported, setupNotifications, syncSchedule } from '../platform/notifications'

export interface Handlers {
  onOpen: (taskId: string) => void
  onDone: (task: Task) => void
}

/**
 * Дополняет задачи напоминанием по умолчанию, если у задачи задано точное время (typeof due === 'number'),
 * а список reminders пуст (и пользователь не отключил авто-напоминание в Настройках).
 */
export function withDefaultReminders(tasks: Task[]): Task[] {
  let autoTimed = true
  let autoAllDay = false
  try {
    autoTimed = localStorage.getItem('tt_default_reminder_none') !== '1'
    autoAllDay = localStorage.getItem('tt_default_reminder_allday') === '1'
  } catch {}

  if (!autoTimed && !autoAllDay) return tasks
  return tasks.map((t) => {
    if (t.due === null || Object.keys(t.reminders).length > 0) return t
    if (typeof t.due === 'number' && autoTimed) {
      return { ...t, reminders: { auto: { trigger: 'TRIGGER:PT0S' } } }
    }
    if (typeof t.due === 'string' && autoAllDay) {
      return { ...t, reminders: { auto: { trigger: 'TRIGGER:P0DT9H0M0S' } } }
    }
    return t
  })
}

/**
 * Держит уведомления в соответствии с задачами. Пересчёт при любом изменении списка,
 * при возвращении в приложение и раз в час, чтобы расписание не уходило слишком далеко в прошлое
 */
export function useReminders(tasks: Task[] | null, handlers: Handlers): void {
  const tasksRef = useRef<Task[] | null>(tasks)
  const handlersRef = useRef(handlers)
  tasksRef.current = tasks
  handlersRef.current = handlers

  // Нажатия на уведомления и кнопки
  useEffect(() => {
    if (!notificationsSupported()) return
    let stop = () => {}
    let cancelled = false
    void setupNotifications({
      onOpen: (id) => handlersRef.current.onOpen(id),
      onDone: (id) => {
        const task = tasksRef.current?.find((t) => t.id === id)
        if (task) handlersRef.current.onDone(task)
      },
    }).then((unsubscribe) => {
      if (cancelled) unsubscribe()
      else stop = unsubscribe
    })
    return () => {
      cancelled = true
      stop()
    }
  }, [])

  // Расписание
  useEffect(() => {
    if (!notificationsSupported() || tasks === null) return
    const run = () => {
      const current = tasksRef.current
      if (!current) return
      const enriched = withDefaultReminders(current)
      const plan = buildSchedule(enriched, { now: Date.now(), tz: Intl.DateTimeFormat().resolvedOptions().timeZone })
      void syncSchedule(plan).catch(() => {
        // уведомления не критичны для работы списка, повторим при следующем изменении
      })
    }
    const timer = window.setTimeout(run, 300)
    const hourly = window.setInterval(run, 3_600_000)
    const onVisible = () => document.visibilityState === 'visible' && run()
    const onSettingsChanged = () => run()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('tt-reminders-changed', onSettingsChanged)
    return () => {
      window.clearTimeout(timer)
      window.clearInterval(hourly)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('tt-reminders-changed', onSettingsChanged)
    }
  }, [tasks])
}
