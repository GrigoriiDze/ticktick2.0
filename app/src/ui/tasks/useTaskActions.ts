import { useCallback, useMemo } from 'react'
import type { DateCtx, DayKey } from '../../domain/dates'
import { localToMs } from '../../domain/dates'
import { nextOccurrence } from '../../domain/repeat'
import { orderBetween } from '../../domain/order'
import type { Task } from '../../domain/types'
import { copyOfTask } from '../../domain/duplicate'
import { playCompletionSound, triggerCompletionVibration } from '../../platform/audio'
import type { TasksRepo } from '../../data/tasks'
import type { RowActions } from '../TaskList'

export interface TaskActionsParams {
  tasksRepo: TasksRepo
  tasks: Task[] | null
  ctx: DateCtx
  offerUndo: (run: () => void) => void
  onOpenTask: (id: string) => void
  onOpenMenu: (t: Task) => void
  onReschedule: (t: Task) => void
}

export function useTaskActions({
  tasksRepo,
  tasks,
  ctx,
  offerUndo,
  onOpenTask,
  onOpenMenu,
  onReschedule,
}: TaskActionsParams) {
  /** Выполнение или возврат задачи в работу */
  const toggle = useCallback(
    (t: Task) => {
      if (t.status === 'open') {
        playCompletionSound()
        triggerCompletionVibration()
      }
      if (t.status === 'open' && t.repeat && t.due !== null) {
        const now = Date.now()
        const next = nextOccurrence(t, { now, tz: ctx.tz }, now)
        if (next) {
          void tasksRepo.completeRepeating(t, next, now)
          return
        }
      }
      const closing = t.status === 'open'
      void tasksRepo.complete(t.id, closing)
      if (closing) offerUndo(() => void tasksRepo.complete(t.id, false))
    },
    [tasksRepo, ctx, offerUndo],
  )

  /** «Не буду делать» */
  const skip = useCallback(
    (t: Task) => {
      const closing = t.status === 'open'
      void tasksRepo.setSkipped(t.id, closing)
      if (closing) offerUndo(() => void tasksRepo.setSkipped(t.id, false))
    },
    [tasksRepo, offerUndo],
  )

  /** Мягкое удаление в корзину */
  const remove = useCallback(
    (t: Task) => {
      void tasksRepo.softDelete(t.id)
      offerUndo(() => void tasksRepo.restore(t.id))
    },
    [tasksRepo, offerUndo],
  )

  /** Дублирование задачи */
  const duplicate = useCallback(
    async (t: Task) => {
      const last = (tasks ?? []).reduce((m, x) => Math.max(m, x.sortOrder), 0)
      const id = await tasksRepo.create({
        ...copyOfTask(t, { keepDate: true }),
        sortOrder: orderBetween(last || null, null),
      })
      offerUndo(() => void tasksRepo.softDelete(id))
    },
    [tasks, tasksRepo, offerUndo],
  )

  /** Закрепить / открепить */
  const pin = useCallback(
    (t: Task) => {
      void tasksRepo.update(t.id, { pinnedAt: t.pinnedAt !== null ? null : Date.now() })
    },
    [tasksRepo],
  )

  /** Сдвиг времени события в сетке календаря */
  const moveEvent = useCallback(
    (taskId: string, day: DayKey, minutes: number) => {
      const t = (tasks ?? []).find((x) => x.id === taskId)
      if (!t || typeof t.due !== 'number') return
      const startMs = typeof t.start === 'number' && t.start < t.due ? t.start : t.due
      const time = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
      const delta = localToMs(day, time, ctx.tz) - startMs
      if (delta === 0) return
      void tasksRepo.update(taskId, {
        due: t.due + delta,
        ...(typeof t.start === 'number' ? { start: t.start + delta } : {}),
      })
    },
    [tasks, tasksRepo, ctx.tz],
  )

  /** Стабильный мемоизированный объект действий для строк списка */
  const rowActions: RowActions = useMemo(
    () => ({
      toggle,
      open: onOpenTask,
      skip,
      remove,
      reschedule: onReschedule,
      menu: onOpenMenu,
      pin,
    }),
    [toggle, onOpenTask, skip, remove, onReschedule, onOpenMenu, pin],
  )

  return {
    toggle,
    skip,
    remove,
    duplicate,
    pin,
    moveEvent,
    rowActions,
  }
}
