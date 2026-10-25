import { describe, expect, it } from 'vitest'
import { localToMs, type DateCtx } from './dates'
import { siteStats } from './sites'
import { compareWaiting, isStuck, isWaiting, waitingCount, waitingLabel } from './waiting'
import { INBOX_ID, type Task, type Waiting } from './types'

const MSK = 'Europe/Moscow'
const ctx: DateCtx = { now: localToMs('2026-10-20', '15:00', MSK), tz: MSK }

function task(over: Partial<Task> = {}): Task {
  return {
    id: 't',
    projectId: INBOX_ID,
    parentId: null,
    columnId: null,
    sortOrder: 0,
    title: 'Задача',
    content: '',
    kind: 'text',
    items: {},
    priority: 0,
    status: 'open',
    completedAt: null,
    start: null,
    due: null,
    isAllDay: false,
    timeZone: null,
    repeat: null,
    repeatFrom: 'due',
    exDates: [],
    reminders: {},
    tags: [],
    pinnedAt: null,
    waiting: null,
    address: null,
    sourceId: null,
    createdAt: null,
    updatedAt: null,
    deletedAt: null,
    ...over,
  }
}

const wait = (kind: Waiting['kind'], until: string | null = null) => ({ kind, until })

describe('метка «ждём»', () => {
  it('ждёт только открытая задача с меткой', () => {
    expect(isWaiting(task({ waiting: wait('payment') }))).toBe(true)
    expect(isWaiting(task())).toBe(false)
    expect(isWaiting(task({ waiting: wait('payment'), status: 'done' }))).toBe(false)
  })

  it('зависла, когда срок ожидания прошёл', () => {
    expect(isStuck(task({ waiting: wait('delivery', '2026-10-19') }), ctx)).toBe(true)
    expect(isStuck(task({ waiting: wait('delivery', '2026-10-20') }), ctx)).toBe(false) // сегодня ещё ждём
    expect(isStuck(task({ waiting: wait('delivery', '2026-10-25') }), ctx)).toBe(false)
    expect(isStuck(task({ waiting: wait('delivery') }), ctx)).toBe(false) // без срока не зависает
    expect(isStuck(task(), ctx)).toBe(false)
  })

  it('подписи по-русски', () => {
    expect(waitingLabel(wait('payment', '2026-10-25'), ctx)).toBe('Ждём оплату до 25 окт')
    expect(waitingLabel(wait('delivery'), ctx)).toBe('Ждём поставку')
    expect(waitingLabel(wait('approval', '2026-10-21'), ctx)).toBe('Ждём согласование до Завтра')
  })

  it('порядок: просроченные, потом по сроку, без срока в конце', () => {
    const list = [
      task({ id: 'noDate', waiting: wait('approval') }),
      task({ id: 'later', waiting: wait('payment', '2026-10-30') }),
      task({ id: 'overdue', waiting: wait('delivery', '2026-10-10') }),
      task({ id: 'soon', waiting: wait('payment', '2026-10-22') }),
      task({ id: 'veryOverdue', waiting: wait('payment', '2026-10-01') }),
    ]
    expect(list.sort((a, b) => compareWaiting(a, b, ctx)).map((t) => t.id)).toEqual(['veryOverdue', 'overdue', 'soon', 'later', 'noDate'])
  })

  it('счётчики для меню', () => {
    const list = [
      task({ waiting: wait('payment', '2026-10-01') }),
      task({ waiting: wait('delivery', '2026-10-30') }),
      task({ waiting: wait('delivery'), status: 'done' }),
      task(),
    ]
    expect(waitingCount(list, ctx)).toEqual({ total: 2, stuck: 1 })
  })
})

describe('карточка объекта: ожидание и выезды', () => {
  const at = (day: string, time: string) => localToMs(day, time, MSK)

  it('считает зависшие задачи объекта и выезды на ближайшие семь дней', () => {
    const tasks = [
      task({ id: 'a', projectId: 'p', waiting: wait('payment', '2026-10-10') }),
      task({ id: 'b', projectId: 'p', waiting: wait('delivery', '2026-10-30') }),
      task({ id: 'c', projectId: 'p', address: 'Свободы 5', due: at('2026-10-22', '10:00') }),
      task({ id: 'd', projectId: 'p', address: 'Республики 12', due: at('2026-10-26', '09:00') }),
      task({ id: 'e', projectId: 'p', address: 'Свободы 5', due: at('2026-10-27', '09:00') }), // восьмой день, не входит
      task({ id: 'f', projectId: 'p', address: 'Свободы 5', due: at('2026-10-19', '09:00') }), // вчера
      task({ id: 'g', projectId: 'p', address: '  ', due: at('2026-10-22', '11:00') }), // адрес пустой
      task({ id: 'h', projectId: 'other', address: 'Свободы 5', due: at('2026-10-22', '10:00') }),
    ]
    const s = siteStats('p', tasks, ctx)
    expect(s.waiting).toBe(2)
    expect(s.stuck).toBe(1)
    expect(s.visits).toBe(2)
  })

  it('выезды на весь день тоже считаются, выполненные нет', () => {
    const tasks = [
      task({ projectId: 'p', address: 'Свободы 5', due: '2026-10-21', isAllDay: true }),
      task({ projectId: 'p', address: 'Свободы 5', due: '2026-10-21', isAllDay: true, status: 'done' }),
    ]
    expect(siteStats('p', tasks, ctx).visits).toBe(1)
  })
})
