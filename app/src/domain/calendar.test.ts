import { describe, expect, it } from 'vitest'
import { calTitle, doneOnDay, eventsByDay, layoutColumns, mondayOf, monthGrid, rangeTitle, shiftAnchor, threeDays, tightTransfers, twoWeeks, weekDays, weekdayIndex, yearMonths, type CalEvent } from './calendar'
import { localToMs, type DateCtx } from './dates'
import { INBOX_ID, type Task } from './types'

const MSK = 'Europe/Moscow'
const ctx: DateCtx = { now: localToMs('2026-10-20', '15:00', MSK), tz: MSK }
const at = (day: string, time: string) => localToMs(day, time, MSK)

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

describe('недели и месяцы', () => {
  it('день недели и понедельник', () => {
    // 20 октября 2026 это вторник
    expect(weekdayIndex('2026-10-20')).toBe(1)
    expect(mondayOf('2026-10-20')).toBe('2026-10-19')
    expect(mondayOf('2026-10-19')).toBe('2026-10-19')
    expect(mondayOf('2026-10-25')).toBe('2026-10-19') // воскресенье относится к прошедшей неделе
  })

  it('неделя из семи дней с понедельника', () => {
    const w = weekDays('2026-10-22')
    expect(w[0]).toBe('2026-10-19')
    expect(w[6]).toBe('2026-10-25')
    expect(w).toHaveLength(7)
  })

  it('сетка месяца включает хвосты соседних месяцев', () => {
    const g = monthGrid('2026-10-20')
    expect(g[0][0]).toBe('2026-09-28') // 1 октября 2026 четверг
    expect(g[g.length - 1][6]).toBe('2026-11-01')
    expect(g.length).toBe(5)
    expect(g.every((w) => w.length === 7)).toBe(true)
  })

  it('месяц, который начинается с понедельника, не получает лишней недели вначале', () => {
    const g = monthGrid('2026-06-10') // 1 июня 2026 понедельник
    expect(g[0][0]).toBe('2026-06-01')
  })

  it('сдвиги: через границу года и подрезка числа', () => {
    expect(shiftAnchor('month', '2026-12-15', 1)).toBe('2027-01-15')
    expect(shiftAnchor('month', '2027-01-15', -1)).toBe('2026-12-15')
    expect(shiftAnchor('month', '2026-01-31', 1)).toBe('2026-02-28')
    expect(shiftAnchor('month', '2028-01-31', 1)).toBe('2028-02-29')
    expect(shiftAnchor('week', '2026-12-30', 1)).toBe('2027-01-06')
    expect(shiftAnchor('day', '2026-03-01', -1)).toBe('2026-02-28')
    expect(shiftAnchor('days3', '2026-10-30', 1)).toBe('2026-11-02')
    expect(shiftAnchor('list', '2026-10-20', -1)).toBe('2026-10-13')
    expect(shiftAnchor('year', '2026-10-20', 1)).toBe('2027-10-20')
    expect(shiftAnchor('year', '2028-02-29', 1)).toBe('2029-02-28')
  })

  it('заголовки', () => {
    expect(rangeTitle('month', '2026-10-20')).toBe('Октябрь 2026')
    expect(rangeTitle('day', '2026-10-20')).toBe('Вторник, 20 октября')
    expect(rangeTitle('week', '2026-10-20')).toBe('19–25 окт')
    expect(rangeTitle('week', '2026-10-29')).toBe('26 окт – 1 ноя')
  })
})

