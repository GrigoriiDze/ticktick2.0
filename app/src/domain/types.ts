import type { Timestamp } from 'firebase/firestore'

/** Время правки ставит сервер, пока запись не дошла до него, значение равно null */
export type Stamp = Timestamp | null

export type Priority = 0 | 1 | 3 | 5

export type TaskStatus = 'open' | 'done' | 'wontdo'

export type SiteStage = 'measure' | 'estimate' | 'supply' | 'install' | 'commissioning' | 'done'

export interface ChecklistItem {
  title: string
  done: boolean
  sortOrder: number
  completedAt?: number
}

export interface Reminder {
  /** Формат как в TickTick, например 'TRIGGER:-PT15M' */
  trigger: string
}

export interface Waiting {
  kind: 'payment' | 'delivery' | 'approval'
  /** Дата 'YYYY-MM-DD', когда надо напомнить, что вопрос завис */
  until: string | null
}

export interface Task {
  id: string
  projectId: string
  parentId: string | null
  columnId: string | null
  sortOrder: number

  title: string
  content: string
  kind: 'text' | 'checklist'
  /** Словарь по id, а не массив: правки двух устройств не затирают друг друга */
  items: Record<string, ChecklistItem>

  priority: Priority
  status: TaskStatus
  completedAt: number | null

  /** UTC в миллисекундах, либо 'YYYY-MM-DD' для задач на весь день */
  start: number | string | null
  due: number | string | null
  isAllDay: boolean
  timeZone: string | null

  /** Сколько длится задача со временем, в минутах. Нет значения: календарь рисует её часовой */
  duration?: number | null

  repeat: string | null
  repeatFrom: 'due' | 'done'
  exDates: string[]

  reminders: Record<string, Reminder>
  tags: string[]
  pinnedAt: number | null

  waiting: Waiting | null
  address: string | null

  /** Идентификатор задачи в TickTick, чтобы повторный импорт не создавал дублей */
  sourceId: string | null

  createdAt: Stamp
  updatedAt: Stamp
  deletedAt: Stamp
}

export interface Project {
  id: string
  name: string
  color: string | null
  groupId: string | null
  sortOrder: number
  viewMode: 'list' | 'kanban' | 'timeline'
  kind: 'task' | 'note'
  isInbox: boolean
  closed: boolean
  site: {
    address: string
    contactName: string
    contactPhone: string
    budget: number | null
    drawingsUrl: string
    stage: SiteStage
  } | null

  createdAt: Stamp
  updatedAt: Stamp
  deletedAt: Stamp
}

/** Папка для списков в боковом меню. Список лежит в папке, если его groupId указывает на неё */
export interface ProjectGroup {
  id: string
  name: string
  sortOrder: number
  /** Свёрнута ли папка в боковом меню. Хранится вместе с данными, чтобы на втором устройстве было так же */
  collapsed: boolean
  createdAt: Stamp
  updatedAt: Stamp
  deletedAt: Stamp
}

/** Событие для обратного отсчёта: сколько дней осталось до даты */
export interface Countdown {
  id: string
  name: string
  /** День события 'YYYY-MM-DD' */
  date: string
  sortOrder: number
  createdAt: Stamp
  updatedAt: Stamp
  deletedAt: Stamp
}

/** Колонка канбана внутри списка */
export interface BoardColumn {
  id: string
  projectId: string
  name: string
  sortOrder: number
  createdAt: Stamp
  updatedAt: Stamp
  deletedAt: Stamp
}

export const INBOX_ID = 'inbox'

export type CheckStatus = 'done' | 'failed'

export interface Habit {
  id: string
  name: string
  color: string
  /** Правило повтора в формате RRULE. null значит каждый день */
  repeat: string | null
  /** Первый день, с которого привычка считается: до него пропусков нет */
  startDay: string
  /** Челлендж на N дней. null значит без срока */
  targetDays: number | null
  /** Время напоминания 'HH:MM' */
  reminders: string[]
  /** Когда убрана в архив, мс. null значит активна */
  archivedAt: number | null
  sortOrder: number
  encouragement: string | null
  sourceId: string | null

  createdAt: Stamp
  updatedAt: Stamp
  deletedAt: Stamp
}

/** Отметка за день. Документ с фиксированным id (привычка и день), поэтому на один день она одна */
export interface HabitCheckin {
  id: string
  habitId: string
  day: string
  status: CheckStatus
  note: string | null

  createdAt: Stamp
  updatedAt: Stamp
}
