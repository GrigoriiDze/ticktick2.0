import { describe, expect, it } from 'vitest'
import { localToMs, type DateCtx } from './dates'
import { compareFor, searchTasks } from './sort'
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

describe('сортировка списка', () => {
  const a = task({ id: 'a', title: 'Ясень', priority: 5, due: '2026-10-25' })
  const b = task({ id: 'b', title: 'Берёза', priority: 1, due: '2026-10-21' })
  const c = task({ id: 'c', title: 'Вяз', priority: 5, due: '2026-10-22', pinnedAt: 10 })
  const order = (mode: 'date' | 'priority' | 'title') => [a, b, c].sort(compareFor(mode, ctx)).map((t) => t.id)

  it('по сроку, закреплённая сверху', () => expect(order('date')).toEqual(['c', 'b', 'a']))
  it('по важности, при равенстве по сроку', () => expect(order('priority')).toEqual(['c', 'a', 'b']))
  it('по названию по-русски, закреплённая сверху', () => expect(order('title')).toEqual(['c', 'b', 'a']))
})

describe('поиск', () => {
  const tasks = [
    task({ id: '1', title: 'Замер на Свободы', address: 'Свободы 12', tags: ['объект'] }),
    task({ id: '2', title: 'Позвонить', content: 'Узнать про замер у заказчика' }),
    task({ id: '3', title: 'Замер в офисе', status: 'done' }),
    task({ id: '4', title: 'Купить болты' }),
  ]

  it('ищет по названию, описанию, меткам и адресу без учёта регистра', () => {
    expect(searchTasks(tasks, 'ЗАМЕР').map((t) => t.id)).toEqual(['1', '2', '3'])
    expect(searchTasks(tasks, 'свободы 12').map((t) => t.id)).toEqual(['1'])
    expect(searchTasks(tasks, 'объект').map((t) => t.id)).toEqual(['1'])
  })

  it('все слова запроса должны встретиться', () => {
    expect(searchTasks(tasks, 'замер заказчика').map((t) => t.id)).toEqual(['2'])
  })

  it('совпадение в названии выше, открытые выше выполненных', () => {
    expect(searchTasks(tasks, 'замер').map((t) => t.id)).toEqual(['1', '2', '3'])
  })

  it('описание, сохранённое редактором с экранированием, находится по обычным символам', () => {
    const t = task({ id: '5', title: 'КП', content: 'Размер 2\\*3 &amp; запас a&lt;b' })
    expect(searchTasks([t], '2*3').map((x) => x.id)).toEqual(['5'])
    expect(searchTasks([t], '& запас').map((x) => x.id)).toEqual(['5'])
    expect(searchTasks([t], 'a<b').map((x) => x.id)).toEqual(['5'])
  })

  it('пустой запрос ничего не находит', () => {
    expect(searchTasks(tasks, '   ')).toEqual([])
  })
})