describe('события по дням', () => {
  const range = (tasks: Task[]) => eventsByDay(tasks, ctx, '2026-10-19', '2026-10-25')

  it('задача на весь день и со временем', () => {
    const all = task({ id: 'a', due: '2026-10-20', isAllDay: true })
    const timed = task({ id: 'b', due: at('2026-10-20', '14:30') })
    const day = range([all, timed]).get('2026-10-20')!
    expect(day.map((e) => e.task.id)).toEqual(['a', 'b']) // весь день первым
    expect(day[0].startMin).toBeNull()
    expect(day[1].startMin).toBe(14 * 60 + 30)
    expect(day[1].endMin).toBe(15 * 60 + 30) // час по умолчанию
  })

  it('задача с началом и сроком в один день занимает этот промежуток', () => {
    const t = task({ start: at('2026-10-20', '10:00'), due: at('2026-10-20', '12:15') })
    const [e] = range([t]).get('2026-10-20')!
    expect([e.startMin, e.endMin]).toEqual([600, 735])
  })

  it('поздний вечер не вылезает за сутки', () => {
    const [e] = range([task({ due: at('2026-10-20', '23:30') })]).get('2026-10-20')!
    expect(e.endMin).toBe(1440)
  })

  it('задача на несколько дней видна в каждом дне', () => {
    const t = task({ start: '2026-10-21', due: '2026-10-23', isAllDay: true })
    const m = range([t])
    expect([...m.keys()].sort()).toEqual(['2026-10-21', '2026-10-22', '2026-10-23'])
  })

  it('выполненные, без срока и вне периода не показываются', () => {
    const m = range([
      task({ id: '1', due: '2026-10-20', status: 'done' }),
      task({ id: '2' }),
      task({ id: '3', due: '2026-11-20' }),
    ])
    expect(m.size).toBe(0)
  })

  it('день определяется в часовом поясе устройства', () => {
    // 22:30 UTC это уже 1:30 следующего дня в Москве
    const t = task({ due: Date.UTC(2026, 9, 20, 22, 30) })
    expect([...range([t]).keys()]).toEqual(['2026-10-21'])
  })

  it('повторяющаяся задача показывается вперёд по правилу, текущий срок не дублируется', () => {
    const t = task({ id: 'r', due: '2026-10-19', isAllDay: true, repeat: 'RRULE:FREQ=WEEKLY;BYDAY=MO,TH' })
    const m = eventsByDay([t], ctx, '2026-10-19', '2026-11-01')
    expect([...m.keys()].sort()).toEqual(['2026-10-19', '2026-10-22', '2026-10-26', '2026-10-29'])
    expect(m.get('2026-10-19')!.map((e) => e.virtual)).toEqual([false])
    expect(m.get('2026-10-22')![0].virtual).toBe(true)
  })

  it('исключённые дни пропускаются, конец цикла соблюдается', () => {
    const t = task({ due: '2026-10-19', isAllDay: true, repeat: 'RRULE:FREQ=DAILY;UNTIL=20261022', exDates: ['2026-10-21'] })
    const m = eventsByDay([t], ctx, '2026-10-19', '2026-10-31')
    expect([...m.keys()].sort()).toEqual(['2026-10-19', '2026-10-20', '2026-10-22'])
  })

  it('счётчик COUNT ограничивает показанные повторы', () => {
    const t = task({ due: '2026-10-19', isAllDay: true, repeat: 'RRULE:FREQ=DAILY;COUNT=3' })
    expect(eventsByDay([t], ctx, '2026-10-19', '2026-10-31').size).toBe(3)
  })

  it('повтор со временем сохраняет время суток', () => {
    const t = task({ due: at('2026-10-19', '09:00'), repeat: 'RRULE:FREQ=DAILY' })
    const e = eventsByDay([t], ctx, '2026-10-19', '2026-10-21').get('2026-10-21')![0]
    expect(e.startMin).toBe(9 * 60)
  })
})

describe('раскладка по колонкам', () => {
  const ev = (id: string, s: number, e: number): CalEvent => ({ task: task({ id }), day: '2026-10-20', startMin: s, endMin: e, virtual: false })

  it('не пересекающиеся встают в одну колонку', () => {
    const p = layoutColumns([ev('a', 600, 660), ev('b', 660, 720)])
    expect(p.map((x) => [x.event.task.id, x.col, x.cols])).toEqual([['a', 0, 1], ['b', 0, 1]])
  })

  it('пересекающиеся делят ширину', () => {
    const p = layoutColumns([ev('a', 600, 720), ev('b', 630, 690)])
    expect(p.map((x) => [x.event.task.id, x.col, x.cols])).toEqual([['a', 0, 2], ['b', 1, 2]])
  })

  it('освободившаяся колонка переиспользуется внутри группы', () => {
    // a и b пересекаются, c начинается, когда b уже закончилась, но a ещё идёт
    const p = layoutColumns([ev('a', 600, 780), ev('b', 610, 650), ev('c', 660, 720)])
    const col = Object.fromEntries(p.map((x) => [x.event.task.id, x.col]))
    expect(col).toEqual({ a: 0, b: 1, c: 1 })
    expect(p.every((x) => x.cols === 2)).toBe(true)
  })

  it('задачи на весь день в раскладку не попадают', () => {
    const allDay: CalEvent = { task: task({ id: 'x' }), day: '2026-10-20', startMin: null, endMin: null, virtual: false }
    expect(layoutColumns([allDay, ev('a', 600, 660)])).toHaveLength(1)
  })
})

