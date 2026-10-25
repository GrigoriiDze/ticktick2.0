import { addDays, dayKeyOf, formatDay, timeOf, type DateCtx, type DayKey } from './dates'
import { occurrencesBetween } from './repeat'
import type { Task } from './types'

export type CalView = 'list' | 'year' | 'month' | 'week' | 'days3' | 'day' | 'agenda' | 'weeks2'

export const CAL_VIEWS: Array<{ id: CalView; title: string }> = [
  { id: 'list', title: 'Список' },
  { id: 'year', title: 'Год' },
  { id: 'month', title: 'Месяц' },
  { id: 'week', title: 'Неделя' },
  { id: 'days3', title: '3 дня' },
  { id: 'day', title: 'День' },
]

/** Виды календаря на большом экране: как в десктопном TickTick */
export const DESKTOP_VIEWS: Array<{ id: CalView; title: string }> = [
  { id: 'year', title: 'Год' },
  { id: 'month', title: 'Месяц' },
  { id: 'week', title: 'Неделя' },
  { id: 'day', title: 'День' },
  { id: 'agenda', title: 'Повестка дня' },
  { id: 'days3', title: 'Многодневный' },
  { id: 'weeks2', title: 'Многонедельный' },
]

const MONTHS_NOM = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']
const WEEKDAYS_FULL = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота']
export const WEEKDAYS_SHORT = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс']

