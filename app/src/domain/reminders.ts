import { dayKeyOf, dueDay, formatRowDay, localToMs, timeOf, type DateCtx } from './dates'
import { plainText } from './extras'
import type { Task } from './types'

/**
 * Напоминания. Хранятся как в TickTick, строкой TRIGGER:
 *   TRIGGER:PT0S        в момент срока
 *   TRIGGER:-PT15M      за 15 минут
 *   TRIGGER:-P1D        за день
 *   TRIGGER:P0DT9H0M0S  для задач на весь день: в 9:00 в день срока
 */

const DURATION_RE = /^(-)?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/i

/** Смещение в миллисекундах относительно базового момента. Отрицательное значит «раньше». null, если запись не разобрать */
export function parseTrigger(trigger: string): number | null {
  const text = trigger.replace(/^TRIGGER[:;]?/i, '').replace(/^RELATED=START:?/i, '').trim()
  const m = DURATION_RE.exec(text)
  if (!m || text === 'P' || text === '-P') return null
  const [, neg, w, d, h, min, s] = m
  const ms =
    (Number(w ?? 0) * 7 + Number(d ?? 0)) * 86_400_000 + Number(h ?? 0) * 3_600_000 + Number(min ?? 0) * 60_000 + Number(s ?? 0) * 1000
  return neg && ms !== 0 ? -ms : ms
}

/**
 * Момент, когда напоминание должно сработать.
 * Для задачи со временем это срок плюс смещение. Для задачи на весь день отсчёт идёт от начала дня:
 * «в 9:00 в день срока» хранится как P0DT9H0M0S, «за день в 9:00» как -P1DT15H0M0S
 */
export function fireTime(task: Pick<Task, 'due' | 'isAllDay'>, trigger: string, tz: string): number | null {
  if (task.due === null) return null
  const offset = parseTrigger(trigger)
  if (offset === null) return null
  if (typeof task.due === 'number') return task.due + offset
  return localToMs(task.due, '00:00', tz) + offset
}

export interface PlannedNotification {
  /** Целое число для системы: одно и то же напоминание всегда получает один и тот же номер */
  id: number
  taskId: string
  reminderId: string
  at: number
  title: string
  body: string
}

/** Устойчивый 31-битный номер из строки. Нужен, чтобы пересчёт расписания заменял, а не дублировал уведомления */
export function stableId(text: string): number {
  let h = 5381
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0
  return Math.abs(h) % 2_147_483_647 || 1
}

const HORIZON_MS = 60 * 86_400_000

/**
 * Расписание уведомлений на ближайшее время. Берём только будущие напоминания открытых задач.
 * Число ограничено: Android спокойно держит сотни, но iOS и слабые оболочки меньше, а далёкое будущее
 * всё равно пересчитается при следующем запуске
 */
export function buildSchedule(tasks: Task[], ctx: DateCtx, limit = 400): PlannedNotification[] {
  const out: PlannedNotification[] = []
  for (const t of tasks) {
    if (t.status !== 'open' || t.deletedAt !== null) continue
    for (const [reminderId, r] of Object.entries(t.reminders)) {
      const at = fireTime(t, r.trigger, ctx.tz)
      if (at === null || at <= ctx.now || at > ctx.now + HORIZON_MS) continue
      out.push({
        id: stableId(`${t.id}:${reminderId}`),
        taskId: t.id,
        reminderId,
        at,
        title: t.title,
        body: bodyFor(t, ctx),
      })
    }
  }
  return out.sort((a, b) => a.at - b.at).slice(0, limit)
}

/** «GMT+5», «GMT+3», «GMT+5:30»: смещение часового пояса в момент срока, как в уведомлениях TickTick */
export function gmtOffset(ms: number, tz: string): string {
  const part = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(new Date(ms)).find((p) => p.type === 'timeZoneName')?.value ?? 'GMT'
  return part === 'GMT' ? 'GMT+0' : part
}

