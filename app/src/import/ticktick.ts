import type { BoardColumn, ChecklistItem, Habit, HabitCheckin, Priority, Project, ProjectGroup, Task } from '../domain/types'
import { INBOX_ID } from '../domain/types'

/**
 * Перевод данных TickTick в нашу модель. Только чистые функции, без Firebase и без файлов,
 * поэтому покрыты тестами. Источник данных (база десктопа, выгрузка, API) подаёт сюда одинаковые объекты
 */

export interface RawItem {
  id: string
  title?: string
  status?: number
  sortOrder?: number
  completedTime?: string | null
}

export interface RawReminder {
  id: string
  trigger: string
}

export interface RawTask {
  id: string
  projectId: string
  parentId?: string | null
  title?: string
  content?: string
  kind?: string
  priority?: number
  status?: number
  deleted?: number
  isAllDay?: boolean
  isFloating?: boolean
  timeZone?: string | null
  startDate?: string | null
  dueDate?: string | null
  completedTime?: string | null
  repeatFlag?: string | null
  repeatFrom?: string | null
  exDate?: string[] | null
  reminders?: RawReminder[] | null
  items?: RawItem[] | null
  tags?: string[] | null
  sortOrder?: number
  pinnedTime?: string | null
  columnId?: string | null
  modifiedTime?: string | null
}

export interface RawGroup {
  id: string
  name?: string | null
  sortOrder?: number
  deleted?: number | null
  open?: number | boolean | null
}

export interface RawColumn {
  id: string
  projectId: string
  name?: string | null
  sortOrder?: number | null
  deleted?: number | null
}

export interface RawProject {
  id: string
  name?: string
  color?: string | null
  closed?: boolean | null
  kind?: string | null
  Isinbox?: boolean | null
  groupId?: string | null
  sortOrder?: number
  viewMode?: string | null
}

export type ImportedTask = Omit<Task, 'createdAt' | 'updatedAt' | 'deletedAt'>
export type ImportedProject = Omit<Project, 'createdAt' | 'updatedAt' | 'deletedAt'>
export type ImportedColumn = Omit<BoardColumn, 'createdAt' | 'updatedAt' | 'deletedAt'>
export type ImportedGroup = Omit<ProjectGroup, 'createdAt' | 'updatedAt' | 'deletedAt'>

export interface Converted<T> {
  /** null, если запись пропущена */
  value: T | null
  /** Почему пропущена или что изменилось при переносе */
  notes: string[]
}

/** Идентификаторы в нашей базе строятся из идентификаторов TickTick, поэтому повторный импорт перезаписывает, а не дублирует */
export const importedId = (sourceId: string) => `tt-${sourceId}`
export const importedGroupId = (sourceId: string) => `tt-g-${sourceId}`
export const importedColumnId = (sourceId: string) => `tt-c-${sourceId}`

/** Служебная колонка TickTick для задач вне колонок. У нас это полоса «Без колонки», отдельной колонкой её не делаем */
const isUngrouped = (name: string | null | undefined) => /^\s*(несгруппированн\S*|ungrouped)\s*$/i.test(name ?? '')

/** '2025-03-01T00:00:00+0600' в миллисекунды. Смещение без двоеточия приводим к стандартной записи */
export function parseTickTime(iso: string): number | null {
  const normalized = iso.replace(/([+-]\d{2})(\d{2})$/, '$1:$2')
  const ms = Date.parse(normalized)
  return Number.isNaN(ms) ? null : ms
}

/** Местная дата из записи с поясом: просто первые десять знаков, пересчёт в UTC здесь только навредил бы */
function localDay(iso: string): string | null {
  const m = /^(\d{4}-\d{2}-\d{2})T/.exec(iso)
  return m ? m[1] : null
}

function mapStatus(status: number | undefined): Task['status'] {
  if (status === 2 || status === 1) return 'done'
  if (status === -1) return 'wontdo'
  return 'open'
}

