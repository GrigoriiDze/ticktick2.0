import { INBOX_ID, type Task } from './types'

/** Календарный день в виде 'YYYY-MM-DD' */
export type DayKey = string

export interface DateCtx {
  /** Текущий момент в миллисекундах */
  now: number
  /** Часовой пояс устройства, например 'Europe/Moscow' */
  tz: string
}

const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function partsInZone(ms: number, tz: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(ms))
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value)
  return { y: get('year'), m: get('month'), d: get('day'), h: get('hour'), min: get('minute'), s: get('second') }
}

/** День, на который приходится момент времени в заданном часовом поясе */
export function dayKeyOf(ms: number, tz: string): DayKey {
  const p = partsInZone(ms, tz)
  return `${p.y}-${pad(p.m)}-${pad(p.d)}`
}

/** Сдвиг календарного дня. Считается по календарю, без часовых поясов, поэтому переходы на летнее время не мешают */
export function addDays(day: DayKey, n: number): DayKey {
  const m = DAY_RE.exec(day)
  if (!m) throw new Error(`Некорректный день: ${day}`)
  const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + n)
  const d = new Date(t)
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

/** Смещение часового пояса от UTC в миллисекундах на заданный момент */
function zoneOffset(ms: number, tz: string): number {
  const p = partsInZone(ms, tz)
  return Date.UTC(p.y, p.m - 1, p.d, p.h, p.min, p.s) - Math.floor(ms / 1000) * 1000
}

/** Местное время в часовом поясе переводит в UTC-момент. Два прохода, чтобы учесть смену смещения на границе перехода */
export function localToMs(day: DayKey, time: string, tz: string): number {
  const m = DAY_RE.exec(day)
  const t = /^(\d{2}):(\d{2})$/.exec(time)
  if (!m || !t) throw new Error(`Некорректные день или время: ${day} ${time}`)
  const guess = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(t[1]), Number(t[2]))
  const first = guess - zoneOffset(guess, tz)
  return guess - zoneOffset(first, tz)
}

export function timeOf(ms: number, tz: string): string {
  const p = partsInZone(ms, tz)
  return `${pad(p.h)}:${pad(p.min)}`
}

type Dated = Pick<Task, 'due' | 'start'>

function dayOfValue(v: number | string | null, tz: string): DayKey | null {
  if (v === null) return null
  return typeof v === 'string' ? v : dayKeyOf(v, tz)
}

export function dueDay(t: Dated, tz: string): DayKey | null {
  return dayOfValue(t.due, tz)
}

export function startDay(t: Dated, tz: string): DayKey | null {
  return dayOfValue(t.start, tz)
}

export function hasTime(t: Pick<Task, 'due'>): boolean {
  return typeof t.due === 'number'
}

export function today(ctx: DateCtx): DayKey {
  return dayKeyOf(ctx.now, ctx.tz)
}

/**
 * Просрочена: срок раньше сегодняшнего дня. Задача со временем сегодня остаётся «сегодняшней»
 * до конца суток, как в TickTick, но подсвечивается, когда время прошло
 */
export function isOverdue(t: Task, ctx: DateCtx): boolean {
  if (t.status !== 'open' || t.due === null) return false
  if (typeof t.due === 'number') return t.due < ctx.now
  return t.due < today(ctx)
}

export type SmartListId = 'today' | 'tomorrow' | 'week' | 'inbox' | 'all' | 'highPriority' | 'nodate' | 'done' | 'wontdo'

export const SMART_LISTS: Array<{ id: SmartListId; title: string }> = [
  { id: 'today', title: 'Сегодня' },
  { id: 'tomorrow', title: 'Завтра' },
  { id: 'week', title: 'Следующие 7 дней' },
  { id: 'inbox', title: 'Входящие' },
  { id: 'all', title: 'Все' },
  { id: 'highPriority', title: 'Высокий приоритет' },
  { id: 'nodate', title: 'Без срока' },
  { id: 'done', title: 'Выполнено' },
  { id: 'wontdo', title: 'Не будет выполнено' },
]