/** Вторая строка уведомления, как в TickTick: время срока и часовой пояс в скобках, после них адрес, если он есть */
export function bodyFor(t: Task, ctx: DateCtx): string {
  const day = dueDay(t, ctx.tz)
  if (day === null) return ''
  if (typeof t.due === 'number') {
    const time = new Intl.DateTimeFormat('ru-RU', { timeZone: ctx.tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(t.due))
    const stamp = `(${time} ${gmtOffset(t.due, ctx.tz)})`
    return t.address ? `${stamp}, ${t.address}` : stamp
  }
  return t.address ? `(весь день), ${t.address}` : '(весь день)'
}

// ---------- Окно напоминания на компьютере ----------

/** Напоминание, которое уже сработало и ждёт реакции человека */
export interface DueReminder {
  /** Задача, номер напоминания и момент: если срок поменяли, это уже новое напоминание */
  key: string
  taskId: string
  title: string
  /** Начало заметки одной строкой */
  note: string
  at: number
  /** «Сегодня, 20:00» */
  when: string
}

/** Сработавшие напоминания открытых задач за последние часы, кроме уже обработанных. Старше этого срока не показываем: человек их пропустил */
export function dueReminders(tasks: Task[], ctx: DateCtx, handled: ReadonlySet<string>, maxAgeMs = 6 * 3_600_000): DueReminder[] {
  const out: DueReminder[] = []
  for (const t of tasks) {
    if (t.status !== 'open' || t.deletedAt !== null) continue
    for (const [reminderId, r] of Object.entries(t.reminders)) {
      const at = fireTime(t, r.trigger, ctx.tz)
      if (at === null || at > ctx.now || ctx.now - at > maxAgeMs) continue
      const key = `${t.id}:${reminderId}:${at}`
      if (handled.has(key)) continue
      const whenMs = typeof t.due === 'number' ? t.due : at
      const day = dayKeyOf(whenMs, ctx.tz)
      const note = plainText(t.content).replace(/\s+/g, ' ').trim()
      out.push({ key, taskId: t.id, title: t.title, note: note.length > 90 ? `${note.slice(0, 90)}…` : note, at, when: `${formatRowDay(day, ctx)}, ${timeOf(whenMs, ctx.tz)}` })
    }
  }
  return out.sort((a, b) => a.at - b.at)
}

// ---------- Варианты для экрана ----------

export interface ReminderChoice {
  key: string
  title: string
  trigger: string
}

/** Что предлагаем выбрать. Для задач на весь день другие варианты: время суток, а не «за 15 минут» */
export function reminderChoices(allDay: boolean): ReminderChoice[] {
  if (allDay) {
    return [
      { key: 'morning', title: 'В 9:00 в день срока', trigger: 'TRIGGER:P0DT9H0M0S' },
      { key: 'evening-before', title: 'В 18:00 накануне', trigger: 'TRIGGER:-P0DT6H0M0S' },
      { key: 'noon', title: 'В 12:00 в день срока', trigger: 'TRIGGER:P0DT12H0M0S' },
    ]
  }
  return [
    { key: 'at', title: 'В момент срока', trigger: 'TRIGGER:PT0S' },
    { key: '5m', title: 'За 5 минут', trigger: 'TRIGGER:-PT5M' },
    { key: '15m', title: 'За 15 минут', trigger: 'TRIGGER:-PT15M' },
    { key: '30m', title: 'За 30 минут', trigger: 'TRIGGER:-PT30M' },
    { key: '1h', title: 'За час', trigger: 'TRIGGER:-PT1H' },
    { key: '1d', title: 'За день', trigger: 'TRIGGER:-P1D' },
  ]
}

/** Подпись для произвольного значения, которое пришло из TickTick и не совпало с вариантами */
export function describeTrigger(trigger: string): string {
  const ms = parseTrigger(trigger)
  if (ms === null) return 'Своё напоминание'
  if (ms === 0) return 'В момент срока'
  const abs = Math.abs(ms)
  const days = Math.floor(abs / 86_400_000)
  const hours = Math.floor((abs % 86_400_000) / 3_600_000)
  const minutes = Math.floor((abs % 3_600_000) / 60_000)
  const seconds = Math.round((abs % 60_000) / 1000)
  const unit =
    [days && `${days} дн.`, hours && `${hours} ч`, minutes && `${minutes} мин`, !days && !hours && !minutes && seconds && `${seconds} сек`]
      .filter(Boolean)
      .join(' ') || '0 мин'
  return ms < 0 ? `За ${unit}` : `Через ${unit} после начала дня`
}
