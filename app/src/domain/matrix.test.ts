import { describe, expect, it } from 'vitest'
import { localToMs, type DateCtx } from './dates'
import { buildMatrix, quadrantOf } from './matrix'
import { INBOX_ID, type Task } from './types'

const MSK = 'Europe/Moscow'
const ctx: DateCtx = { now: localToMs('2026-10-20', '15:00', MSK), tz: MSK }

function task(over: Partial<Task>): Task {
  return {
    id: 't', projectId: INBOX_ID, parentId: null, columnId: null, sortOrder: 0, title: 'Задача', content: '', kind: 'text', items: {},
    priority: 0, status: 'open', completedAt: null, start: null, due: null, isAllDay: false, timeZone: null, repeat: null, repeatFrom: 'due',
    exDates: [], reminders: {}, tags: [], pinnedAt: null, waiting: null, address: null, sourceId: null, createdAt: null, updatedAt: null, deletedAt: null,
    ...over,
  }
}

describe('матрица Эйзенхауэра', () => {
  it('срочное и важное: срок сегодня или раньше, приоритет средний и выше', () => {
    expect(quadrantOf(task({ priority: 5, due: '2026-10-20' }), ctx)).toBe('q1')
    expect(quadrantOf(task({ priority: 3, due: '2026-10-10' }), ctx)).toBe('q1')
  })
  it('важное без срока или со сроком позже', () => {
    expect(quadrantOf(task({ priority: 5 }), ctx)).toBe('q2')
    expect(quadrantOf(task({ priority: 3, due: '2026-10-21' }), ctx)).toBe('q2')
  })
  it('срочное, но без приоритета или с низким', () => {
    expect(quadrantOf(task({ priority: 0, due: '2026-10-20' }), ctx)).toBe('q3')
    expect(quadrantOf(task({ priority: 1, due: '2026-10-19' }), ctx)).toBe('q3')
  })
  it('остальное в последней клетке', () => {
    expect(quadrantOf(task({}), ctx)).toBe('q4')
    expect(quadrantOf(task({ priority: 1, due: '2026-12-01' }), ctx)).toBe('q4')
  })
  it('срок со временем считается по часовому поясу', () => {
    expect(quadrantOf(task({ priority: 5, due: localToMs('2026-10-20', '23:30', MSK) }), ctx)).toBe('q1')
    expect(quadrantOf(task({ priority: 5, due: localToMs('2026-10-21', '00:30', MSK) }), ctx)).toBe('q2')
  })
  it('закрытые и подзадачи не попадают, внутри клетки сначала важные и ранние', () => {
    const m = buildMatrix(
      [
        task({ id: 'a', priority: 3, due: '2026-10-20' }),
        task({ id: 'b', priority: 5, due: '2026-10-20' }),
        task({ id: 'c', status: 'done', priority: 5, due: '2026-10-20' }),
        task({ id: 'd', parentId: 'a', priority: 5, due: '2026-10-20' }),
      ],
      ctx,
    )
    expect(m.q1.map((t) => t.id)).toEqual(['b', 'a'])
    expect(m.q2).toEqual([])
  })
})
