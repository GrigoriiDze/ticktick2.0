import { DatabaseSync } from 'node:sqlite'
import { dedupeTasks, type RawCheckin, type RawColumn, type RawGroup, type RawHabit, type RawHabitNote, type RawProject, type RawTask } from '../src/import/ticktick'

/**
 * Чтение базы десктопного TickTick (AppData\Roaming\Tick_Tick\TickTick.db). Только чтение, лучше на копии файла.
 *
 * Две особенности, найденные на настоящих данных:
 *  1. Список проектов надо брать из основной таблицы ProjectModel, в таблице JSON-копий их не все
 *  2. Признак «в корзине» надёжно хранится в основной таблице TaskModel (колонка deleted), а в JSON-копии он почти всегда 0.
 *     Без этого в импорт попали бы сотни удалённых задач как открытые
 */
export interface DesktopData {
  groups: RawGroup[]
  columns: RawColumn[]
  projects: RawProject[]
  tasks: RawTask[]
  habits: RawHabit[]
  checkins: RawCheckin[]
  habitNotes: RawHabitNote[]
  counts: { habits: number; habitCheckins: number; pomodoros: number; columns: number; comments: number; attachments: number }
}

export function readDesktopDb(path: string): DesktopData {
  const db = new DatabaseSync(path, { readOnly: true })
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
