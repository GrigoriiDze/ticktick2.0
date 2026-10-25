import { plainText } from './extras'
import type { Project, Task } from './types'

export interface SearchResult {
  tasks: Task[]
  /** Списки, в названии которых есть искомое */
  projects: Project[]
  /** Метки, в названии которых есть искомое, с числом открытых задач */
  tags: Array<{ tag: string; count: number }>
}

const words = (query: string) => query.toLowerCase().split(/\s+/).filter(Boolean)

/**
 * Поиск по всем задачам сразу: название, описание, метки, адрес, пункты чек-листа и название списка.
 * Каждое слово запроса должно где-то встретиться. Открытые выше выполненных, совпадения в названии выше остальных,
 * закреплённые выше прочих. Задачи из корзины не ищем
 */
export function searchWorkspace(tasks: Task[], projects: Project[], query: string, limit = 200): SearchResult {
  const w = words(query)
  if (w.length === 0) return { tasks: [], projects: [], tags: [] }
  const listName = new Map(projects.map((p) => [p.id, p.name.toLowerCase()]))
  const hay = (t: Task) =>
    [t.title, plainText(t.content), t.tags.join(' '), t.address ?? '', Object.values(t.items).map((i) => i.title).join(' '), listName.get(t.projectId) ?? ''].join('\n').toLowerCase()
  const inTitle = (t: Task) => w.every((x) => t.title.toLowerCase().includes(x))
  const rank = (t: Task) => (t.status === 'open' ? 0 : 4) + (inTitle(t) ? 0 : 2) + (t.pinnedAt !== null ? 0 : 1)
  const found = tasks
    .filter((t) => t.deletedAt === null && w.every((x) => hay(t).includes(x)))
    .sort((a, b) => rank(a) - rank(b))
    .slice(0, limit)

  const tagCounts = new Map<string, number>()
  for (const t of tasks) if (t.status === 'open' && t.deletedAt === null) for (const tag of t.tags) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1)
  return {
    tasks: found,
    projects: projects.filter((p) => !p.isInbox && !p.closed && w.every((x) => p.name.toLowerCase().includes(x))),
    tags: [...tagCounts].filter(([tag]) => w.every((x) => tag.toLowerCase().includes(x.replace(/^#/, '')))).map(([tag, count]) => ({ tag, count })),
  }
}
