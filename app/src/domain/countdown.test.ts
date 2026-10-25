import { describe, expect, it } from 'vitest'
import { countdownLabel, daysUntil, sortCountdowns } from './countdown'
import type { Countdown } from './types'

const c = (id: string, date: string): Countdown => ({ id, name: id, date, sortOrder: 0, createdAt: null, updatedAt: null, deletedAt: null })

describe('обратный отсчёт', () => {
  it('считает дни, в том числе через границу месяца и високосный год', () => {
    expect(daysUntil('2026-10-25', '2026-10-20')).toBe(5)
    expect(daysUntil('2026-11-02', '2026-10-30')).toBe(3)
    expect(daysUntil('2028-03-01', '2028-02-28')).toBe(2)
    expect(daysUntil('2026-10-20', '2026-10-20')).toBe(0)
    expect(daysUntil('2026-10-17', '2026-10-20')).toBe(-3)
  })
  it('подпись по-русски с правильными окончаниями', () => {
    expect(countdownLabel(0)).toBe('Сегодня')
    expect(countdownLabel(1)).toBe('Остался 1 день')
    expect(countdownLabel(2)).toBe('Осталось 2 дня')
    expect(countdownLabel(5)).toBe('Осталось 5 дней')
    expect(countdownLabel(21)).toBe('Остался 21 день')
    expect(countdownLabel(-1)).toBe('Прошёл 1 день')
    expect(countdownLabel(-3)).toBe('Прошло 3 дня')
  })
  it('сначала ближайшие, прошедшие после них', () => {
    const order = sortCountdowns([c('прошлое', '2026-10-01'), c('далеко', '2027-01-01'), c('рядом', '2026-10-22'), c('давно', '2026-01-01')], '2026-10-20').map((x) => x.id)
    expect(order).toEqual(['рядом', 'далеко', 'прошлое', 'давно'])
  })
})
