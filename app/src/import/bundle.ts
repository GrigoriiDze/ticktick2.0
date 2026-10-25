import type { Firestore } from 'firebase/firestore'
import type { ImportedCheckin, ImportedColumn, ImportedGroup, ImportedHabit, ImportedProject, ImportedTask } from './ticktick'
import { writeImport, type WriteResult } from './write'

/** Файл с задачами из TickTick, подготовленный скриптом export-ticktick. Его выбирают в «Настройки, Импорт» */
export interface ImportBundle {
  version: 1
  groups: ImportedGroup[]
  columns: ImportedColumn[]
  projects: ImportedProject[]
  tasks: ImportedTask[]
  habits: ImportedHabit[]
  checkins: ImportedCheckin[]
}

const LISTS = ['groups', 'columns', 'projects', 'tasks', 'habits', 'checkins'] as const

/** Проверяет файл перед записью. Чужой или битый файл отвергаем, чтобы ничего не записать наполовину */
export function parseBundle(text: string): ImportBundle {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('Это не файл с задачами: он не читается')
  }
  const r = raw as Record<string, unknown> | null
  if (!r || typeof r !== 'object' || r.version !== 1) throw new Error('Это не файл с задачами из TickTick, подготовленный для приложения')
  for (const key of LISTS) {
    const list = r[key]
    if (!Array.isArray(list)) throw new Error(`В файле нет раздела «${key}»`)
    if (list.some((x) => !x || typeof x !== 'object' || typeof (x as { id?: unknown }).id !== 'string')) throw new Error(`В разделе «${key}» есть записи без номера`)
  }
  return r as unknown as ImportBundle
}

/** Сводка для показа до записи */
export function describeBundle(b: ImportBundle): string {
  const open = b.tasks.filter((t) => t.status === 'open').length
  return `${b.tasks.length} задач (открытых ${open}), списков ${b.projects.length}, папок ${b.groups.length}, привычек ${b.habits.length}`
}

/** Записывает файл в аккаунт. Что уже есть, не трогает, поэтому запускать можно повторно */
export function runImport(db: Firestore, uid: string, b: ImportBundle, onProgress?: (done: number, total: number) => void): Promise<WriteResult> {
  return writeImport(db, uid, b.projects, b.tasks, b.habits, b.checkins, onProgress, b.groups, b.columns)
}
