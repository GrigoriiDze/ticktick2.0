import { dueDay, today, type DateCtx } from './dates'
import type { Task } from './types'

export type Quadrant = 'q1' | 'q2' | 'q3' | 'q4'

/** Четыре клетки матрицы Эйзенхауэра. Порядок как на экране: слева направо, сверху вниз */
export const QUADRANTS: Array<{ id: Quadrant; title: string; hint: string }> = [
  { id: 'q1', title: 'Срочно и важно', hint: 'Сделать сейчас' },
  { id: 'q2', title: 'Важно, не срочно', hint: 'Запланировать' },
  { id: 'q3', title: 'Срочно, не важно', hint: 'Передать или быстро закрыть' },
  { id: 'q4', title: 'Не срочно и не важно', hint: 'Отложить' },
]

/** Важное: средний и высокий приоритет */
export function isImportant(t: Task): boolean {
  return t.priority >= 3
}

/** Срочное: срок сегодня или уже прошёл */
export function isUrgent(t: Task, ctx: DateCtx): boolean {
  const due = dueDay(t, ctx.tz)
  return due !== null && due <= today(ctx)
}

export function quadrantOf(t: Task, ctx: DateCtx): Quadrant {
  const imp = isImportant(t)
  const urg = isUrgent(t, ctx)
  return imp ? (urg ? 'q1' : 'q2') : urg ? 'q3' : 'q4'
}

/** Открытые задачи верхнего уровня, разложенные по клеткам. Подзадачи и закрытые в матрицу не попадают */
export function buildMatrix(tasks: Task[], ctx: DateCtx): Record<Quadrant, Task[]> {
  const out: Record<Quadrant, Task[]> = { q1: [], q2: [], q3: [], q4: [] }
  for (const t of tasks) {
    if (t.status !== 'open' || t.parentId !== null) continue
    out[quadrantOf(t, ctx)].push(t)
  }
  for (const q of QUADRANTS) {
    out[q.id].sort((a, b) => b.priority - a.priority || (dueDay(a, ctx.tz) ?? '9999').localeCompare(dueDay(b, ctx.tz) ?? '9999') || a.sortOrder - b.sortOrder)
  }
  return out
}