describe('тесные переезды', () => {
  const ev = (id: string, s: number, e: number, address: string | null): CalEvent => ({
    task: task({ id, address }),
    day: '2026-10-20',
    startMin: s,
    endMin: e,
    virtual: false,
  })

  it('разные адреса с зазором меньше получаса подсвечиваются', () => {
    const r = tightTransfers([ev('a', 600, 660, 'Свободы 5'), ev('b', 675, 735, 'Республики 12')])
    expect([...r].sort()).toEqual(['a', 'b'])
  })

  it('достаточный зазор и один адрес не подсвечиваются', () => {
    expect(tightTransfers([ev('a', 600, 660, 'Свободы 5'), ev('b', 720, 780, 'Республики 12')]).size).toBe(0)
    expect(tightTransfers([ev('a', 600, 660, 'Свободы 5'), ev('b', 661, 700, '  свободы   5 ')]).size).toBe(0)
  })

  it('встречи без адреса не участвуют, цепочка проверяется по соседям', () => {
    expect(tightTransfers([ev('a', 600, 660, null), ev('b', 661, 700, 'Свободы 5')]).size).toBe(0)
    const r = tightTransfers([ev('a', 600, 660, 'A'), ev('b', 670, 700, 'B'), ev('c', 800, 860, 'C')])
    expect([...r].sort()).toEqual(['a', 'b'])
  })

  it('пересечение по времени на разных адресах тоже конфликт', () => {
    expect(tightTransfers([ev('a', 600, 700, 'A'), ev('b', 650, 720, 'B')]).size).toBe(2)
  })

  it('порог настраивается', () => {
    expect(tightTransfers([ev('a', 600, 660, 'A'), ev('b', 700, 760, 'B')], 60).size).toBe(2)
  })
})


describe('заголовок и вспомогательное для экрана календаря', () => {
  const ctx = { now: Date.UTC(2026, 9, 20, 12), tz: 'Europe/Moscow' }

  it('заголовок по видам', () => {
    expect(calTitle('list', '2026-10-20', ctx)).toEqual({ small: 'октябрь', main: 'Сегодня' })
    expect(calTitle('day', '2026-10-21', ctx)).toEqual({ small: 'октябрь', main: '21 октября' })
    expect(calTitle('month', '2026-10-20', ctx)).toEqual({ small: null, main: 'Октябрь 2026' })
    expect(calTitle('year', '2026-10-20', ctx)).toEqual({ small: null, main: '2026' })
    expect(calTitle('week', '2026-10-20', ctx).main).toBe('19–25 окт')
    expect(calTitle('days3', '2026-10-30', ctx).main).toBe('30 окт – 1 ноя')
  })

  it('три дня и двенадцать месяцев', () => {
    expect(threeDays('2026-12-30')).toEqual(['2026-12-30', '2026-12-31', '2027-01-01'])
    const months = yearMonths('2026-10-20')
    expect(months).toHaveLength(12)
    expect(months[0]).toBe('2026-01-01')
    expect(months[11]).toBe('2026-12-01')
  })

  it('выполненные в день: по времени закрытия, свежие выше', () => {
    const mk = (id: string, completedAt: number | null, status: Task['status'] = 'done') => ({ id, status, completedAt }) as Task
    const noon = Date.UTC(2026, 9, 20, 9)
    const done = doneOnDay([mk('a', noon), mk('b', noon + 3600_000), mk('c', Date.UTC(2026, 9, 19, 9)), mk('d', noon, 'open'), mk('e', null)], '2026-10-20', ctx)
    expect(done.map((t) => t.id)).toEqual(['b', 'a'])
  })
})

describe('виды календаря для большого экрана', () => {
  it('две недели начинаются с понедельника выбранной недели', () => {
    const [a, b] = twoWeeks('2026-10-22')
    expect(a[0]).toBe('2026-10-19')
    expect(b[6]).toBe('2026-11-01')
    expect(a).toHaveLength(7)
  })
  it('повестка сдвигается на неделю, две недели на две', () => {
    expect(shiftAnchor('agenda', '2026-10-22', 1)).toBe('2026-10-29')
    expect(shiftAnchor('weeks2', '2026-10-22', -1)).toBe('2026-10-08')
  })
  it('выполненные показываются только по просьбе', () => {
    const t = task({ id: 'd', status: 'done', due: '2026-10-22', completedAt: 1 })
    expect(eventsByDay([t], ctx, '2026-10-22', '2026-10-22').get('2026-10-22')).toBeUndefined()
    expect(eventsByDay([t], ctx, '2026-10-22', '2026-10-22', true).get('2026-10-22')).toHaveLength(1)
  })
})
