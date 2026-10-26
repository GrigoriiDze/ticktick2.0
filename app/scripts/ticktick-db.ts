import { existsSync, readFileSync } from 'node:fs'
import { dirname, extname, resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { MAX_FILE_BYTES } from '../src/domain/files'
import {
  dedupeTasks,
  importedFileId,
  importedId,
  type ImportedAttachment,
  type RawCheckin,
  type RawColumn,
  type RawGroup,
  type RawHabit,
  type RawHabitNote,
  type RawProject,
  type RawTask,
} from '../src/import/ticktick'

/**
 * Чтение базы десктопного TickTick (AppData\Roaming\Tick_Tick\TickTick.db). Только чтение, лучше на копии файла.
 */
export interface DesktopData {
  groups: RawGroup[]
  columns: RawColumn[]
  projects: RawProject[]
  tasks: RawTask[]
  habits: RawHabit[]
  checkins: RawCheckin[]
  habitNotes: RawHabitNote[]
  files: ImportedAttachment[]
  counts: { habits: number; habitCheckins: number; pomodoros: number; columns: number; comments: number; attachments: number }
}

function guessMime(fileName: string, rawType?: string | null): string {
  if (rawType && rawType.includes('/')) return rawType
  const ext = (rawType || extname(fileName)).toLowerCase().replace(/^\./, '')
  const map: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    gif: 'image/gif',
    pdf: 'application/pdf',
    txt: 'text/plain',
    md: 'text/markdown',
    csv: 'text/csv',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    zip: 'application/zip',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    m4a: 'audio/mp4',
  }
  return map[ext] || 'application/octet-stream'
}

