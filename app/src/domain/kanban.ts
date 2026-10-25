import { orderBetween } from './order'
import type { BoardColumn, Task } from './types'

export interface Board {
  /** Задачи без колонки: показываются первой полосой, как «Без группы» */
  none: Task[]
  columns: Array<{ column: BoardColumn; tasks: Task[] }>
}

const bySort = (a: { sortOrder: number }, b: { sortOrder: number }) => a.sortOrder - b.sortOrder

/**
 * Раскладывает открытые задачи списка по колонкам. Задача, чья колонка удалена или
 * принадлежит другому списку, считается лежащей без колонки, чтобы не пропасть с доски
 */
export function buildBoard(projectId: string, tasks: Task[], columns: BoardColumn[]): Board {
  const mine = columns.filter((c) => c.projectId === projectId).sort((a, b) => bySort(a, b) || a.name.localeCompare(b.name))
  const ids = new Set(mine.map((c) => c.id))
  const open = tasks.filter((t) => t.projectId === projectId && t.status === 'open' && t.parentId === null)
  const none = open.filter((t) => !t.columnId || !ids.has(t.columnId)).sort(bySort)
  return { none, columns: mine.map((column) => ({ column, tasks: open.filter((t) => t.columnId === column.id).sort(bySort) })) }
}

/** Порядок для карточки, поставленной в колонку на позицию index (задачи колонки без неё самой) */
export function orderAt(siblings: Task[], index: number): number {
  const before = index > 0 ? siblings[index - 1].sortOrder : null
  const after = index < siblings.length ? siblings[index].sortOrder : null
  return orderBetween(before, after)
}

/** Порядок для новой колонки в конце доски */
export function nextColumnOrder(columns: BoardColumn[]): number {
  return orderBetween(columns.reduce<number | null>((m, c) => (m === null ? c.sortOrder : Math.max(m, c.sortOrder)), null), null)
}

/** Колонки по умолчанию для нового канбана, как у TickTick */
export const DEFAULT_COLUMNS = ['К выполнению', 'В работе', 'Готово']