function mapPriority(p: number | undefined): Priority {
  return p === 1 || p === 3 || p === 5 ? p : 0
}

/** Папка из TickTick. Удалённые не переносим */
export function convertGroup(raw: RawGroup): Converted<ImportedGroup> {
  if ((raw.deleted ?? 0) !== 0) return { value: null, notes: ['папка удалена'] }
  return {
    value: { id: importedGroupId(raw.id), name: raw.name?.trim() || 'Папка', sortOrder: raw.sortOrder ?? 0, collapsed: !(raw.open === 1 || raw.open === true || raw.open == null) },
    notes: [],
  }
}

/** Колонка канбана. Удалённые, служебная «несгруппированный» и колонки неизвестных списков не переносим */
export function convertColumn(raw: RawColumn, projectIds: Set<string>): Converted<ImportedColumn> {
  if ((raw.deleted ?? 0) !== 0) return { value: null, notes: ['колонка удалена'] }
  if (isUngrouped(raw.name)) return { value: null, notes: ['служебная колонка без группы'] }
  const inbox = /^inbox/i.test(raw.projectId)
  if (!inbox && !projectIds.has(raw.projectId)) return { value: null, notes: ['список колонки удалён'] }
  return {
    value: { id: importedColumnId(raw.id), projectId: inbox ? INBOX_ID : importedId(raw.projectId), name: raw.name?.trim() || 'Колонка', sortOrder: raw.sortOrder ?? 0 },
    notes: [],
  }
}

/** groupIds: идентификаторы папок, которые переносим; список с неизвестной папкой остаётся вне папок */
export function convertProject(raw: RawProject, projectIds: Set<string>, groupIds: Set<string> = new Set()): Converted<ImportedProject> {
  void projectIds
  const isInbox = raw.Isinbox === true || /^inbox/i.test(raw.id)
  const notes: string[] = []
  if (raw.kind && raw.kind !== 'TASK') notes.push(`тип списка ${raw.kind} импортирован как обычный список`)
  return {
    value: {
      id: isInbox ? INBOX_ID : importedId(raw.id),
      name: isInbox ? 'Входящие' : (raw.name ?? 'Список'),
      color: raw.color ?? null,
      groupId: raw.groupId && groupIds.has(raw.groupId) ? importedGroupId(raw.groupId) : null,
      sortOrder: raw.sortOrder ?? 0,
      viewMode: raw.viewMode === 'kanban' ? 'kanban' : 'list',
      kind: 'task',
      isInbox,
      closed: raw.closed === true,
      site: null,
    },
    notes,
  }
}