export function readDesktopDb(path: string): DesktopData {
  const db = new DatabaseSync(path, { readOnly: true })
  const baseDir = dirname(resolve(path))
  const rows = (sql: string) => db.prepare(sql).all() as Array<Record<string, unknown>>
  const count = (table: string) => Number((db.prepare(`select count(*) c from ${table}`).get() as { c: number }).c)

  const groups = rows('select id, name, cast(sortOrder as real) as sortOrder, deleted, open from ProjectGroupModel').map(
    (r): RawGroup => ({ id: String(r.id), name: (r.name as string | null) ?? null, sortOrder: Number(r.sortOrder ?? 0), deleted: Number(r.deleted ?? 0), open: r.open == null ? null : Number(r.open) }),
  )

  const columns = rows('select id, projectId, name, cast(sortOrder as real) as sortOrder, deleted from ColumnModel').map(
    (r): RawColumn => ({ id: String(r.id), projectId: String(r.projectId), name: (r.name as string | null) ?? null, sortOrder: r.sortOrder == null ? null : Number(r.sortOrder), deleted: Number(r.deleted ?? 0) }),
  )

  const projects = rows(
    'select id, name, color, Isinbox, closed, kind, cast(sortOrder as real) as sortOrder, groupId, viewMode from ProjectModel',
  ).map(
    (r): RawProject => ({
      id: String(r.id),
      name: String(r.name ?? ''),
      color: (r.color as string | null) ?? null,
      Isinbox: Number(r.Isinbox) === 1,
      closed: Number(r.closed) === 1,
      kind: (r.kind as string | null) ?? null,
      sortOrder: Number(r.sortOrder ?? 0),
      groupId: (r.groupId as string | null) ?? null,
      viewMode: (r.viewMode as string | null) ?? null,
    }),
  )

  const deleted = new Map(rows('select id, deleted from TaskModel').map((r) => [String(r.id), Number(r.deleted ?? 0)]))
  const tasks = dedupeTasks(rows('select jsonString from TaskSyncedJsonModel').map((r) => JSON.parse(String(r.jsonString)) as RawTask)).map(
    (t) => ({ ...t, deleted: deleted.get(t.id) ?? t.deleted ?? 0 }),
  )

  // Читаем вложения из AttachmentModel (если файлы лежат в локальном кэше TickTick на ПК, переносим их байты)
  const files: ImportedAttachment[] = []
  try {
    const rawAttachments = rows('select * from AttachmentModel')
    const taskById = new Map(tasks.map((t) => [t.id, t]))
    for (const a of rawAttachments) {
      const del = Number(a.deleted ?? a.Deleted ?? 0)
      if (del !== 0) continue
      const attId = String(a.id ?? a.Id ?? a.refId ?? '')
      const taskId = String(a.taskId ?? a.TaskId ?? '')
      const fileName = String(a.fileName ?? a.FileName ?? a.name ?? 'file')
      const fileType = guessMime(fileName, (a.fileType ?? a.FileType ?? null) as string | null)
      if (!attId || !taskId) continue

      const candidates = [
        a.localPath ? String(a.localPath) : '',
        a.LocalPath ? String(a.LocalPath) : '',
        a.path ? String(a.path) : '',
        resolve(baseDir, 'Attachment', attId, fileName),
        resolve(baseDir, 'Attachment', taskId, fileName),
        resolve(baseDir, 'Attachment', fileName),
        resolve(baseDir, 'Attachments', attId, fileName),
      ].filter(Boolean)

      let loaded = false
      for (const candidate of candidates) {
        if (existsSync(candidate)) {
          const buf = readFileSync(candidate)
          if (buf.byteLength <= MAX_FILE_BYTES) {
            files.push({
              id: importedFileId(attId),
              taskId: importedId(taskId),
              name: fileName,
              type: fileType,
              size: buf.byteLength,
              base64: buf.toString('base64'),
            })
            loaded = true
          }
          break
        }
      }

      // Если файл не скачан локально на ПК, сохраняем упоминание в заметке задачи, чтобы не потерять информацию
      if (!loaded) {
        const targetTask = taskById.get(taskId)
        if (targetTask) {
          const noteLine = `[Вложение из TickTick: ${fileName}]`
          if (!(targetTask.content ?? '').includes(noteLine)) {
            targetTask.content = targetTask.content ? `${targetTask.content}\n\n${noteLine}` : noteLine
          }
        }
      }
    }
  } catch {
    // Если таблица AttachmentModel имеет нестандартную структуру, не прерываем импорт остальных данных
  }

  const habits = rows(
    'select Id, Name, Color, Status, RepeatRule, CreatedTime, ArchivedTime, TargetStartDate, TargetDays, Reminder, cast(SortOrder as real) as SortOrder, Encouragement from HabitModel',
  ).map(
    (r): RawHabit => ({
      id: String(r.Id),
      name: String(r.Name ?? ''),
      color: (r.Color as string | null) ?? null,
      status: Number(r.Status ?? 0),
      repeatRule: (r.RepeatRule as string | null) ?? null,
      createdTime: (r.CreatedTime as string | null) ?? null,
      archivedTime: (r.ArchivedTime as string | null) ?? null,
      targetStartDate: r.TargetStartDate === null ? null : Number(r.TargetStartDate),
      targetDays: r.TargetDays === null ? null : Number(r.TargetDays),
      reminder: (r.Reminder as string | null) ?? null,
      sortOrder: Number(r.SortOrder ?? 0),
      encouragement: (r.Encouragement as string | null) ?? null,
    }),
  )
  const checkins = rows('select HabitId, CheckinStamp, CheckStatus, opTime from HabitCheckInModel').map(
    (r): RawCheckin => ({
      habitId: String(r.HabitId),
      stamp: String(r.CheckinStamp),
      checkStatus: Number(r.CheckStatus ?? 0),
      opTime: (r.opTime as string | null) ?? null,
    }),
  )
  const habitNotes = rows('select HabitId, Stamp, Content from HabitRecordModel where Deleted = 0').map(
    (r): RawHabitNote => ({ habitId: String(r.HabitId), stamp: String(r.Stamp), content: (r.Content as string | null) ?? null }),
  )

  return {
    groups,
    columns,
    projects,
    tasks,
    habits,
    checkins,
    habitNotes,
    files,
    counts: {
      habits: count('HabitModel'),
      habitCheckins: count('HabitCheckInModel'),
      pomodoros: count('PomodoroModel'),
      columns: count('ColumnModel'),
      comments: count('CommentModel'),
      attachments: count('AttachmentModel'),
    },
  }
}
