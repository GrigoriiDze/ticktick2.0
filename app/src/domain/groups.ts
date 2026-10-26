import { WEEKDAYS_SHORT, weekdayIndex } from './calendar'
import { addDays, dayKeyOf, formatDay, today, type DateCtx, type DayKey, type SmartListId } from './dates'
import type { Task } from './types'

export interface Group {
  key: string
  title: string
  tasks: Task[]
}

function dayOf(t: Task, ctx: DateCtx): DayKey | null {
  if (t.due === null) return null
  return typeof t.due === 'number' ? dayKeyOf(t.due, ctx.tz) : t.due
}

/** «Ср, 22 окт»: день недели с заглавной и дата */
function dayTitle(day: DayKey, ctx: DateCtx): string {
  const label = formatDay(day, ctx)
  if (label === 'Сегодня' || label === 'Завтра' || label === 'Вчера') return label
  const wd = WEEKDAYS_SHORT[weekdayIndex(day)]
  return `${wd.charAt(0).toUpperCase()}${wd.slice(1)}, ${label}`
}

/**
 * Разбивка списка на секции, как в привычных приложениях. Секции нужны только там, где в списке
 * смешаны разные дни: «Сегодня» (просроченные и сегодняшние) и «Следующие 7 дней» (по дням).
 * Порядок задач внутри секции сохраняется. Если секция получается одна, заголовков не нужно
 */
export function groupTasks(listId: SmartListId, tasks: Task[], ctx: DateCtx): Group[] | null {
  if (listId !== 'today' && listId !== 'week') return null
  const now = today(ctx)
  const groups = new Map<string, Group>()
  const put = (key: string, title: string, t: Task) => {
    const g = groups.get(key)
    if (g) g.tasks.push(t)
    else groups.set(key, { key, title, tasks: [t] })
  }

  for (const t of tasks) {
    const day = dayOf(t, ctx)
    if (day === null) continue
    if (day < now) put('overdue', 'Просрочено', t)
    else if (listId === 'today') put('today', 'Сегодня', t)
    else put(`day:${day}`, dayTitle(day, ctx), t)
  }

  const list = [...groups.values()].sort((a, b) => {
    if (a.key === 'overdue') return -1
    if (b.key === 'overdue') return 1
    return a.key < b.key ? -1 : 1
  })
  return list.length >= 2 ? list : null
}

/** Как группировать задачи в списке: по сроку, важности или метке. Выбор сохраняется на устройстве */
export type GroupMode = 'none' | 'date' | 'priority' | 'tag' | 'created'

export const GROUP_MODES: Array<{ id: GroupMode; title: string }> = [
  { id: 'none', title: 'Без группировки' },
  { id: 'date', title: 'По сроку' },
  { id: 'priority', title: 'По важности' },
  { id: 'tag', title: 'По метке' },
  { id: 'created', title: 'По времени создания' },
]

const PRIORITY_TITLES: Array<[number, string]> = [
  [5, 'Высокий приоритет'],
  [3, 'Средний приоритет'],
  [1, 'Низкий приоритет'],
  [0, 'Без приоритета'],
]

/** Секции по выбранному признаку. Порядок задач внутри секции сохраняется. Одна секция: заголовок не нужен */
export function groupByMode(mode: GroupMode, tasks: Task[], ctx: DateCtx): Group[] | null {
  if (mode === 'none') return null
  const groups = new Map<string, Group>()
  const put = (key: string, title: string, t: Task) => {
    const g = groups.get(key)
    if (g) g.tasks.push(t)
    else groups.set(key, { key, title, tasks: [t] })
  }
  const now = today(ctx)
  for (const t of tasks) {
    if (mode === 'priority') {
      const p = PRIORITY_TITLES.find(([v]) => v === t.priority) ?? PRIORITY_TITLES[3]
      put(`p:${p[0]}`, p[1], t)
    } else if (mode === 'tag') {
      const tag = t.tags[0]
      put(tag ? `t:${tag}` : 'none', tag ? `#${tag}` : 'Без метки', t)
    } else if (mode === 'created') {
      const day = t.createdAt ? dayKeyOf(t.createdAt.toMillis(), ctx.tz) : '0000'
      put(`c:${day}`, dayTitle(day, ctx), t)
    } else {
      const day = dayOf(t, ctx)
      if (day === null) put('9none', 'Без срока', t)
      else if (day < now) put('0overdue', 'Просрочено', t)
      else if (day === now) put('1today', 'Сегодня', t)
      else if (day === addDays(now, 1)) put('2tomorrow', 'Завтра', t)
      else if (day <= addDays(now, 7)) put(`3${day}`, dayTitle(day, ctx), t)
      else put('8later', 'Позже', t)
    }
  }
  const order = (k: string) => {
    if (mode === 'priority') return PRIORITY_TITLES.findIndex(([v]) => `p:${v}` === k)
    if (mode === 'tag') return k === 'none' ? '~' : k
    if (mode === 'created') return k // c:YYYY-MM-DD
    return k
  }
  const list = [...groups.values()].sort((a, b) => {
    if (mode === 'created') return a.key < b.key ? 1 : -1
    return order(a.key) < order(b.key) ? -1 : order(a.key) > order(b.key) ? 1 : 0
  })
  return list.length >= 2 ? list : null
}

/** «Выполнено»: по дням, когда закрыли, свежие сверху */
export function groupDone(tasks: Task[], ctx: DateCtx): Group[] | null {
  const groups = new Map<string, Group>()
  for (const t of tasks) {
    const day = t.completedAt === null ? null : dayKeyOf(t.completedAt, ctx.tz)
    const key = day ?? '0000'
    const g = groups.get(key)
    if (g) g.tasks.push(t)
    else groups.set(key, { key, title: day ? dayTitle(day, ctx) : 'Без даты', tasks: [t] })
  }
  const list = [...groups.values()].sort((a, b) => (a.key < b.key ? 1 : -1))
  return list.length >= 2 ? list : null
}
