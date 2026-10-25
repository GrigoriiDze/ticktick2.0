import { describe, expect, it } from 'vitest'
import { localToMs, type DateCtx } from './dates'
import { describeChanges, diffTask, mergeChanges, rollbackPatch } from './history'
import { INBOX_ID, type Task } from './types'

const MSK = 'Europe/Moscow'
const ctx: DateCtx = { now: localToMs('2026-10-22', '15:00', MSK), tz: MSK }

const task = (over: Partial<Task> = {}): Task =>
  ({
    id: 't', projectId: INBOX_ID, parentId: null, columnId: null, sortOrder: 0, title: 'Позвонить', content: '', kind: 'text', items: {}, priority: 0, status: 'open',
    completedAt: null, start: null, due: null, isAllDay: false, timeZone: null, repeat: null, repeatFrom: 'due', exDates: [], reminders: {}, tags: [], pinnedAt: null,
    waiting: null, address: null, sourceId: null, createdAt: null, updatedAt: null, deletedAt: null, ...over,
  }) as Task

describe('что попадает в историю', () => {
  it('меняется только то, что действительно изменилось', () => {
    const d = diffTask(task(), { title: 'Позвонить', priority: 5, sortOrder: 9 })
    expect(Object.keys(d)).toEqual(['priority'])
    expect(d.priority).toEqual({ from: 0, to: 5 })
  })

  it('«не задано» и null считаются одним и тем же', () => {
    expect(diffTask(task(), { duration: null, address: null })).toEqual({})
  })

  it('порядок и колонка в историю не идут', () => {
    expect(diffTask(task(), { sortOrder: 5, columnId: 'c', pinnedAt: 1 })).toEqual({})
  })
})

describe('склейка правок подряд', () => {
  it('набор названия по буквам даёт одну запись: было из первой, стало из последней', () => {
    let c = diffTask(task({ title: 'А' }), { title: 'Аб' })
    c = mergeChanges(c, diffTask(task({ title: 'Аб' }), { title: 'Абв' }))
    expect(c.title).toEqual({ from: 'А', to: 'Абв' })
  })

  it('если всё вернули как было, запись пустеет', () => {
    let c = diffTask(task({ priority: 0 }), { priority: 5 })
    c = mergeChanges(c, diffTask(task({ priority: 5 }), { priority: 0 }))
    expect(c).toEqual({})
  })

  it('разные поля остаются в одной записи', () => {
    const c = mergeChanges(diffTask(task(), { title: 'Б' }), diffTask(task(), { priority: 3 }))
    expect(Object.keys(c).sort()).toEqual(['priority', 'title'])
  })
})

describe('откат и подписи', () => {
  it('откат возвращает «было» всех полей записи', () => {
    const c = diffTask(task({ due: '2026-10-25', isAllDay: true }), { due: localToMs('2026-10-26', '10:00', MSK), isAllDay: false })
    expect(rollbackPatch(c)).toEqual({ due: '2026-10-25', isAllDay: true })
  })

  it('подписи по-русски, срок с числом, а не «Завтра»', () => {
    const c = diffTask(task({ due: '2026-10-23' }), { due: localToMs('2026-10-30', '10:00', MSK), title: 'Новое' })
    const lines = describeChanges(c, ctx, () => '')
    expect(lines).toContain('Название: «Позвонить» → «Новое»')
    expect(lines).toContain('Срок: 23 окт. → 30 окт. 10:00')
  })

  it('перенос в другой список, выполнение, срок убран', () => {
    const lines = describeChanges(diffTask(task(), { projectId: 'p2', status: 'done', completedAt: 1 }), ctx, (id) => (id === 'p2' ? 'План' : 'Входящие'))
    expect(lines).toEqual(['Список: Входящие → План', 'Выполнена'])
    expect(describeChanges(diffTask(task({ due: '2026-10-23' }), { due: null }), ctx, () => '')).toEqual(['Срок убран'])
  })
})
