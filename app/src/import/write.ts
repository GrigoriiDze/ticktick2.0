import { collection, doc, getDocs, serverTimestamp, writeBatch, type Firestore } from 'firebase/firestore'
import type { ImportedCheckin, ImportedColumn, ImportedGroup, ImportedHabit, ImportedProject, ImportedTask } from './ticktick'

export interface WriteResult {
  groups: { added: number; existing: number }
  columns: { added: number; existing: number }
  projects: { added: number; existing: number }
  tasks: { added: number; existing: number }
  habits: { added: number; existing: number }
  checkins: { added: number; existing: number }
}

const BATCH = 400

/** Составляет данные документа без id: идентификатор хранится в пути, а не в полях */
function body<T extends { id: string }>(item: T): Record<string, unknown> {
  const { id: _id, ...rest } = item
  return { ...rest, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), deletedAt: null }
}

async function existingIds(db: Firestore, uid: string, name: string): Promise<Set<string>> {
  const snap = await getDocs(collection(db, 'users', uid, name))
  return new Set(snap.docs.map((d) => d.id))
}

/**
 * Записывает импортированные данные пачками по 400. Уже существующие записи не трогает,
 * поэтому повторный запуск безопасен: правки, сделанные после первого импорта, не затираются
 */
export async function writeImport(
  db: Firestore,
  uid: string,
  projects: ImportedProject[],
  tasks: ImportedTask[],
  habits: ImportedHabit[] = [],
  checkins: ImportedCheckin[] = [],
  onProgress?: (done: number, total: number) => void,
  groups: ImportedGroup[] = [],
  columns: ImportedColumn[] = [],
): Promise<WriteResult> {
  const haveGroups = await existingIds(db, uid, 'projectGroups')
  const haveColumns = await existingIds(db, uid, 'columns')
  const haveProjects = await existingIds(db, uid, 'projects')
  const haveTasks = await existingIds(db, uid, 'tasks')
  const haveHabits = await existingIds(db, uid, 'habits')
  const haveCheckins = await existingIds(db, uid, 'habitCheckins')

  const newGroups = groups.filter((g) => !haveGroups.has(g.id))
  const newColumns = columns.filter((c) => !haveColumns.has(c.id))
  const newProjects = projects.filter((p) => !haveProjects.has(p.id))
  const newTasks = tasks.filter((t) => !haveTasks.has(t.id))
  const newHabits = habits.filter((h) => !haveHabits.has(h.id))
  const newCheckins = checkins.filter((c) => !haveCheckins.has(c.id))
  const total = newGroups.length + newColumns.length + newProjects.length + newTasks.length + newHabits.length + newCheckins.length

  type Op = { path: string[]; data: Record<string, unknown> }
  const ops: Op[] = [
    ...newGroups.map((g) => ({ path: ['users', uid, 'projectGroups', g.id], data: body(g) })),
    ...newColumns.map((c) => ({ path: ['users', uid, 'columns', c.id], data: body(c) })),
    ...newProjects.map((p) => ({ path: ['users', uid, 'projects', p.id], data: body(p) })),
    ...newTasks.map((t) => ({ path: ['users', uid, 'tasks', t.id], data: body(t) })),
    ...newHabits.map((h) => ({ path: ['users', uid, 'habits', h.id], data: body(h) })),
    ...newCheckins.map((c) => ({
      path: ['users', uid, 'habitCheckins', c.id],
      data: (({ id: _id, ...rest }) => ({ ...rest, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }))(c),
    })),
  ]

  let done = 0
  for (let i = 0; i < ops.length; i += BATCH) {
    const batch = writeBatch(db)
    for (const op of ops.slice(i, i + BATCH)) batch.set(doc(db, op.path[0], ...op.path.slice(1)), op.data)
    await batch.commit()
    done += Math.min(BATCH, ops.length - i)
    onProgress?.(done, total)
  }

  return {
    groups: { added: newGroups.length, existing: groups.length - newGroups.length },
    columns: { added: newColumns.length, existing: columns.length - newColumns.length },
    projects: { added: newProjects.length, existing: projects.length - newProjects.length },
    tasks: { added: newTasks.length, existing: tasks.length - newTasks.length },
    habits: { added: newHabits.length, existing: habits.length - newHabits.length },
    checkins: { added: newCheckins.length, existing: checkins.length - newCheckins.length },
  }
}
