import { compareTasks, type DateCtx } from './dates'
import { plainText } from './extras'
import type { Task } from './types'

export type SortMode = 'manual' | 'date' | 'priority' | 'title'
export type SortOrder = 'asc' | 'desc'

export const SORT_MODES: Array<{ id: SortMode; title: string }> = [
  { id: 'manual', title: 'По умолчанию' },
  { id: 'date', title: 'По сроку' },
  { id: 'priority', title: 'По важности' },
  { id: 'title', title: 'По названию' },
]

/** Порядок в списке. Закреплённые всегда сверху, дальше по выбранному признаку, при равенстве по сроку */
export function compareFor(
  mode: SortMode,
  ctxOrOrder: DateCtx | SortOrder,
  maybeCtx?: DateCtx,
): (a: Task, b: Task) => number {
  const order: SortOrder = typeof ctxOrOrder === 'string' ? ctxOrOrder : 'asc'
  const ctx: DateCtx = typeof ctxOrOrder === 'string' ? maybeCtx! : ctxOrOrder

  return (a: Task, b: Task) => {
    if ((a.pinnedAt !== null) !== (b.pinnedAt !== null)) return a.pinnedAt !== null ? -1 : 1

    let diff = 0
    if (mode === 'manual') {
      diff = a.sortOrder - b.sortOrder || compareTasks(a, b, ctx)
    } else if (mode === 'date') {
      diff = compareTasks(a, b, ctx)
    } else if (mode === 'priority') {
      diff = b.priority - a.priority || compareTasks(a, b, ctx)
    } else if (mode === 'title') {
      diff = a.title.localeCompare(b.title, 'ru') || compareTasks(a, b, ctx)
    }

    return order === 'desc' ? -diff : diff
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
