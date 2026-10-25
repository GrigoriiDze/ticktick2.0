import { dueDay, formatRowDay, hasTime, localToMs, timeOf, type DateCtx, type DayKey } from './dates'
import { describeTrigger, parseTrigger } from './reminders'
import { describeRule } from './repeat'
import type { Task } from './types'

/** «Дата и напоминание» задачи целиком: так её видит окно выбора даты */
export interface DateValue {
  day: DayKey | null
  /** 'HH:MM' или null, тогда задача на весь день */
  time: string | null
  /** Длительность в минутах, только для задач со временем */
  duration: number | null
  reminders: string[]
  repeat: string | null
  repeatFrom: 'due' | 'done'
}

export const EMPTY_DATE: DateValue = { day: null, time: null, duration: null, reminders: [], repeat: null, repeatFrom: 'due' }

/** Напоминание «в момент срока», как стоит по умолчанию у задачи со временем */
export const AT_TIME = 'TRIGGER:PT0S'

export function dateValueOf(task: Pick<Task, 'due' | 'reminders' | 'repeat' | 'repeatFrom' | 'duration'>, ctx: DateCtx): DateValue {
  return {
    day: dueDay({ due: task.due, start: null }, ctx.tz),
    time: hasTime(task) ? timeOf(task.due as number, ctx.tz) : null,
    duration: hasTime(task) ? (task.duration ?? null) : null,
    reminders: Object.values(task.reminders).map((r) => r.trigger),
    repeat: task.repeat,
    repeatFrom: task.repeatFrom,
  }
}

/** Поля задачи, которые меняются вместе со сроком */
export interface DatePatch {
  fields: {
    due: number | string | null
    start?: null
    isAllDay: boolean
    timeZone: string | null
    repeat: string | null
    repeatFrom: 'due' | 'done'
    duration?: number | null
  }
  reminders: string[]
}

export function datePatchOf(v: DateValue, ctx: DateCtx): DatePatch {
  if (!v.day) return { fields: { due: null, start: null, isAllDay: false, timeZone: null, repeat: null, repeatFrom: 'due', duration: null }, reminders: [] }
  const base = { repeat: v.repeat, repeatFrom: v.repeatFrom }
  if (!v.time) return { fields: { due: v.day, isAllDay: true, timeZone: null, duration: null, ...base }, reminders: v.reminders }
  return { fields: { due: localToMs(v.day, v.time, ctx.tz), isAllDay: false, timeZone: ctx.tz, duration: v.duration, ...base }, reminders: v.reminders }
}

/**
 * Что делать с напоминаниями, когда меняют время. Если задача стала «со временем» или «на весь день»,
 * старые напоминания теряют смысл (у них разный отсчёт), поэтому ставим привычные: со временем «в момент срока», на весь день нет
 */
export function remindersAfterTimeChange(before: DateValue, nextTime: string | null): string[] {
  const wasTimed = before.time !== null
  const isTimed = nextTime !== null
  if (wasTimed === isTimed) return before.reminders
  return isTimed ? [AT_TIME] : []
}

/** Одна строка о сроке для карточки: «Завтра 10:30, каждый день, напоминание» */
export function describeDateValue(v: DateValue, ctx: DateCtx): string {
  if (!v.day) return ''
  const parts = [v.time ? `${formatRowDay(v.day, ctx)} ${v.time}${v.duration ? `–${endTime(v.time, v.duration)}` : ''}` : formatRowDay(v.day, ctx)]
  if (v.repeat) parts.push(describeRule(v.repeat, ctx).toLowerCase())
  if (v.reminders.length) parts.push(v.reminders.length === 1 ? describeTrigger(v.reminders[0]).toLowerCase() : `напоминаний ${v.reminders.length}`)
  return parts.join(', ')
}

/** Конец задачи: 10:30 и 90 минут дают 12:00. За полночь не переходим, пишем 23:59 */
export function endTime(time: string, minutes: number): string {
  const total = Math.min(Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5)) + minutes, 1439)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

/** Варианты длительности в окне даты */
export const DURATIONS: Array<{ minutes: number | null; title: string }> = [
  { minutes: null, title: 'Нет' },
  { minutes: 15, title: '15 минут' },
  { minutes: 30, title: '30 минут' },
  { minutes: 45, title: '45 минут' },
  { minutes: 60, title: '1 час' },
  { minutes: 90, title: '1,5 часа' },
  { minutes: 120, title: '2 часа' },
  { minutes: 180, title: '3 часа' },
  { minutes: 240, title: '4 часа' },
  { minutes: 480, title: '8 часов' },
]

/** Напоминание «за N дней, часов, минут» в формате TickTick. Ноль везде значит «в момент срока» */
export function customTrigger(days: number, hours: number, minutes: number): string {
  if (days === 0 && hours === 0 && minutes === 0) return AT_TIME
  return `TRIGGER:-P${days}DT${hours}H${minutes}M0S`
}

/** Одно и то же напоминание, записанное по-разному («в момент срока» бывает с минусом и без) */
export function sameTrigger(a: string, b: string): boolean {
  const n = (t: string) => t.replace(/^TRIGGER:-?PT0S$/, AT_TIME)
  return n(a) === n(b)
}

/** Добавляет напоминание. Такое же уже есть: ничего не меняется. Список идёт от самого раннего к самому позднему */
export function addReminder(list: string[], trigger: string): string[] {
  if (list.some((t) => sameTrigger(t, trigger))) return list
  return [...list, trigger].sort((a, b) => (parseTrigger(a) ?? 0) - (parseTrigger(b) ?? 0))
}

export function removeReminder(list: string[], trigger: string): string[] {
  return list.filter((t) => !sameTrigger(t, trigger))
}

/** Обратное к customTrigger для окна «Настроить уведомление»: начальные значения барабанов */
export function splitTrigger(trigger: string): { days: number; hours: number; minutes: number } {
  const m = /^TRIGGER:-P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:\d+S)?)?$/i.exec(trigger)
  if (!m) return { days: 0, hours: 0, minutes: 15 }
  return { days: Number(m[1] ?? 0), hours: Number(m[2] ?? 0), minutes: Number(m[3] ?? 0) }
}
