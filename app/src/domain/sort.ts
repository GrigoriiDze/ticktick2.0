import { compareTasks, type DateCtx } from './dates'
import { plainText } from './extras'
import type { Task } from './types'

export type SortMode = 'date' | 'priority' | 'title'

export const SORT_MODES: Array<{ id: SortMode; title: string }> = [
  { id: 'date', title: 'По сроку' },
  { id: 'priority', title: 'По важности' },
  { id: 'title', title: 'По названию' },
]

/** Порядок в списке. Закреплённые всегда сверху, дальше по выбранному признаку, при равенстве по сроку */
export function compareFor(mode: SortMode, ctx: DateCtx): (a: Task, b: Task) => number {
  if (mode === 'date') return (a, b) => compareTasks(a, b, ctx)
  return (a, b) => {
    if ((a.pinnedAt !== null) !== (b.pinnedAt !== null)) return a.pinnedAt !== null ? -1 : 1
    if (mode === 'priority') return b.priority - a.priority || compareTasks(a, b, ctx)
    return a.title.localeCompare(b.title, 'ru') || compareTasks(a, b, ctx)
  }
}

/** Поиск по названию, описанию, меткам и адресу. Каждое слово запроса должно где-то встретиться. Совпадения в названии идут первыми */
export function searchTasks(tasks: Task[], query: string, limit = 100): Task[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return []
  const hay = (t: Task) => `${t.title}\n${plainText(t.content)}\n${t.tags.join(' ')}\n${t.address ?? ''}`.toLowerCase()
  const hits = tasks.filter((t) => {
    const h = hay(t)
    return words.every((w) => h.includes(w))
  })
  const inTitle = (t: Task) => words.every((w) => t.title.toLowerCase().includes(w))
  // Открытые выше выполненных, внутри групп совпадения в названии выше остальных
  const rank = (t: Task) => (t.status === 'open' ? 0 : 2) + (inTitle(t) ? 0 : 1)
  return hits.sort((a, b) => rank(a) - rank(b)).slice(0, limit)
}