/** columnIds: идентификаторы колонок, которые переносим; задача из другой колонки остаётся без колонки */
export function convertTask(raw: RawTask, projectIds: Set<string>, columnIds: Set<string> = new Set()): Converted<ImportedTask> {
  const notes: string[] = []

  if ((raw.deleted ?? 0) !== 0) return { value: null, notes: ['в корзине'] }

  // Список мог быть удалён, а задачи в нём остаться. Не теряем их, а кладём во Входящие
  const known = projectIds.has(raw.projectId) || /^inbox/i.test(raw.projectId)
  if (!known) notes.push('список удалён, задача перенесена во Входящие')
  const projectId = known && !/^inbox/i.test(raw.projectId) ? importedId(raw.projectId) : INBOX_ID

  // Срок. У большинства задач TickTick есть только начало, оно и есть срок.
  // Если есть и начало и конец, это задача на несколько дней
  let start: number | string | null = null
  let due: number | string | null = null
  const isAllDay = raw.isAllDay === true
  if (raw.startDate) {
    const startValue = isAllDay ? localDay(raw.startDate) : parseTickTime(raw.startDate)
    const dueValue = raw.dueDate ? (isAllDay ? localDay(raw.dueDate) : parseTickTime(raw.dueDate)) : null
    if (startValue === null) notes.push('дата не распознана и пропущена')
    else if (dueValue !== null && dueValue !== startValue) {
      start = startValue
      due = dueValue
    } else due = startValue
  }

  const repeat = raw.repeatFlag ? raw.repeatFlag : null
  const items: Record<string, ChecklistItem> = {}
  for (const it of raw.items ?? []) {
    items[it.id] = {
      title: it.title ?? '',
      done: it.status === 1 || it.status === 2,
      sortOrder: it.sortOrder ?? 0,
      ...(it.completedTime ? { completedAt: parseTickTime(it.completedTime) ?? undefined } : {}),
    }
  }

  const reminders: Task['reminders'] = {}
  for (const r of raw.reminders ?? []) reminders[r.id] = { trigger: r.trigger }

  if (raw.kind === 'NOTE') notes.push('заметка импортирована как задача')

  return {
    value: {
      id: importedId(raw.id),
      projectId,
      parentId: raw.parentId ? importedId(raw.parentId) : null,
      columnId: raw.columnId && columnIds.has(raw.columnId) ? importedColumnId(raw.columnId) : null,
      sortOrder: raw.sortOrder ?? 0,
      title: raw.title ?? '',
      content: raw.content ?? '',
      kind: raw.kind === 'CHECKLIST' ? 'checklist' : 'text',
      items,
      priority: mapPriority(raw.priority),
      status: mapStatus(raw.status),
      completedAt: raw.completedTime ? parseTickTime(raw.completedTime) : null,
      start,
      due,
      isAllDay,
      timeZone: raw.isFloating ? null : (raw.timeZone ?? null),
      repeat,
      // В TickTick '1' означает «от выполнения», остальное «от срока»
      repeatFrom: raw.repeatFrom === '1' ? 'done' : 'due',
      exDates: raw.exDate ?? [],
      reminders,
      tags: (raw.tags ?? []).filter((t) => typeof t === 'string'),
      pinnedAt: raw.pinnedTime ? parseTickTime(raw.pinnedTime) : null,
      waiting: null,
      address: null,
      sourceId: raw.id,
    },
    notes,
  }
}

/** В выгрузке бывают копии одной задачи. Оставляем ту, что правили позже */
export function dedupeTasks<T extends { id: string; modifiedTime?: string | null }>(list: T[]): T[] {
  const best = new Map<string, T>()
  for (const t of list) {
    const prev = best.get(t.id)
    if (!prev || (t.modifiedTime ? (parseTickTime(t.modifiedTime) ?? 0) : 0) >= (prev.modifiedTime ? (parseTickTime(prev.modifiedTime) ?? 0) : 0)) {
      best.set(t.id, t)
    }
  }
  return [...best.values()]
}

// ---------- Привычки ----------

export interface RawHabit {
  id: string
  name?: string
  color?: string | null
  /** 0 активна, 1 в архиве */
  status?: number
  repeatRule?: string | null
  /** 'YYYY-MM-DD HH:MM:SS' */
  createdTime?: string | null
  archivedTime?: string | null
  /** Число вида 20250922 */
  targetStartDate?: number | null
  targetDays?: number | null
  /** Время напоминаний 'HH:MM', несколько через запятую */
  reminder?: string | null
  sortOrder?: number
  encouragement?: string | null
}

export interface RawCheckin {
  habitId: string
  /** Строка вида '20241002' */
  stamp: string
  /** 2 выполнено, 1 не выполнено, 0 отметка снята */
  checkStatus: number
  opTime?: string | null
}

export interface RawHabitNote {
  habitId: string
  stamp: number | string
  content: string | null
}

export type ImportedHabit = Omit<Habit, 'createdAt' | 'updatedAt' | 'deletedAt'>
export type ImportedCheckin = Omit<HabitCheckin, 'createdAt' | 'updatedAt'>

