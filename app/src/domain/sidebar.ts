import type { Project, ProjectGroup } from './types'

/** Строка бокового меню: список сам по себе или папка со своими списками */
export type SidebarItem = { kind: 'project'; project: Project } | { kind: 'group'; group: ProjectGroup; projects: Project[] }

const bySort = (a: { sortOrder: number; name: string }, b: { sortOrder: number; name: string }) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'ru')

/**
 * Дерево бокового меню. Папки и списки без папки идут вперемешку по общему порядку, как в TickTick.
 * Входящие здесь не показываем, у них своё место наверху. Список с папкой, которой уже нет, не пропадает: показывается сам по себе
 */
export function buildSidebar(projects: Project[], groups: ProjectGroup[]): SidebarItem[] {
  const groupIds = new Set(groups.map((g) => g.id))
  const own = projects.filter((p) => !p.isInbox)
  const items: Array<{ order: number; name: string; item: SidebarItem }> = []

  for (const g of groups) {
    const kids = own.filter((p) => p.groupId === g.id).sort(bySort)
    items.push({ order: g.sortOrder, name: g.name, item: { kind: 'group', group: g, projects: kids } })
  }
  for (const p of own) {
    if (p.groupId && groupIds.has(p.groupId)) continue
    items.push({ order: p.sortOrder, name: p.name, item: { kind: 'project', project: p } })
  }
  return items.sort((a, b) => bySort({ sortOrder: a.order, name: a.name }, { sortOrder: b.order, name: b.name })).map((i) => i.item)
}

/** Куда ставить новый список или папку: после всего, что уже есть */
export function nextSortOrder(projects: Project[], groups: ProjectGroup[]): number {
  const all = [...projects.filter((p) => !p.isInbox).map((p) => p.sortOrder), ...groups.map((g) => g.sortOrder)]
  return all.length ? Math.max(...all) + 1 : 1
}
