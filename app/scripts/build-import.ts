import { convertCheckins, convertColumn, convertGroup, convertHabit, convertProject, convertTask } from '../src/import/ticktick'
import type { ImportBundle } from '../src/import/bundle'
import type { DesktopData } from './ticktick-db'

/** Из прочитанной базы TickTick собирает всё, что нужно записать в наш аккаунт */
export function buildImport(desktop: DesktopData): ImportBundle {
  const projectIds = new Set(desktop.projects.map((p) => p.id))
  const groups = desktop.groups.map((g) => convertGroup(g).value).filter((g): g is NonNullable<typeof g> => g !== null)
  const groupIds = new Set(desktop.groups.filter((g) => (g.deleted ?? 0) === 0).map((g) => g.id))
  const columns = desktop.columns.map((c) => convertColumn(c, projectIds).value).filter((c): c is NonNullable<typeof c> => c !== null)
  const columnIds = new Set(desktop.columns.filter((c) => convertColumn(c, projectIds).value !== null).map((c) => c.id))
  const projects = desktop.projects.map((p) => convertProject(p, projectIds, groupIds).value!).filter(Boolean)
  const tasks = desktop.tasks.map((t) => convertTask(t, projectIds, columnIds).value).filter((t): t is NonNullable<typeof t> => t !== null)
  const checkins = convertCheckins(desktop.checkins, desktop.habitNotes)
  const firstDay = new Map<string, string>()
  for (const c of checkins) {
    const prev = firstDay.get(c.habitId)
    if (!prev || c.day < prev) firstDay.set(c.habitId, c.day)
  }
  const habits = desktop.habits.map((h) => convertHabit(h, firstDay.get(`tt-h-${h.id}`) ?? null).value).filter((h): h is NonNullable<typeof h> => h !== null)
  return { version: 1, groups, columns, projects, tasks, habits, checkins, files: desktop.files ?? [] }
}
