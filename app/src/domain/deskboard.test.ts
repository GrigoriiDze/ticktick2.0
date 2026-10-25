import { describe, expect, it } from 'vitest'
import { localToMs, type DateCtx } from './dates'
import { boardByDay, boardByProject, deskDayTitle, sectionsByDay } from './deskboard'
import { INBOX_ID, type Project, type Task } from './types'

const MSK = 'Europe/Moscow'
// 22 октября 2026 года, четверг
const ctx: DateCtx = { now: localToMs('2026-10-22', '15:00', MSK), tz: MSK }

function task(id: string, due: string | number | null, projectId = INBOX_ID): Task {
  return {
    id, projectId, parentId: null, columnId: null, sortOrder: 0, title: id, content: '', kind: 'text', items: {}, priority: 0, status: 'open',
    completedAt: null, start: null, due, isAllDay: typeof due === 'string', timeZone: null, repeat: null, repeatFrom: 'due', exDates: [],
    reminders: {}, tags: [], pinnedAt: null, waiting: null, address: null, sourceId: null, createdAt: null, updatedAt: null, deletedAt: null,
  }
}

const project = (id: string, name: string, isInbox = false) => ({ id, name, isInbox }) as Project

describe('доска на большом экране', () => {
  it('заголовок дня как у TickTick', () => {
    expect(deskDayTitle('2026-10-22', ctx)).toBe('четверг, Сегодня')
    expect(deskDayTitle('2026-10-23', ctx)).toBe('пятница, Завтра')
    expect(deskDayTitle('2026-10-24', ctx)).toBe('суббота, 24 октября')
  })

  it('«Сегодня» раскладывается по спискам, «Входящие» первыми, внутри просроченные сверху', () => {
    const cols = boardByProject(
      [task('a', '2026-10-22', 'plan'), task('b', '2026-10-18', 'plan'), task('c', '2026-10-22')],
      [project('plan', 'План'), project(INBOX_ID, 'Входящие', true)],
      ctx,
    )
    expect(cols.map((c) => c.title)).toEqual(['Входящие', 'План'])
    expect(cols[1].count).toBe(2)
    expect(cols[1].sections.map((s) => s.title)).toEqual(['Просрочено', 'четверг, Сегодня'])
  })

  it('«7 дней» раскладывается по дням, просроченные отдельной колонкой', () => {
    const cols = boardByDay([task('a', '2026-10-24'), task('b', '2026-10-01'), task('c', localToMs('2026-10-22', '18:00', MSK))], ctx)
    expect(cols.map((c) => c.title)).toEqual(['Просрочено', 'четверг, Сегодня', 'суббота, 24 октября'])
    expect(cols[0].day).toBeNull()
    expect(cols[2].day).toBe('2026-10-24')
  })

  it('«Все»: задачи без срока в конце', () => {
    const s = sectionsByDay([task('a', null), task('b', '2026-10-23'), task('c', '2026-10-02')], ctx)
    expect(s.map((x) => x.title)).toEqual(['Просрочено', 'пятница, Завтра', 'Без даты'])
  })
})
