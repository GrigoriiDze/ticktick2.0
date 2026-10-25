import { describe, expect, it } from 'vitest'
import { localToMs, type DateCtx } from './dates'
import { groupByMode, groupDone, groupTasks } from './groups'
import { INBOX_ID, type Task } from './types'

const MSK = 'Europe/Moscow'
const ctx: DateCtx = { now: localToMs('2026-10-20', '15:00', MSK), tz: MSK }

function task(id: string, due: string | number | null): Task {
  return {
    id,
    projectId: INBOX_ID,
    parentId: null,
    columnId: null,
    sortOrder: 0,
    title: id,
    content: '',
    kind: 'text',
    items: {},
    priority: 0,
    status: 'open',
    completedAt: null,
    start: null,
    due,
    isAllDay: typeof due === 'string',
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
  }
}

describe('секции списков', () => {
  it('«Сегодня»: просроченные отдельно от сегодняшних', () => {
    const g = groupTasks('today', [task('a', '2026-10-18'), task('b', '2026-10-20'), task('c', localToMs('2026-10-20', '10:00', MSK)), task('d', '2026-10-01')], ctx)!
    expect(g.map((x) => [x.title, x.tasks.map((t) => t.id)])).toEqual([
      ['Просрочено', ['a', 'd']],
      ['Сегодня', ['b', 'c']],
    ])
  })

  it('если секция одна, заголовков нет', () => {
    expect(groupTasks('today', [task('a', '2026-10-20')], ctx)).toBeNull()
    expect(groupTasks('today', [task('a', '2026-10-10')], ctx)).toBeNull()
    expect(groupTasks('today', [], ctx)).toBeNull()
  })

  it('«7 дней»: по дням, просроченные первыми, подписи по-русски', () => {
    const g = groupTasks('week', [task('a', '2026-10-22'), task('b', '2026-10-18'), task('c', '2026-10-20'), task('d', '2026-10-21'), task('e', '2026-10-22'), task('f', '2026-10-25')], ctx)!
    expect(g.map((x) => x.title)).toEqual(['Просрочено', 'Сегодня', 'Завтра', 'Чт, 22 окт', 'Вс, 25 окт'])
    expect(g[3].tasks.map((t) => t.id)).toEqual(['a', 'e'])
  })

  it('в остальных списках секций нет', () => {
    for (const id of ['tomorrow', 'inbox', 'all', 'done'] as const) expect(groupTasks(id, [task('a', '2026-10-18'), task('b', '2026-10-20')], ctx)).toBeNull()
  })

  it('задачи без срока пропускаются', () => {
    const g = groupTasks('week', [task('a', null), task('b', '2026-10-20'), task('c', '2026-10-21')], ctx)!
    expect(g.flatMap((x) => x.tasks.map((t) => t.id))).toEqual(['b', 'c'])
  })
})

describe('группировка по выбору', () => {
  const withP = (id: string, priority: 0 | 1 | 3 | 5, tags: string[] = [], due: string | null = null) => ({ ...task(id, due), priority, tags })

  it('по важности: сначала высокий, без приоритета в конце', () => {
    const g = groupByMode('priority', [withP('a', 0), withP('b', 5), withP('c', 3), withP('d', 5)], ctx)!
    expect(g.map((x) => [x.title, x.tasks.map((t) => t.id)])).toEqual([
      ['Высокий приоритет', ['b', 'd']],
      ['Средний приоритет', ['c']],
      ['Без приоритета', ['a']],
    ])
  })

  it('по метке: без метки в конце, одна секция заголовков не даёт', () => {
    const g = groupByMode('tag', [withP('a', 0), withP('b', 0, ['срочно']), withP('c', 0, ['бухгалтерия'])], ctx)!
    expect(g.map((x) => x.title)).toEqual(['#бухгалтерия', '#срочно', 'Без метки'])
    expect(groupByMode('tag', [withP('a', 0, ['x']), withP('b', 0, ['x'])], ctx)).toBeNull()
  })

  it('по сроку: просрочено, сегодня, завтра, дни недели, позже, без срока', () => {
    const g = groupByMode('date', [withP('a', 0, [], null), withP('b', 0, [], '2026-12-01'), withP('c', 0, [], '2026-10-01'), withP('d', 0, [], '2026-10-20'), withP('e', 0, [], '2026-10-21'), withP('f', 0, [], '2026-10-24')], ctx)!
    expect(g.map((x) => x.title)).toEqual(['Просрочено', 'Сегодня', 'Завтра', 'Сб, 24 окт', 'Позже', 'Без срока'])
  })

  it('«без группировки» секций не даёт', () => {
    expect(groupByMode('none', [withP('a', 5), withP('b', 0)], ctx)).toBeNull()
  })

  it('выполненные: по дням, свежие сверху', () => {
    const done = (id: string, day: string) => ({ ...task(id, null), status: 'done' as const, completedAt: localToMs(day, '12:00', MSK) })
    const g = groupDone([done('a', '2026-10-20'), done('b', '2026-10-18'), done('c', '2026-10-20')], ctx)!
    expect(g.map((x) => [x.title, x.tasks.map((t) => t.id)])).toEqual([
      ['Сегодня', ['a', 'c']],
      ['Вс, 18 окт', ['b']],
    ])
  })
})
