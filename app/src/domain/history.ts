import { dayKeyOf, timeOf, type DateCtx } from './dates'
import type { Stamp, Task } from './types'

/** Поля задачи, правки которых попадают в историю. Порядок и вложенность задач сюда не входят */
export const TRACKED = ['title', 'content', 'priority', 'due', 'start', 'isAllDay', 'timeZone', 'duration', 'repeat', 'repeatFrom', 'projectId', 'status', 'completedAt', 'address'] as const
export type Tracked = (typeof TRACKED)[number]

export interface Change {
  from: unknown
  to: unknown
}
export type Changes = Partial<Record<Tracked, Change>>

/** Запись истории: что изменилось в задаче за одну правку (или за несколько подряд) */
export interface HistoryEntry {
  id: string
  taskId: string
  /** Время ставит сервер, пока запись не дошла до него, значение null */
  at: Stamp
  changes: Changes
}

/** Правки, сделанные подряд на одном устройстве за это время, склеиваются в одну запись (набор текста не плодит историю) */
export const HISTORY_WINDOW_MS = 10 * 60 * 1000

const norm = (v: unknown): unknown => (v === undefined ? null : v)
const same = (a: unknown, b: unknown) => JSON.stringify(norm(a)) === JSON.stringify(norm(b))

/** Что из правки действительно меняет задачу. Поля, которых нет в истории, и значения без перемен отбрасываются */
export function diffTask(old: Task, patch: Record<string, unknown>): Changes {
  const out: Changes = {}
  for (const key of TRACKED) {
    if (!(key in patch)) continue
    const from = norm(old[key])
    const to = norm(patch[key])
    if (!same(from, to)) out[key] = { from, to }
  }
  return out
}

/** Склейка двух правок подряд: «было» берётся из первой, «стало» из второй. Если всё вернулось как было, поле пропадает */
export function mergeChanges(prev: Changes, next: Changes): Changes {
  const out: Changes = { ...prev }
  for (const key of TRACKED) {
    const n = next[key]
    if (!n) continue
    const from = prev[key] ? prev[key]!.from : n.from
    if (same(from, n.to)) delete out[key]
    else out[key] = { from, to: n.to }
  }
  return out
}

/** Правка, которая возвращает все поля записи к значениям «было» */
export function rollbackPatch(changes: Changes): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const key of TRACKED) if (changes[key]) out[key] = norm(changes[key]!.from)
  return out
}

const MONTHS = ['янв.', 'февр.', 'мар.', 'апр.', 'мая', 'июн.', 'июл.', 'авг.', 'сент.', 'окт.', 'нояб.', 'дек.']
const PRIORITY = { 0: 'нет', 1: 'низкий', 3: 'средний', 5: 'высокий' } as Record<number, string>

/** Срок в записи истории: всегда с числом (без «Сегодня» и «Завтра», иначе через неделю запись врёт) */
export function formatMoment(v: unknown, ctx: DateCtx): string {
  if (typeof v !== 'number' && typeof v !== 'string') return 'без срока'
  const day = typeof v === 'number' ? dayKeyOf(v, ctx.tz) : v
  const [y, m, d] = day.split('-').map(Number)
  const year = y === Number(dayKeyOf(ctx.now, ctx.tz).slice(0, 4)) ? '' : ` ${y}`
  return `${d} ${MONTHS[m - 1]}${year}${typeof v === 'number' ? ` ${timeOf(v, ctx.tz)}` : ''}`
}

const q = (v: unknown) => `«${String(norm(v) ?? '')}»`

/** Записи истории словами, по строке на каждое изменение. projectName нужен для переносов между списками */
export function describeChanges(changes: Changes, ctx: DateCtx, projectName: (id: string) => string): string[] {
  const lines: string[] = []
  const c = changes
  if (c.title) lines.push(`Название: ${q(c.title.from)} → ${q(c.title.to)}`)
  if (c.content) lines.push(!c.content.from ? 'Добавлено описание' : !c.content.to ? 'Описание удалено' : 'Описание изменено')
  if (c.priority) lines.push(`Приоритет: ${PRIORITY[Number(norm(c.priority.from))] ?? '—'} → ${PRIORITY[Number(norm(c.priority.to))] ?? '—'}`)
  if (c.due) {
    lines.push(c.due.to === null ? 'Срок убран' : c.due.from === null ? `Срок: ${formatMoment(c.due.to, ctx)}` : `Срок: ${formatMoment(c.due.from, ctx)} → ${formatMoment(c.due.to, ctx)}`)
  } else if (c.start || c.duration || c.isAllDay) lines.push('Время изменено')
  if (c.repeat) lines.push(c.repeat.to === null ? 'Повтор убран' : c.repeat.from === null ? 'Добавлен повтор' : 'Повтор изменён')
  if (c.projectId) lines.push(`Список: ${projectName(String(c.projectId.from))} → ${projectName(String(c.projectId.to))}`)
  if (c.status) lines.push(c.status.to === 'done' ? 'Выполнена' : c.status.to === 'wontdo' ? 'Не буду делать' : 'Возвращена в работу')
  if (c.address) lines.push(c.address.to === null ? 'Адрес убран' : `Адрес: ${q(c.address.to)}`)
  return lines
}