export const importedHabitId = (sourceId: string) => `tt-h-${sourceId}`

/** '20250922' или 20250922 в '2025-09-22'. Неверное значение даёт null */
export function stampToDay(stamp: string | number): string | null {
  const m = /^(\d{4})(\d{2})(\d{2})$/.exec(String(stamp))
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null
}

function utcMs(text: string | null | undefined): number | null {
  if (!text) return null
  const ms = Date.parse(text.replace(' ', 'T') + 'Z')
  return Number.isNaN(ms) ? null : ms
}

/** Каждый день без особенностей записываем как «нет правила», остальное как есть */
function normalizeHabitRule(rule: string | null | undefined): string | null {
  if (!rule) return null
  return /^RRULE:FREQ=DAILY(;INTERVAL=1)?$/i.test(rule.trim()) ? null : rule
}

export function convertHabit(raw: RawHabit, firstCheckinDay: string | null): Converted<ImportedHabit> {
  const notes: string[] = []
  const createdDay = raw.createdTime ? raw.createdTime.slice(0, 10) : null
  const target = raw.targetDays && raw.targetDays > 0 ? raw.targetDays : null
  const challengeStart = target && raw.targetStartDate ? stampToDay(raw.targetStartDate) : null

  // День начала: начало челленджа, иначе день создания, иначе первая отметка
  const startDay = challengeStart ?? createdDay ?? firstCheckinDay
  if (!startDay) return { value: null, notes: ['у привычки нет ни даты создания, ни отметок'] }

  const archived = raw.status === 1
  const rule = normalizeHabitRule(raw.repeatRule)
  if (rule && !/^RRULE:FREQ=(DAILY|WEEKLY|MONTHLY)/i.test(rule)) notes.push('сложное правило повтора сохранено без изменений')

  return {
    value: {
      id: importedHabitId(raw.id),
      name: raw.name ?? '',
      color: raw.color ?? '#7BC4FA',
      repeat: rule,
      startDay,
      targetDays: target,
      reminders: (raw.reminder ?? '')
        .split(',')
        .map((t) => t.trim())
        .filter((t) => /^\d{2}:\d{2}$/.test(t)),
      archivedAt: archived ? (utcMs(raw.archivedTime) ?? Date.now()) : null,
      sortOrder: raw.sortOrder ?? 0,
      encouragement: raw.encouragement?.trim() ? raw.encouragement : null,
      sourceId: raw.id,
    },
    notes,
  }
}

/**
 * Отметки привычек. Сделано и не сделано переносятся, снятые отметки (статус 0) нет.
 * Если за один день несколько записей, остаётся самая поздняя. Заметки подкладываются к отметкам того же дня
 */
export function convertCheckins(raws: RawCheckin[], notes: RawHabitNote[] = []): ImportedCheckin[] {
  const noteBy = new Map<string, string>()
  for (const n of notes) {
    const day = stampToDay(n.stamp)
    if (day && n.content?.trim()) noteBy.set(`${n.habitId}~${day}`, n.content)
  }

  const latest = new Map<string, { raw: RawCheckin; op: number }>()
  for (const r of raws) {
    if (r.checkStatus !== 1 && r.checkStatus !== 2) continue
    const day = stampToDay(r.stamp)
    if (!day) continue
    const key = `${r.habitId}~${day}`
    const op = utcMs(r.opTime) ?? 0
    const prev = latest.get(key)
    if (!prev || op >= prev.op) latest.set(key, { raw: r, op })
  }

  const out: ImportedCheckin[] = []
  for (const [key, { raw }] of latest) {
    const day = stampToDay(raw.stamp)!
    const habitId = importedHabitId(raw.habitId)
    out.push({
      id: `${habitId}~${day}`,
      habitId,
      day,
      status: raw.checkStatus === 2 ? 'done' : 'failed',
      note: noteBy.get(key) ?? null,
    })
  }
  return out
}
