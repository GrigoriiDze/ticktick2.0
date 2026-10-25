import * as rrulePkg from 'rrule'
import type { Options } from 'rrule'
import { addDays, dayKeyOf, formatDay, localToMs, timeOf, today, type DateCtx, type DayKey } from './dates'
import type { Task } from './types'
import { plural } from './sites'

// В сборке (Vite) именованный экспорт есть, в Node (скрипты импорта) библиотека отдаётся целиком как default
const RRule: typeof rrulePkg.RRule = (rrulePkg as unknown as { default?: typeof rrulePkg }).default?.RRule ?? rrulePkg.RRule

/**
 * Повторяющиеся задачи. Правило хранится строкой RRULE, как в TickTick и в календарях.
 * Даты считаем «по стене»: день и время переводятся в условный UTC, правило применяется к ним,
 * результат переводится обратно в часовой пояс задачи. Так 9:00 остаётся 9:00 и после перехода на летнее время
 */

export interface NextOccurrence {
  due: number | string
  start: number | string | null
  /** Правило для следующего цикла. Отличается от исходного, только если в нём есть COUNT */
  rule: string
}

const DAY_MS = 86_400_000

function stripPrefix(rule: string): string {
  return rule.replace(/^RRULE:/i, '').trim()
}

interface Parsed {
  options: Partial<Options>
  count: number | null
}

/** Разбор правила. COUNT вынимаем отдельно: он считается от первого цикла, а мы сдвигаем начало при каждом выполнении */
function parse(rule: string): Parsed | null {
  const text = stripPrefix(rule)
  if (!/FREQ=/i.test(text)) return null
  try {
    const options = RRule.parseString(text)
    const count = options.count ?? null
    delete options.count
    // UNTIL в виде даты без времени включает весь этот день
    const until = /UNTIL=(\d{4})(\d{2})(\d{2})(?!T|\d)/i.exec(text)
    if (until) options.until = new Date(Date.UTC(Number(until[1]), Number(until[2]) - 1, Number(until[3]), 23, 59, 59))
    return { options, count }
  } catch {
    return null
  }
}

export function isValidRule(rule: string): boolean {
  return parse(rule) !== null
}

function wallToFake(day: DayKey, time: string): Date {
  const [y, m, d] = day.split('-').map(Number)
  const [h, min] = time.split(':').map(Number)
  return new Date(Date.UTC(y, m - 1, d, h, min))
}

