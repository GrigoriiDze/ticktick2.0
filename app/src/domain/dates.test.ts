import { describe, expect, it } from 'vitest'
import {
  addDays,
  compareTasks,
  dayKeyOf,
  formatDue,
  isOverdue,
  localToMs,
  matchesSmartList,
  timeOf,
  type DateCtx,
} from './dates'
import { INBOX_ID, type Task } from './types'

const MSK = 'Europe/Moscow'

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

// 20 октября 2026, 15:00 по Москве
const NOW = localToMs('2026-10-20', '15:00', MSK)
const ctx: DateCtx = { now: NOW, tz: MSK }

describe('день и время в часовом поясе', () => {
  it('переводит местное время в момент и обратно', () => {
    const ms = localToMs('2026-10-20', '09:30', MSK)
    expect(ms).toBe(Date.UTC(2026, 9, 20, 6, 30))
    expect(dayKeyOf(ms, MSK)).toBe('2026-10-20')
    expect(timeOf(ms, MSK)).toBe('09:30')
  })

  it('один момент приходится на разные дни в разных часовых поясах', () => {
    const ms = Date.UTC(2026, 9, 20, 22, 30) // 22:30 UTC
    expect(dayKeyOf(ms, MSK)).toBe('2026-10-21') // 01:30
    expect(dayKeyOf(ms, 'Asia/Almaty')).toBe('2026-10-21') // 03:30
    expect(dayKeyOf(ms, 'America/New_York')).toBe('2026-10-20') // 18:30
  })

  it('полночь и последняя минута суток', () => {
    expect(dayKeyOf(localToMs('2026-10-20', '00:00', MSK), MSK)).toBe('2026-10-20')
    expect(dayKeyOf(localToMs('2026-10-20', '23:59', MSK), MSK)).toBe('2026-10-20')
  })

  it('учитывает летнее время в Нью-Йорке', () => {
    // Зимнее время UTC-5, летнее UTC-4. Переход 2026-11-01
    expect(localToMs('2026-10-31', '12:00', 'America/New_York')).toBe(Date.UTC(2026, 9, 31, 16))
    expect(localToMs('2026-11-02', '12:00', 'America/New_York')).toBe(Date.UTC(2026, 10, 2, 17))
  })

  it('сдвигает дни по календарю через границы месяцев и года', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
  })
})

describe('просрочено', () => {
  it('задача на весь день вчера просрочена, сегодня нет', () => {
    expect(isOverdue(task({ due: '2026-10-19', isAllDay: true }), ctx)).toBe(true)
    expect(isOverdue(task({ due: '2026-10-20', isAllDay: true }), ctx)).toBe(false)
  })

  it('задача со временем просрочена, когда время прошло', () => {
    expect(isOverdue(task({ due: localToMs('2026-10-20', '14:00', MSK) }), ctx)).toBe(true)
    expect(isOverdue(task({ due: localToMs('2026-10-20', '16:00', MSK) }), ctx)).toBe(false)
  })

  it('выполненная и без срока не просрочены', () => {
    expect(isOverdue(task({ due: '2026-10-01', status: 'done' }), ctx)).toBe(false)
    expect(isOverdue(task(), ctx)).toBe(false)
  })
})

