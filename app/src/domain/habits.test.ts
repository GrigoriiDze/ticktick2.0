import { describe, expect, it } from 'vitest'
import { addDays, type DayKey } from './dates'
import { challengeProgress, cycleStatus, habitStats, isActive, lastDays, monthCells, scheduledDays, tapStatus } from './habits'
import type { CheckStatus } from './types'

const TODAY: DayKey = '2026-10-20' // вторник
const daily = { repeat: null, startDay: '2026-09-01' }
const weekdays = { repeat: 'RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,TU,WE,TH,FR', startDay: '2026-09-01' }

/** Отметки подряд: от days_ago до вчера (или до сегодня) */
function run(from: DayKey, to: DayKey, status: CheckStatus = 'done'): Map<DayKey, CheckStatus> {
  const m = new Map<DayKey, CheckStatus>()
  for (let d = from; d <= to; d = addDays(d, 1)) m.set(d, status)
  return m
}

describe('расписание', () => {
  it('без правила это каждый день с первого дня', () => {
    const s = scheduledDays(daily, '2026-08-30', '2026-09-03')
    expect([...s]).toEqual(['2026-09-01', '2026-09-02', '2026-09-03'])
  })

  it('по будням: выходные не входят', () => {
    // 19 октября понедельник, 24 суббота, 25 воскресенье
    const s = scheduledDays(weekdays, '2026-10-19', '2026-10-25')
    expect([...s]).toEqual(['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23'])
  })

  it('два дня в неделю как у настоящих привычек Григория', () => {
    const h = { repeat: 'RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,TU', startDay: '2026-09-01' }
    expect([...scheduledDays(h, '2026-10-19', '2026-10-25')]).toEqual(['2026-10-19', '2026-10-20'])
  })

  it('каждые три дня считаются от первого дня', () => {
    const h = { repeat: 'RRULE:FREQ=DAILY;INTERVAL=3', startDay: '2026-10-01' }
    expect([...scheduledDays(h, '2026-10-01', '2026-10-10')]).toEqual(['2026-10-01', '2026-10-04', '2026-10-07', '2026-10-10'])
  })

  it('период до первого дня и пустой период', () => {
    expect(scheduledDays(daily, '2026-01-01', '2026-08-31').size).toBe(0)
    expect(scheduledDays(daily, '2026-10-05', '2026-10-01').size).toBe(0)
  })
})