const parts = (day: DayKey) => day.split('-').map(Number) as [number, number, number]
const utc = (day: DayKey) => {
  const [y, m, d] = parts(day)
  return new Date(Date.UTC(y, m - 1, d))
}
const key = (d: Date): DayKey =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`

/** День недели: 0 это понедельник, 6 воскресенье */
export function weekdayIndex(day: DayKey): number {
  return (utc(day).getUTCDay() + 6) % 7
}

export function mondayOf(day: DayKey): DayKey {
  return addDays(day, -weekdayIndex(day))
}

export function weekDays(anchor: DayKey): DayKey[] {
  const monday = mondayOf(anchor)
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}

/** Недели месяца целиком, с хвостами соседних месяцев, неделя с понедельника */
export function monthGrid(anchor: DayKey): DayKey[][] {
  const [y, m] = parts(anchor)
  const first: DayKey = `${y}-${String(m).padStart(2, '0')}-01`
  const last = key(new Date(Date.UTC(y, m, 0)))
  const weeks: DayKey[][] = []
  for (let start = mondayOf(first); start <= last; start = addDays(start, 7)) weeks.push(weekDays(start))
  return weeks
}

export function sameMonth(a: DayKey, b: DayKey): boolean {
  return a.slice(0, 7) === b.slice(0, 7)
}

/** Сдвиг по экрану: месяц на месяц, неделя на неделю, день на день. При сдвиге месяца число подрезается: 31 января плюс месяц это 28 февраля */
export function shiftAnchor(view: CalView, anchor: DayKey, dir: 1 | -1): DayKey {
  if (view === 'day') return addDays(anchor, dir)
  if (view === 'days3') return addDays(anchor, 3 * dir)
  if (view === 'week' || view === 'list' || view === 'agenda') return addDays(anchor, 7 * dir)
  if (view === 'weeks2') return addDays(anchor, 14 * dir)
  const [y, m, d] = parts(anchor)
  const total = y * 12 + (m - 1) + (view === 'year' ? 12 * dir : dir)
  const ny = Math.floor(total / 12)
  const nm = total % 12
  const lastDay = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate()
  return `${ny}-${String(nm + 1).padStart(2, '0')}-${String(Math.min(d, lastDay)).padStart(2, '0')}`
}

/** Две недели подряд, первая с понедельника выбранной недели */
export function twoWeeks(anchor: DayKey): DayKey[][] {
  const monday = mondayOf(anchor)
  return [weekDays(monday), weekDays(addDays(monday, 7))]
}

/** Три дня подряд от выбранного */
export function threeDays(anchor: DayKey): DayKey[] {
  return [anchor, addDays(anchor, 1), addDays(anchor, 2)]
}

/** Двенадцать месяцев года: первые числа */
export function yearMonths(anchor: DayKey): DayKey[] {
  const y = parts(anchor)[0]
  return Array.from({ length: 12 }, (_, i) => `${y}-${String(i + 1).padStart(2, '0')}-01`)
}

/** Заголовок экрана календаря: мелкая строка сверху (месяц) и крупная */
export function calTitle(view: CalView, anchor: DayKey, ctx: DateCtx): { small: string | null; main: string } {
  const [y, m, d] = parts(anchor)
  if (view === 'month' || view === 'agenda' || view === 'weeks2') return { small: null, main: `${MONTHS_NOM[m - 1]} ${y}` }
  if (view === 'year') return { small: null, main: String(y) }
  if (view === 'week') return { small: null, main: rangeTitle('week', anchor) }
  if (view === 'days3') {
    const [first, , last] = threeDays(anchor)
    return { small: null, main: rangeOf(first, last) }
  }
  const small = MONTHS_NOM[m - 1].toLowerCase()
  const now = dayKeyOf(ctx.now, ctx.tz)
  return { small, main: anchor === now ? 'Сегодня' : `${d} ${MONTHS_GEN[m - 1]}` }
}

function rangeOf(from: DayKey, to: DayKey): string {
  const [, m1, d1] = parts(from)
  const [, m2, d2] = parts(to)
  const short = (mm: number) => MONTHS_GEN[mm - 1].slice(0, 3)
  return m1 === m2 ? `${d1}–${d2} ${short(m1)}` : `${d1} ${short(m1)} – ${d2} ${short(m2)}`
}

export function rangeTitle(view: CalView, anchor: DayKey): string {
  const [y, m, d] = parts(anchor)
  if (view === 'month') return `${MONTHS_NOM[m - 1]} ${y}`
  if (view === 'day' || view === 'list') return `${WEEKDAYS_FULL[utc(anchor).getUTCDay()]}, ${d} ${MONTHS_GEN[m - 1]}`
  if (view === 'year') return String(y)
  if (view === 'days3') return rangeOf(anchor, addDays(anchor, 2))
  const days = weekDays(anchor)
  return rangeOf(days[0], days[6])
}

/** Задачи, закрытые в этот день, для блока «Выполнено» */
export function doneOnDay(tasks: Task[], day: DayKey, ctx: DateCtx): Task[] {
  return tasks
    .filter((t) => t.status === 'done' && t.completedAt !== null && dayKeyOf(t.completedAt, ctx.tz) === day)
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
}

// ---------- События ----------

export interface CalEvent {
  task: Task
  day: DayKey
  /** Минуты от полуночи. null у задач на весь день */
  startMin: number | null
  endMin: number | null
  /** Повторение из будущего: самой записи ещё нет, показываем по правилу */
  virtual: boolean
}

const DEFAULT_MINUTES = 60

function minutesOf(ms: number, tz: string): number {
  const [h, m] = timeOf(ms, tz).split(':').map(Number)
  return h * 60 + m
}

/**
 * События открытых задач на период, разложенные по дням.
 * Задача на несколько дней видна в каждом дне, повторяющаяся показывается по правилу вперёд
 */
export function eventsByDay(tasks: Task[], ctx: DateCtx, from: DayKey, to: DayKey, includeDone = false): Map<DayKey, CalEvent[]> {
  const out = new Map<DayKey, CalEvent[]>()
  const push = (e: CalEvent) => {
    if (e.day < from || e.day > to) return
    const list = out.get(e.day)
    if (list) list.push(e)
    else out.set(e.day, [e])
  }

  for (const t of tasks) {
    if (t.due === null || (t.status !== 'open' && !(includeDone && t.status === 'done'))) continue

    const timed = typeof t.due === 'number'
    const dueDay = timed ? dayKeyOf(t.due as number, ctx.tz) : (t.due as string)
    const startDay = t.start === null ? dueDay : typeof t.start === 'number' ? dayKeyOf(t.start, ctx.tz) : t.start

    // Задача на несколько дней: во всех днях как задача на весь день
    if (startDay < dueDay) {
      for (let d = startDay; d <= dueDay; d = addDays(d, 1)) push({ task: t, day: d, startMin: null, endMin: null, virtual: false })
      continue
    }

    const make = (day: DayKey, due: number | string, virtual: boolean): CalEvent => {
      if (typeof due !== 'number') return { task: t, day, startMin: null, endMin: null, virtual }
      const dueMin = minutesOf(due, ctx.tz)
      const startMs = typeof t.start === 'number' && dayKeyOf(t.start, ctx.tz) === day && t.start < (t.due as number) ? t.start : null
      if (startMs !== null) return { task: t, day, startMin: minutesOf(startMs, ctx.tz), endMin: dueMin, virtual }
      return { task: t, day, startMin: dueMin, endMin: Math.min(dueMin + (t.duration && t.duration > 0 ? t.duration : DEFAULT_MINUTES), 1440), virtual }
    }

    push(make(dueDay, t.due, false))
    if (t.repeat && t.status === 'open') {
      for (const o of occurrencesBetween(t, ctx, from, to)) {
        if (o.day !== dueDay) push(make(o.day, o.due, true))
      }
    }
  }

  for (const list of out.values()) list.sort(compareEvents)
  return out
}

function compareEvents(a: CalEvent, b: CalEvent): number {
  if ((a.startMin === null) !== (b.startMin === null)) return a.startMin === null ? -1 : 1
  if (a.startMin !== b.startMin) return (a.startMin ?? 0) - (b.startMin ?? 0)
  return b.task.priority - a.task.priority
}

// ---------- Раскладка пересекающихся событий по колонкам ----------

export interface Placed {
  event: CalEvent
  col: number
  cols: number
}

/** Пересекающиеся события встают рядом, каждое получает свою колонку и общее число колонок в группе */
export function layoutColumns(events: CalEvent[]): Placed[] {
  const timed = events.filter((e) => e.startMin !== null && e.endMin !== null).sort(compareEvents)
  const placed: Placed[] = []
  let group: Array<{ event: CalEvent; col: number }> = []
  let groupEnd = -1

  const flush = () => {
    const cols = group.reduce((m, g) => Math.max(m, g.col + 1), 0)
    for (const g of group) placed.push({ event: g.event, col: g.col, cols })
    group = []
  }

  for (const e of timed) {
    if (group.length && e.startMin! >= groupEnd) {
      flush()
      groupEnd = -1
    }
    const taken = new Set(group.filter((g) => g.event.endMin! > e.startMin!).map((g) => g.col))
    let col = 0
    while (taken.has(col)) col++
    group.push({ event: e, col })
    groupEnd = Math.max(groupEnd, e.endMin!)
  }
  flush()
  return placed
}

// ---------- Тесные переезды между объектами ----------

const norm = (s: string | null) => (s ?? '').trim().toLowerCase().replace(/\s+/g, ' ')

/**
 * Встречи подряд по разным адресам с зазором меньше заданного. Время в пути считать нечем
 * (платные карты), поэтому просто подсвечиваем стыки, где ехать не успеть
 */
export function tightTransfers(events: CalEvent[], minGapMin = 30): Set<string> {
  const out = new Set<string>()
  const timed = events
    .filter((e) => e.startMin !== null && e.endMin !== null && norm(e.task.address) !== '')
    .sort((a, b) => a.startMin! - b.startMin!)
  for (let i = 0; i < timed.length - 1; i++) {
    const a = timed[i]
    const b = timed[i + 1]
    if (norm(a.task.address) === norm(b.task.address)) continue
    if (b.startMin! - a.endMin! < minGapMin) {
      out.add(a.task.id)
      out.add(b.task.id)
    }
  }
  return out
}

export function dayHeading(day: DayKey, ctx: DateCtx): string {
  return formatDay(day, ctx)
}
