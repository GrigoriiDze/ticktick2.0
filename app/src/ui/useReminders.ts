import { useEffect, useRef } from 'react'
import { buildSchedule } from '../domain/reminders'
import type { Task } from '../domain/types'
import { notificationsSupported, setupNotifications, syncSchedule } from '../platform/notifications'

interface Handlers {
  onOpen: (taskId: string) => void
  onDone: (task: Task) => void
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
      const plan = buildSchedule(current, { now: Date.now(), tz: Intl.DateTimeFormat().resolvedOptions().timeZone })
      void syncSchedule(plan).catch(() => {
        // уведомления не критичны для работы списка, повторим при следующем изменении
      })
    }
    const timer = window.setTimeout(run, 800)
    const hourly = window.setInterval(run, 3_600_000)
    const onVisible = () => document.visibilityState === 'visible' && run()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearTimeout(timer)
      window.clearInterval(hourly)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [tasks])
}
