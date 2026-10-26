import { collection, getDocs, type Firestore } from 'firebase/firestore'
import type { TaskFile } from '../domain/files'
import type {
  ImportedAttachment,
  ImportedCheckin,
  ImportedColumn,
  ImportedGroup,
  ImportedHabit,
  ImportedProject,
  ImportedTask,
} from './ticktick'
import { isTickTickCsv, parseTickTickCsv } from './ticktick-csv'
import { writeImport, type WriteResult } from './write'

/** Файл с задачами из TickTick или резервная копия нашего приложения */
export interface ImportBundle {
  version: 1
  groups: ImportedGroup[]
  columns: ImportedColumn[]
  projects: ImportedProject[]
  tasks: ImportedTask[]
  habits: ImportedHabit[]
  checkins: ImportedCheckin[]
  files?: ImportedAttachment[]
}

const LISTS = ['groups', 'columns', 'projects', 'tasks', 'habits', 'checkins'] as const

/**
 * Проверяет и разбирает файл перед записью.
 * Понимает как JSON резервную копию (version: 1), так и официальный CSV-бэкап из TickTick (.csv).
 */
export function parseBundle(text: string): ImportBundle {
  const trimmed = text.replace(/^\uFEFF/, '').trim()
  if (!trimmed.startsWith('{') && isTickTickCsv(trimmed)) {
    return parseTickTickCsv(trimmed)
  }

  let raw: unknown
  try {
    raw = JSON.parse(trimmed)
  } catch {
    if (isTickTickCsv(trimmed)) {
      return parseTickTickCsv(trimmed)
    }
    throw new Error('Это не файл с задачами: он не читается (поддерживаются .json и .csv из TickTick)')
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
  const done = b.tasks.filter((t) => t.status === 'done').length
  const filesPart = b.files?.length ? `, файлов ${b.files.length}` : ''
  return `${b.tasks.length} задач (открытых ${open}), выполненных ${done}, списков ${b.projects.length}, папок ${b.groups.length}, привычек ${b.habits.length}${filesPart}`
}

/** Записывает файл в аккаунт. Что уже есть, не трогает, поэтому запускать можно повторно */
export function runImport(db: Firestore, uid: string, b: ImportBundle, onProgress?: (done: number, total: number) => void): Promise<WriteResult> {
  return writeImport(db, uid, b.projects, b.tasks, b.habits, b.checkins, onProgress, b.groups, b.columns, b.files ?? [])
}

function stripStamps<T extends Record<string, unknown>>(docId: string, data: T): Omit<T, 'createdAt' | 'updatedAt' | 'deletedAt'> & { id: string } {
  const { createdAt: _c, updatedAt: _u, deletedAt: _d, ...rest } = data
  return { ...(rest as Omit<T, 'createdAt' | 'updatedAt' | 'deletedAt'>), id: docId }
}

/**
 * Экспортирует все данные аккаунта (папки, списки, колонки, открытые и выполненные задачи,
 * привычки, отметки привычек и прикрепленные файлы) в полный JSON-пакет резервной копии.
 */
export async function exportAccountBundle(db: Firestore, uid: string): Promise<ImportBundle> {
  const [groupsSnap, colsSnap, projsSnap, tasksSnap, habitsSnap, checkinsSnap, filesSnap, chunksSnap] = await Promise.all([
    getDocs(collection(db, 'users', uid, 'projectGroups')),
    getDocs(collection(db, 'users', uid, 'columns')),
    getDocs(collection(db, 'users', uid, 'projects')),
    getDocs(collection(db, 'users', uid, 'tasks')),
    getDocs(collection(db, 'users', uid, 'habits')),
    getDocs(collection(db, 'users', uid, 'habitCheckins')),
    getDocs(collection(db, 'users', uid, 'taskFiles')),
    getDocs(collection(db, 'users', uid, 'taskFileChunks')),
  ])

  const groups = groupsSnap.docs
    .filter((d) => !d.data().deletedAt)
    .map((d) => stripStamps(d.id, d.data()) as unknown as ImportedGroup)

  const columns = colsSnap.docs
    .filter((d) => !d.data().deletedAt)
    .map((d) => stripStamps(d.id, d.data()) as unknown as ImportedColumn)

  const projects = projsSnap.docs
    .filter((d) => !d.data().deletedAt)
    .map((d) => stripStamps(d.id, d.data()) as unknown as ImportedProject)

  const tasks = tasksSnap.docs
    .filter((d) => !d.data().deletedAt)
    .map((d) => stripStamps(d.id, d.data()) as unknown as ImportedTask)

  const habits = habitsSnap.docs
    .filter((d) => !d.data().deletedAt)
    .map((d) => stripStamps(d.id, d.data()) as unknown as ImportedHabit)

  const checkins = checkinsSnap.docs.map((d) => stripStamps(d.id, d.data()) as unknown as ImportedCheckin)

  // Собираем кусочки файлов по fileId
  const chunksByFile = new Map<string, Array<{ index: number; data: string }>>()
  for (const ch of chunksSnap.docs) {
    const cd = ch.data() as { fileId: string; index: number; data: string }
    const arr = chunksByFile.get(cd.fileId) ?? []
    arr.push({ index: cd.index, data: cd.data })
    chunksByFile.set(cd.fileId, arr)
  }

  const files: ImportedAttachment[] = []
  for (const fd of filesSnap.docs) {
    const f = fd.data() as Omit<TaskFile, 'id'>
    const parts = (chunksByFile.get(fd.id) ?? []).sort((a, b) => a.index - b.index)
    files.push({
      id: fd.id,
      taskId: f.taskId,
      name: f.name,
      type: f.type,
      size: f.size,
      base64: parts.map((p) => p.data).join(''),
    })
  }

  return {
    version: 1,
    groups,
    columns,
    projects,
    tasks,
    habits,
    checkins,
    files,
  }
}
