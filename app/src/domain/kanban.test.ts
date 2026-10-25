import { describe, expect, it } from 'vitest'
import { buildBoard, nextColumnOrder, orderAt } from './kanban'
import { INBOX_ID, type BoardColumn, type Task } from './types'

function task(over: Partial<Task>): Task {
  return {
    id: 't', projectId: 'p', parentId: null, columnId: null, sortOrder: 0, title: 'Задача', content: '', kind: 'text', items: {},
    priority: 0, status: 'open', completedAt: null, start: null, due: null, isAllDay: false, timeZone: null, repeat: null, repeatFrom: 'due',
    exDates: [], reminders: {}, tags: [], pinnedAt: null, waiting: null, address: null, sourceId: null, createdAt: null, updatedAt: null, deletedAt: null,
    ...over,
  }
}
const column = (id: string, over: Partial<BoardColumn> = {}): BoardColumn => ({ id, projectId: 'p', name: id, sortOrder: 0, createdAt: null, updatedAt: null, deletedAt: null, ...over })
const ids = (l: Task[]) => l.map((t) => t.id)

describe('канбан', () => {
  it('задачи раскладываются по колонкам, колонки по порядку', () => {
    const b = buildBoard('p', [task({ id: 'a', columnId: 'c2', sortOrder: 2 }), task({ id: 'b', columnId: 'c2', sortOrder: 1 }), task({ id: 'c', columnId: 'c1' })], [column('c2', { sortOrder: 2 }), column('c1', { sortOrder: 1 })])
    expect(b.columns.map((c) => c.column.id)).toEqual(['c1', 'c2'])
    expect(ids(b.columns[1].tasks)).toEqual(['b', 'a'])
    expect(ids(b.columns[0].tasks)).toEqual(['c'])
  })
  it('без колонки и с удалённой колонкой лежат в полосе «без колонки»', () => {
    const b = buildBoard('p', [task({ id: 'a' }), task({ id: 'b', columnId: 'gone' })], [column('c1')])
    expect(ids(b.none)).toEqual(['a', 'b'])
  })
  it('чужие списки, закрытые и подзадачи на доску не попадают', () => {
    const b = buildBoard('p', [task({ id: 'a', projectId: INBOX_ID }), task({ id: 'b', status: 'done' }), task({ id: 'c', parentId: 'x' }), task({ id: 'd' })], [column('c1', { projectId: 'q' })])
    expect(ids(b.none)).toEqual(['d'])
    expect(b.columns).toEqual([])
  })
  it('порядок при переносе между соседями и по краям', () => {
    const s = [task({ id: 'a', sortOrder: 10 }), task({ id: 'b', sortOrder: 20 })]
    expect(orderAt(s, 0)).toBeLessThan(10)
    expect(orderAt(s, 1)).toBe(15)
    expect(orderAt(s, 2)).toBeGreaterThan(20)
    expect(orderAt([], 0)).toBeGreaterThan(0)
  })
  it('новая колонка после всех', () => {
    expect(nextColumnOrder([])).toBeGreaterThan(0)
    expect(nextColumnOrder([column('a', { sortOrder: 5 }), column('b', { sortOrder: 9 })])).toBeGreaterThan(9)
  })
})