/**
 * Состав умных списков. Просроченные попадают в «Сегодня» и «7 дней», как в TickTick.
 * Задача с началом и сроком (на несколько дней) считается сегодняшней, пока идёт
 */
export function matchesSmartList(id: SmartListId, t: Task, ctx: DateCtx): boolean {
  if (id === 'done') return t.status === 'done'
  if (id === 'wontdo') return t.status === 'wontdo'
  if (t.status !== 'open') return false

  const now = today(ctx)
  const due = dueDay(t, ctx.tz)
  const start = startDay(t, ctx.tz)

  switch (id) {
    case 'inbox':
      return t.projectId === INBOX_ID
    case 'all':
      return true
    case 'highPriority':
      return t.priority >= 3
    case 'nodate':
      return due === null && start === null
    case 'today':
      if (due === null) return false
      return due <= now || (start !== null && start <= now)
    case 'tomorrow': {
      const tomorrow = addDays(now, 1)
      if (due === null) return false
      return due === tomorrow || (start !== null && start <= tomorrow && due >= tomorrow)
    }
    case 'week':
      return due !== null && due <= addDays(now, 6)
  }
}

/** Порядок в списке: сначала по сроку, затем по важности, затем как расставил пользователь */
export function compareTasks(a: Task, b: Task, ctx: DateCtx): number {
  // Закреплённые всегда сверху, свежее закрепление выше
  if ((a.pinnedAt !== null) !== (b.pinnedAt !== null)) return a.pinnedAt !== null ? -1 : 1
  if (a.pinnedAt !== null && b.pinnedAt !== null && a.pinnedAt !== b.pinnedAt) return b.pinnedAt - a.pinnedAt
  const da = dueSortKey(a, ctx.tz)
  const db = dueSortKey(b, ctx.tz)
  if (da !== db) return da - db
  if (a.priority !== b.priority) return b.priority - a.priority
  return a.sortOrder - b.sortOrder
}

/** Без срока в конец. Весь день считается началом дня, чтобы задачи со временем шли после него */
function dueSortKey(t: Task, tz: string): number {
  if (t.due === null) return Number.POSITIVE_INFINITY
  return typeof t.due === 'number' ? t.due : localToMs(t.due, '00:00', tz) - 1
}

const MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']

export function formatDay(day: DayKey, ctx: DateCtx): string {
  const now = today(ctx)
  if (day === now) return 'Сегодня'
  if (day === addDays(now, 1)) return 'Завтра'
  if (day === addDays(now, -1)) return 'Вчера'
  const m = DAY_RE.exec(day)!
  const label = `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]}`
  return m[1] === now.slice(0, 4) ? label : `${label} ${m[1]}`
}

const ROW_MONTHS = ['янв.', 'февр.', 'мар.', 'апр.', 'мая', 'июн.', 'июл.', 'авг.', 'сент.', 'окт.', 'нояб.', 'дек.']

/** Подпись дня справа в строке задачи: «Завтра», «27 окт.», а для другого года «01.01.2027» */
export function formatRowDay(day: DayKey, ctx: DateCtx): string {
  const now = today(ctx)
  if (day === now) return 'Сегодня'
  if (day === addDays(now, 1)) return 'Завтра'
  if (day === addDays(now, -1)) return 'Вчера'
  const m = DAY_RE.exec(day)!
  if (m[1] === now.slice(0, 4)) return `${Number(m[3])} ${ROW_MONTHS[Number(m[2]) - 1]}`
  return `${m[3]}.${m[2]}.${m[1]}`
}

/** Сегодняшняя задача со временем подписывается временем, остальные днём и временем */
export function formatDue(t: Task, ctx: DateCtx): { text: string; overdue: boolean; today: boolean } | null {
  const day = dueDay(t, ctx.tz)
  if (day === null) return null
  const isToday = day === today(ctx)
  const text = typeof t.due !== 'number' ? formatRowDay(day, ctx) : isToday ? timeOf(t.due, ctx.tz) : `${formatRowDay(day, ctx)} ${timeOf(t.due, ctx.tz)}`
  return { text, overdue: isOverdue(t, ctx), today: isToday }
}