function fakeToDay(d: Date): DayKey {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

function fakeToTime(d: Date): string {
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
}

function dayDiff(from: DayKey, to: DayKey): number {
  return Math.round((wallToFake(to, '00:00').getTime() - wallToFake(from, '00:00').getTime()) / DAY_MS)
}

type RepeatFields = Pick<Task, 'due' | 'start' | 'repeat' | 'repeatFrom' | 'exDates' | 'status'>

/**
 * Следующая дата повторяющейся задачи после выполнения. Возвращает null, если цикл закончился
 * (прошёл UNTIL, исчерпан COUNT) или у задачи нет срока или правила.
 *
 * Режим «от срока»: следующее вхождение после текущего срока. Если задачу давно не закрывали,
 * пропущенные дни не копятся: берём ближайшее вхождение не раньше сегодняшнего дня.
 * Режим «от выполнения»: отсчёт от дня выполнения, время суток остаётся прежним
 */
export function nextOccurrence(task: RepeatFields, ctx: DateCtx, completedAt: number): NextOccurrence | null {
  if (!task.repeat || task.due === null) return null
  const parsed = parse(task.repeat)
  if (!parsed) return null

  const allDay = typeof task.due === 'string'
  const dueDay: DayKey = allDay ? (task.due as string) : dayKeyOf(task.due as number, ctx.tz)
  const time = allDay ? '00:00' : timeOf(task.due as number, ctx.tz)

  if (parsed.count !== null && parsed.count <= 1) return null

  const baseDay: DayKey = task.repeatFrom === 'done' ? dayKeyOf(completedAt, ctx.tz) : dueDay
  const dtstart = wallToFake(baseDay, time)
  const rule = new RRule({ ...parsed.options, dtstart })
  const excluded = new Set(task.exDates)

  // Не раньше сегодняшнего дня, чтобы давно просроченная задача не выдавала цепочку прошлых дат
  const floor = task.repeatFrom === 'done' ? null : wallToFake(today(ctx), '00:00')
  let cursor: Date = dtstart
  if (floor && floor.getTime() - 1 > dtstart.getTime()) cursor = new Date(floor.getTime() - 1)

  let next: Date | null = null
  for (let i = 0; i < 400; i++) {
    const candidate = rule.after(cursor, false)
    if (!candidate) return null
    if (!excluded.has(fakeToDay(candidate))) {
      next = candidate
      break
    }
    cursor = candidate
  }
  if (!next) return null

  const nextDay = fakeToDay(next)
  const due: number | string = allDay ? nextDay : localToMs(nextDay, fakeToTime(next), ctx.tz)

  // Задача на несколько дней сохраняет длительность
  let start: number | string | null = null
  if (task.start !== null) {
    if (typeof task.start === 'string' && typeof task.due === 'string') start = addDays(nextDay, -dayDiff(task.start, task.due))
    else if (typeof task.start === 'number' && typeof task.due === 'number') start = (due as number) - (task.due - task.start)
  }

  const nextRule = parsed.count !== null ? withCount(task.repeat, parsed.count - 1) : task.repeat
  return { due, start, rule: nextRule }
}

function withCount(rule: string, count: number): string {
  return /COUNT=\d+/i.test(rule) ? rule.replace(/COUNT=\d+/i, `COUNT=${count}`) : rule
}

// ---------- Построение и описание правил для экрана ----------

export type Freq = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
export const WEEKDAYS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as const
export type Weekday = (typeof WEEKDAYS)[number]
const WEEKDAY_SHORT: Record<Weekday, string> = { MO: 'пн', TU: 'вт', WE: 'ср', TH: 'чт', FR: 'пт', SA: 'сб', SU: 'вс' }
export const WEEKDAY_LABEL = WEEKDAY_SHORT

export interface RuleParts {
  freq: Freq
  interval: number
  byday: Weekday[]
  bymonthday: number | null
}

export function buildRule(p: RuleParts): string {
  const parts = [`FREQ=${p.freq}`]
  if (p.interval > 1) parts.push(`INTERVAL=${p.interval}`)
  if (p.freq === 'WEEKLY' && p.byday.length) parts.push(`BYDAY=${WEEKDAYS.filter((d) => p.byday.includes(d)).join(',')}`)
  if (p.freq === 'MONTHLY' && p.bymonthday) parts.push(`BYMONTHDAY=${p.bymonthday}`)
  return `RRULE:${parts.join(';')}`
}

/** Правило в части, понятные экрану. null, если правило сложнее, чем умеет редактор */
export function ruleParts(rule: string): RuleParts | null {
  const text = stripPrefix(rule)
  if (!/FREQ=/i.test(text)) return null
  const get = (k: string) => new RegExp(`(?:^|;)${k}=([^;]*)`, 'i').exec(text)?.[1]
  const freq = get('FREQ')?.toUpperCase() as Freq | undefined
  if (!freq || !['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].includes(freq)) return null
  const unsupported = ['BYSETPOS', 'BYWEEKNO', 'BYYEARDAY', 'BYHOUR', 'BYMINUTE', 'BYMONTH=']
  if (unsupported.some((k) => text.toUpperCase().includes(k))) return null
  const byday = (get('BYDAY')?.toUpperCase().split(',') ?? []).filter((d): d is Weekday => (WEEKDAYS as readonly string[]).includes(d))
  const bmd = get('BYMONTHDAY')
  return { freq, interval: Number(get('INTERVAL') ?? 1) || 1, byday, bymonthday: bmd && /^\d+$/.test(bmd) ? Number(bmd) : null }
}

/** Человеческое описание правила. UNTIL добавляется в конец */
export function describeRule(rule: string, ctx: DateCtx): string {
  const p = ruleParts(rule)
  if (!p) return 'Свой повтор'
  const n = p.interval
  let text: string
  switch (p.freq) {
    case 'DAILY':
      text = n === 1 ? 'Каждый день' : `Каждые ${n} ${plural(n, ['день', 'дня', 'дней'])}`
      break
    case 'WEEKLY': {
      const set = new Set(p.byday)
      const workdays = set.size === 5 && WEEKDAYS.slice(0, 5).every((d) => set.has(d))
      const weekend = set.size === 2 && set.has('SA') && set.has('SU')
      if (n === 1 && set.size === 7) text = 'Каждый день'
      else if (n === 1 && workdays) text = 'По будням'
      else if (n === 1 && weekend) text = 'По выходным'
      else {
        const base = n === 1 ? 'Каждую неделю' : `Каждые ${n} ${plural(n, ['неделю', 'недели', 'недель'])}`
        text = set.size ? `${base} по ${WEEKDAYS.filter((d) => set.has(d)).map((d) => WEEKDAY_SHORT[d]).join(', ')}` : base
      }
      break
    }
    case 'MONTHLY': {
      const base = n === 1 ? 'Каждый месяц' : n === 3 ? 'Раз в квартал' : `Каждые ${n} ${plural(n, ['месяц', 'месяца', 'месяцев'])}`
      text = p.bymonthday ? `${base}, ${p.bymonthday} числа` : base
      break
    }
    case 'YEARLY':
      text = n === 1 ? 'Каждый год' : `Каждые ${n} ${plural(n, ['год', 'года', 'лет'])}`
      break
  }
  const until = /UNTIL=(\d{4})(\d{2})(\d{2})/i.exec(rule)
  if (until) text += ` до ${formatDay(`${until[1]}-${until[2]}-${until[3]}`, ctx)}`
  return text
}

/**
 * Все вхождения повторяющейся задачи в периоде, для календаря. Считаются по правилу от текущего срока вперёд,
 * исключённые дни пропускаются. Не больше 400 за раз
 */
export function occurrencesBetween(
  task: Pick<Task, 'due' | 'repeat' | 'exDates'>,
  ctx: DateCtx,
  fromDay: DayKey,
  toDay: DayKey,
): Array<{ day: DayKey; due: number | string }> {
  if (!task.repeat || task.due === null) return []
  const parsed = parse(task.repeat)
  if (!parsed) return []

  const allDay = typeof task.due === 'string'
  const dueDay: DayKey = allDay ? (task.due as string) : dayKeyOf(task.due as number, ctx.tz)
  const time = allDay ? '00:00' : timeOf(task.due as number, ctx.tz)
  const rule = new RRule({ ...parsed.options, ...(parsed.count !== null ? { count: parsed.count } : {}), dtstart: wallToFake(dueDay, time) })
  const excluded = new Set(task.exDates)

  const found = rule.between(wallToFake(fromDay, '00:00'), wallToFake(toDay, '23:59'), true).slice(0, 400)
  const out: Array<{ day: DayKey; due: number | string }> = []
  for (const d of found) {
    const day = fakeToDay(d)
    if (excluded.has(day)) continue
    out.push({ day, due: allDay ? day : localToMs(day, fakeToTime(d), ctx.tz) })
  }
  return out
}

/**
 * Дни, на которые приходится правило, начиная со startDay. Для привычек: в какие дни их надо делать.
 * Не больше 6000 дней за раз
 */
export function daysByRule(rule: string, startDay: DayKey, fromDay: DayKey, toDay: DayKey): DayKey[] {
  const parsed = parse(rule)
  if (!parsed) return []
  const lo = fromDay < startDay ? startDay : fromDay
  if (lo > toDay) return []
  const r = new RRule({ ...parsed.options, ...(parsed.count !== null ? { count: parsed.count } : {}), dtstart: wallToFake(startDay, '00:00') })
  return r.between(wallToFake(lo, '00:00'), wallToFake(toDay, '23:59'), true).slice(0, 6000).map(fakeToDay)
}

export interface RepeatPreset {
  key: string
  title: string
  /** Уточнение мелким шрифтом: день недели, число, дата */
  hint: string
  rule: string
}

const WEEKDAY_ON = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота']
const MONTH_SHORT = ['янв.', 'февр.', 'мар.', 'апр.', 'мая', 'июн.', 'июл.', 'авг.', 'сент.', 'окт.', 'нояб.', 'дек.']

/** Быстрые варианты повтора для выбранного дня. Правило не привязано к дню: «еженедельно» идёт от срока задачи */
export function repeatPresets(day: DayKey): RepeatPreset[] {
  const [y, m, d] = day.split('-').map(Number)
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  const rule = (freq: Freq, byday: Weekday[] = []) => buildRule({ freq, interval: 1, byday, bymonthday: null })
  return [
    { key: 'day', title: 'Ежедневно', hint: '', rule: rule('DAILY') },
    { key: 'week', title: 'Еженедельно', hint: WEEKDAY_ON[dow], rule: rule('WEEKLY') },
    { key: 'month', title: 'Ежемесячно', hint: `${d}-е число`, rule: rule('MONTHLY') },
    { key: 'year', title: 'Ежегодно', hint: `${d} ${MONTH_SHORT[m - 1]}`, rule: rule('YEARLY') },
    { key: 'weekdays', title: 'Каждый будний день', hint: 'пн-пт', rule: rule('WEEKLY', ['MO', 'TU', 'WE', 'TH', 'FR']) },
  ]
}
