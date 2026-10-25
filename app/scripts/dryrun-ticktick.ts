// Сухой прогон импорта из базы десктопного TickTick. Ничего никуда не пишет, только читает и считает
// Запуск из папки app: npx tsx scripts/dryrun-ticktick.ts <путь к TickTick.db>
import { habitStats } from '../src/domain/habits'
import type { CheckStatus } from '../src/domain/types'
import { convertCheckins, convertHabit, convertProject, convertTask } from '../src/import/ticktick'
import { readDesktopDb } from './ticktick-db'

const path = process.argv[2]
if (!path) {
  console.error('Укажите путь к TickTick.db')
  process.exit(1)
}

const desktop = readDesktopDb(path)
const allTasks = desktop.tasks
const rawTasks = desktop.tasks
const projectIds = new Set(desktop.projects.map((p) => p.id))
const projects = desktop.projects.map((p) => convertProject(p, projectIds))

const skipped = new Map<string, number>()
const notes = new Map<string, number>()
const tasks = []
for (const raw of rawTasks) {
  const r = convertTask(raw, projectIds)
  for (const n of r.notes) {
    if (r.value) notes.set(n, (notes.get(n) ?? 0) + 1)
    else skipped.set(n, (skipped.get(n) ?? 0) + 1)
  }
  if (r.value) tasks.push(r.value)
}

const by = <T>(list: T[], key: (t: T) => string) => {
  const m = new Map<string, number>()
  for (const x of list) m.set(key(x), (m.get(key(x)) ?? 0) + 1)
  return Object.fromEntries([...m].sort((a, b) => b[1] - a[1]))
}

const ids = new Set(tasks.map((t) => t.id))
const orphanParents = tasks.filter((t) => t.parentId && !ids.has(t.parentId)).length
const duplicateIds = tasks.length - ids.size
const itemsTotal = tasks.reduce((n, t) => n + Object.keys(t.items).length, 0)
const rules = new Set(tasks.filter((t) => t.repeat).map((t) => t.repeat!.replace(/^RRULE:/, '')))

console.log('СПИСКИ', projects.length, projects.map((p) => p.value?.name))
console.log('ЗАДАЧ В БАЗЕ', allTasks.length, '→ переносится', tasks.length, '| пропущено', Object.fromEntries(skipped))
console.log('по статусам', by(tasks, (t) => t.status))
console.log('по спискам', by(tasks, (t) => projects.find((p) => p.value?.id === t.projectId)?.value?.name ?? '?'))
console.log('сроки: на весь день', tasks.filter((t) => t.isAllDay && t.due).length, '| со временем', tasks.filter((t) => !t.isAllDay && t.due).length, '| на несколько дней', tasks.filter((t) => t.start).length, '| без срока', tasks.filter((t) => !t.due).length)
console.log('приоритеты', by(tasks, (t) => String(t.priority)))
console.log('повторяющихся', tasks.filter((t) => t.repeat).length, '| разных правил', rules.size)
console.log('правила', [...rules])
console.log('с напоминаниями', tasks.filter((t) => Object.keys(t.reminders).length).length, '| чек-листов', tasks.filter((t) => t.kind === 'checklist').length, '| пунктов в них', itemsTotal)
console.log('с тегами', tasks.filter((t) => t.tags.length).length, '| подзадач', tasks.filter((t) => t.parentId).length)
console.log('ПРОВЕРКИ целостности: задач без родителя', orphanParents, '| повторяющихся id', duplicateIds, '| пустых названий', tasks.filter((t) => !t.title.trim()).length)
console.log('ПРИМЕЧАНИЯ при переносе', Object.fromEntries(notes))
console.log('НЕ ПЕРЕНОСИТСЯ (пока): привычек', desktop.counts.habits, '| отметок привычек', desktop.counts.habitCheckins, '| помодоро', desktop.counts.pomodoros, '| колонок канбана', desktop.counts.columns, '| комментариев', desktop.counts.comments, '| вложений', desktop.counts.attachments)
console.log('Операций записи в базу было бы:', Math.ceil((tasks.length + projects.length) / 400), 'пачек по 400. Записано: 0')

// ---------- Привычки ----------
const checkins = convertCheckins(desktop.checkins, desktop.habitNotes)
const byHabit = new Map<string, Map<string, CheckStatus>>()
for (const c of checkins) {
  if (!byHabit.has(c.habitId)) byHabit.set(c.habitId, new Map())
  byHabit.get(c.habitId)!.set(c.day, c.status)
}
const firstDay = new Map<string, string>()
for (const c of checkins) if (!firstDay.has(c.habitId) || c.day < firstDay.get(c.habitId)!) firstDay.set(c.habitId, c.day)
const habits = desktop.habits.map((h) => convertHabit(h, firstDay.get(`tt-h-${h.id}`) ?? null).value).filter((h): h is NonNullable<typeof h> => h !== null)
const todayKey = new Date().toISOString().slice(0, 10)
console.log('ПРИВЫЧКИ', habits.length, '| активных', habits.filter((h) => h.archivedAt === null).length, '| отметок переносится', checkins.length, '(из', desktop.counts.habitCheckins + ')')
console.log('статистика активных (всего дней / серия / лучшая серия), порядок как в базе:')
for (const h of habits.filter((h) => h.archivedAt === null)) {
  const st = habitStats(h, byHabit.get(h.id) ?? new Map(), todayKey)
  console.log(' ', st.total, '/', st.currentStreak, '/', st.bestStreak)
}
