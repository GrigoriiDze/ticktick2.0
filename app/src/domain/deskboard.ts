import { weekdayIndex } from './calendar'
import { addDays, dayKeyOf, today, type DateCtx, type DayKey } from './dates'
import type { Project, Task } from './types'

/** Подсекция колонки: «Просрочено», «четверг, Сегодня» */
export interface BoardSection {
  key: string
  title: string
  tasks: Task[]
}

/** Колонка доски на большом экране. day: на какой день добавлять задачу кнопкой «+» */
export interface DeskColumn {
  key: string
  title: string
  count: number
  projectId: string | null
  day: DayKey | null
  sections: BoardSection[]
}

const WEEKDAYS_LOWER = ['понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота', 'воскресенье']
const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']

function dayOf(t: Task, ctx: DateCtx): DayKey | null {
  if (t.due === null) return null
  return typeof t.due === 'number' ? dayKeyOf(t.due, ctx.tz) : t.due
}

/** «четверг, Сегодня», «пятница, Завтра», «суббота, 24 октября», как в заголовках колонок TickTick */
export function deskDayTitle(day: DayKey, ctx: DateCtx): string {
  const now = today(ctx)
  const wd = WEEKDAYS_LOWER[weekdayIndex(day)]
  if (day === now) return `${wd}, Сегодня`
  if (day === addDays(now, 1)) return `${wd}, Завтра`
  if (day === addDays(now, -1)) return `${wd}, Вчера`
  const [, m, d] = day.split('-').map(Number)
  return `${wd}, ${d} ${MONTHS_GEN[m - 1]}`
}

/** Просроченные отдельно, остальные по дням. Порядок задач внутри дня сохраняется */
function byDay(tasks: Task[], ctx: DateCtx): BoardSection[] {
  const now = today(ctx)
  const map = new Map<string, BoardSection>()
  for (const t of tasks) {
    const day = dayOf(t, ctx)
    const key = day === null ? 'none' : day < now ? 'overdue' : day
    const title = key === 'none' ? 'Без даты' : key === 'overdue' ? 'Просрочено' : deskDayTitle(key, ctx)
    const s = map.get(key)
    if (s) s.tasks.push(t)
    else map.set(key, { key, title, tasks: [t] })
  }
  const rank = (k: string) => (k === 'overdue' ? '0' : k === 'none' ? '9' : '1' + k)
  return [...map.values()].sort((a, b) => (rank(a.key) < rank(b.key) ? -1 : 1))
}

/** «Сегодня» на большом экране: колонка на каждый список, внутри «Просрочено» и сегодняшние */
export function boardByProject(tasks: Task[], projects: Project[], ctx: DateCtx): DeskColumn[] {
  const order = new Map(projects.map((p, i) => [p.id, p.isInbox ? -1 : i]))
  const lists = new Map<string, Task[]>()
  for (const t of tasks) lists.set(t.projectId, [...(lists.get(t.projectId) ?? []), t])
  return [...lists.entries()]
    .sort(([a], [b]) => (order.get(a) ?? 1e9) - (order.get(b) ?? 1e9))
    .map(([id, list]) => ({
      key: id,
      title: projects.find((p) => p.id === id)?.name ?? 'Список',
      count: list.length,
      projectId: id,
      day: today(ctx),
      sections: byDay(list, ctx),
    }))
}

/** «Следующие 7 дней» на большом экране: колонка «Просрочено» и по колонке на каждый день с задачами */
export function boardByDay(tasks: Task[], ctx: DateCtx): DeskColumn[] {
  return byDay(tasks, ctx).map((s) => ({
    key: s.key,
    title: s.title,
    count: s.tasks.length,
    projectId: null,
    day: s.key === 'overdue' || s.key === 'none' ? null : s.key,
    sections: [{ key: s.key, title: '', tasks: s.tasks }],
  }))
}

/** «Все» на большом экране: один список с секциями по дням, задачи без срока в конце */
export function sectionsByDay(tasks: Task[], ctx: DateCtx): BoardSection[] {
  return byDay(tasks, ctx)
}