describe('умные списки', () => {
  const overdue = task({ id: 'overdue', due: '2026-10-18' })
  const todayAllDay = task({ id: 'today', due: '2026-10-20' })
  const todayLate = task({ id: 'late', due: localToMs('2026-10-20', '23:30', MSK) })
  const tomorrow = task({ id: 'tomorrow', due: '2026-10-21' })
  const in6 = task({ id: 'in6', due: '2026-10-26' })
  const in7 = task({ id: 'in7', due: '2026-10-27' })
  const noDate = task({ id: 'nodate' })
  const done = task({ id: 'done', due: '2026-10-20', status: 'done' })
  const other = task({ id: 'other', projectId: 'p1', due: '2026-10-20' })
  const all = [overdue, todayAllDay, todayLate, tomorrow, in6, in7, noDate, done, other]
  const ids = (list: string) => all.filter((t) => matchesSmartList(list as never, t, ctx)).map((t) => t.id)

  it('Сегодня: просроченные и сегодняшние, без завтрашних и без срока', () => {
    expect(ids('today')).toEqual(['overdue', 'today', 'late', 'other'])
  })

  it('Завтра: только завтрашние', () => {
    expect(ids('tomorrow')).toEqual(['tomorrow'])
  })

  it('7 дней: от просроченных до шестого дня включительно', () => {
    expect(ids('week')).toEqual(['overdue', 'today', 'late', 'tomorrow', 'in6', 'other'])
  })

  it('Входящие: только из проекта «Входящие», без выполненных', () => {
    expect(ids('inbox')).not.toContain('other')
    expect(ids('inbox')).not.toContain('done')
    expect(ids('inbox')).toContain('nodate')
  })

  it('Все: все невыполненные', () => {
    expect(ids('all')).toHaveLength(8)
  })

  it('Выполнено: только выполненные, «не буду делать» отдельно', () => {
    expect(ids('done')).toEqual(['done'])
    const skipped = task({ id: 'skip', status: 'wontdo' })
    expect(matchesSmartList('wontdo', skipped, ctx)).toBe(true)
    expect(matchesSmartList('done', skipped, ctx)).toBe(false)
    expect(matchesSmartList('all', skipped, ctx)).toBe(false)
  })

  it('поздним вечером в Москве задача на сегодня ещё сегодняшняя, хотя в UTC день уже следующий', () => {
    const lateCtx: DateCtx = { now: localToMs('2026-10-20', '23:50', MSK), tz: MSK }
    expect(matchesSmartList('today', todayAllDay, lateCtx)).toBe(true)
    expect(matchesSmartList('tomorrow', tomorrow, lateCtx)).toBe(true)
  })

  it('задача на несколько дней видна в «Сегодня», пока идёт', () => {
    const range = task({ start: '2026-10-19', due: '2026-10-22' })
    expect(matchesSmartList('today', range, ctx)).toBe(true)
    expect(matchesSmartList('tomorrow', range, ctx)).toBe(true)
  })
})

describe('подписи срока', () => {
  it('сегодня, завтра, вчера, дата и год', () => {
    expect(formatDue(task({ due: '2026-10-20' }), ctx)?.text).toBe('Сегодня')
    expect(formatDue(task({ due: '2026-10-21' }), ctx)?.text).toBe('Завтра')
    expect(formatDue(task({ due: '2026-10-19' }), ctx)?.text).toBe('Вчера')
    expect(formatDue(task({ due: '2026-11-05' }), ctx)?.text).toBe('5 нояб.')
    expect(formatDue(task({ due: '2026-10-27' }), ctx)?.text).toBe('27 окт.')
    expect(formatDue(task({ due: '2027-01-15' }), ctx)?.text).toBe('15.01.2027')
  })

  it('со временем и пометка просрочки', () => {
    const t = task({ due: localToMs('2026-10-20', '10:30', MSK) })
    expect(formatDue(t, ctx)).toEqual({ text: '10:30', overdue: true, today: true })
    expect(formatDue(task({ due: localToMs('2026-10-21', '10:30', MSK) }), ctx)?.text).toBe('Завтра 10:30')
    expect(formatDue(task({ due: '2026-10-25' }), ctx)?.today).toBe(false)
  })

  it('без срока подписи нет', () => {
    expect(formatDue(task(), ctx)).toBeNull()
  })
})

describe('порядок', () => {
  it('сначала по сроку, затем по важности, без срока в конце', () => {
    const a = task({ id: 'a', due: '2026-10-22', priority: 0 })
    const b = task({ id: 'b', due: '2026-10-20', priority: 0 })
    const c = task({ id: 'c', due: '2026-10-20', priority: 5 })
    const d = task({ id: 'd' })
    const timed = task({ id: 'timed', due: localToMs('2026-10-20', '09:00', MSK) })
    const sorted = [a, b, c, d, timed].sort((x, y) => compareTasks(x, y, ctx)).map((t) => t.id)
    expect(sorted).toEqual(['c', 'b', 'timed', 'a', 'd'])
  })

  it('закреплённые сверху, свежее закрепление выше', () => {
    const a = task({ id: 'a', due: '2026-10-20' })
    const pinOld = task({ id: 'pinOld', due: '2026-10-25', pinnedAt: 100 })
    const pinNew = task({ id: 'pinNew', pinnedAt: 200 })
    const sorted = [a, pinOld, pinNew].sort((x, y) => compareTasks(x, y, ctx)).map((t) => t.id)
    expect(sorted).toEqual(['pinNew', 'pinOld', 'a'])
  })
})