describe('статистика: серия и всего', () => {
  it('нет отметок: нули', () => {
    expect(habitStats(daily, new Map(), TODAY)).toEqual({ total: 0, currentStreak: 0, bestStreak: 0 })
  })

  it('серия до вчера не рвётся, пока сегодня не отмечено', () => {
    const c = run('2026-10-10', '2026-10-19')
    expect(habitStats(daily, c, TODAY)).toEqual({ total: 10, currentStreak: 10, bestStreak: 10 })
  })

  it('сегодняшняя отметка добавляет день к серии', () => {
    const c = run('2026-10-10', '2026-10-20')
    expect(habitStats(daily, c, TODAY).currentStreak).toBe(11)
  })

  it('пропущенный вчерашний день обнуляет серию, лучший результат остаётся', () => {
    const c = run('2026-10-01', '2026-10-15')
    c.set('2026-10-18', 'done')
    c.set('2026-10-19', 'done')
    const s = habitStats(daily, c, TODAY)
    expect(s.currentStreak).toBe(2)
    expect(s.bestStreak).toBe(15)
    expect(s.total).toBe(17)
  })

  it('отметка «не сделано» рвёт серию и в «всего» не считается (случай «воздержания» Григория)', () => {
    // 542 выполненных дня, затем 14 октября отметка «не сделано», после неё тишина
    const c = run('2025-04-19', '2026-10-13')
    c.set('2026-10-14', 'failed')
    const s = habitStats({ repeat: 'RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,TU,WE,TH,FR,SA,SU', startDay: '2025-04-19' }, c, TODAY)
    expect(s.total).toBe(543 + 0) // 2025-04-19 .. 2026-10-13 включительно
    expect(s.currentStreak).toBe(0)
    expect(s.bestStreak).toBe(543)
  })

  it('выходные в расписании «по будням» серию не рвут', () => {
    // пятница 16 октября, понедельник 19, вторник 20 (сегодня)
    const c = new Map<DayKey, CheckStatus>([
      ['2026-10-14', 'done'],
      ['2026-10-15', 'done'],
      ['2026-10-16', 'done'],
      ['2026-10-19', 'done'],
    ])
    expect(habitStats(weekdays, c, TODAY).currentStreak).toBe(4)
  })

  it('пропущенный будний день рвёт серию даже при отметках до и после', () => {
    const c = new Map<DayKey, CheckStatus>([
      ['2026-10-14', 'done'],
      ['2026-10-15', 'done'],
      ['2026-10-19', 'done'], // 16 октября пропущено
    ])
    const s = habitStats(weekdays, c, TODAY)
    expect(s.currentStreak).toBe(1)
    expect(s.bestStreak).toBe(2)
  })

  it('отметка в день вне расписания идёт в «всего», серию не меняет', () => {
    const c = new Map<DayKey, CheckStatus>([
      ['2026-10-16', 'done'],
      ['2026-10-17', 'done'], // суббота, вне расписания
      ['2026-10-19', 'done'],
    ])
    const s = habitStats(weekdays, c, TODAY)
    expect(s.total).toBe(3)
    expect(s.currentStreak).toBe(2)
  })

  it('привычка с отметками до даты начала не теряет их', () => {
    const c = run('2026-08-25', '2026-08-31')
    c.set('2026-09-01', 'done')
    expect(habitStats(daily, c, '2026-09-02').total).toBe(8)
  })

  it('настоящий случай: привычка с одной давней отметкой', () => {
    const c = new Map<DayKey, CheckStatus>([['2026-09-10', 'done']])
    expect(habitStats({ repeat: 'RRULE:FREQ=DAILY;INTERVAL=1', startDay: '2026-09-10' }, c, TODAY)).toEqual({ total: 1, currentStreak: 0, bestStreak: 1 })
  })
})

describe('нажатия, полоска, месяц', () => {
  it('нажатие переключает «сделано» и снимает его', () => {
    expect(tapStatus(undefined)).toBe('done')
    expect(tapStatus('failed')).toBe('done')
    expect(tapStatus('done')).toBeUndefined()
  })

  it('нажатия на клетку месяца идут по кругу', () => {
    expect(cycleStatus(undefined)).toBe('done')
    expect(cycleStatus('done')).toBe('failed')
    expect(cycleStatus('failed')).toBeUndefined()
  })

  it('последние семь дней, самый новый справа', () => {
    expect(lastDays(TODAY, 7)).toEqual(['2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18', '2026-10-19', '2026-10-20'])
  })

  it('клетки месяца: статус, расписание, будущее', () => {
    const c = new Map<DayKey, CheckStatus>([
      ['2026-10-19', 'done'],
      ['2026-10-16', 'failed'],
    ])
    const cells = monthCells(weekdays, c, TODAY, TODAY).flat()
    const by = (d: string) => cells.find((x) => x.day === d)!
    expect(by('2026-10-19')).toMatchObject({ status: 'done', scheduled: true, future: false, inMonth: true })
    expect(by('2026-10-16').status).toBe('failed')
    expect(by('2026-10-17').scheduled).toBe(false) // суббота
    expect(by('2026-10-22').future).toBe(true)
    expect(by('2026-09-30').inMonth).toBe(false)
  })

  it('активные и архивные', () => {
    expect(isActive({ archivedAt: null })).toBe(true)
    expect(isActive({ archivedAt: 123 })).toBe(false)
  })

  it('челлендж на 30 дней', () => {
    expect(challengeProgress({ targetDays: null, startDay: '2026-10-01' }, new Map())).toBeNull()
    const c = run('2026-10-01', '2026-10-12')
    expect(challengeProgress({ targetDays: 30, startDay: '2026-10-01' }, c)).toEqual({ done: 12, target: 30 })
    expect(challengeProgress({ targetDays: 7, startDay: '2026-10-01' }, c)).toEqual({ done: 7, target: 7 })
  })
})
