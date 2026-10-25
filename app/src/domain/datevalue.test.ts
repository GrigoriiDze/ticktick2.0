import { describe, expect, it } from 'vitest'
import { localToMs, type DateCtx } from './dates'
import { parseTrigger } from './reminders'
import { addReminder, AT_TIME, customTrigger, removeReminder, datePatchOf, endTime, dateValueOf, describeDateValue, remindersAfterTimeChange, splitTrigger, type DateValue } from './datevalue'

const MSK = 'Europe/Moscow'
const ctx: DateCtx = { now: localToMs('2026-10-20', '15:00', MSK), tz: MSK }

const timed: DateValue = { day: '2026-10-21', time: '10:30', duration: null, reminders: ['TRIGGER:-PT15M'], repeat: 'RRULE:FREQ=DAILY', repeatFrom: 'due' }

describe('срок задачи как одно значение', () => {
  it('задача со временем превращается в значение и обратно', () => {
    const patch = datePatchOf(timed, ctx)
    expect(patch.fields).toEqual({ due: localToMs('2026-10-21', '10:30', MSK), isAllDay: false, timeZone: MSK, duration: null, repeat: 'RRULE:FREQ=DAILY', repeatFrom: 'due' })
    expect(patch.reminders).toEqual(['TRIGGER:-PT15M'])
    const back = dateValueOf({ due: patch.fields.due, repeat: 'RRULE:FREQ=DAILY', repeatFrom: 'due', reminders: { r1: { trigger: 'TRIGGER:-PT15M' } } }, ctx)
    expect(back).toEqual(timed)
  })

  it('без времени задача на весь день, срок строкой', () => {
    const patch = datePatchOf({ ...timed, time: null, reminders: [] }, ctx)
    expect(patch.fields).toMatchObject({ due: '2026-10-21', isAllDay: true, timeZone: null })
  })

  it('без даты срок, повтор и напоминания сбрасываются', () => {
    const patch = datePatchOf({ ...timed, day: null }, ctx)
    expect(patch.fields).toMatchObject({ due: null, start: null, isAllDay: false, repeat: null })
    expect(patch.reminders).toEqual([])
  })
})

describe('напоминания при смене времени', () => {
  it('тот же вид задачи, напоминания остаются', () => {
    expect(remindersAfterTimeChange(timed, '12:00')).toEqual(['TRIGGER:-PT15M'])
  })
  it('со временем появилось, ставим «в момент срока»', () => {
    expect(remindersAfterTimeChange({ ...timed, time: null, reminders: [] }, '12:00')).toEqual([AT_TIME])
  })
  it('время убрали, напоминания сбрасываем', () => {
    expect(remindersAfterTimeChange(timed, null)).toEqual([])
  })
})

describe('подписи и произвольное напоминание', () => {
  it('одна строка о сроке', () => {
    expect(describeDateValue(timed, ctx)).toBe('Завтра 10:30, каждый день, за 15 мин')
    expect(describeDateValue({ ...timed, time: null, repeat: null, reminders: [] }, ctx)).toBe('Завтра')
    expect(describeDateValue({ ...timed, day: null }, ctx)).toBe('')
  })

  it('произвольное напоминание читается движком напоминаний', () => {
    expect(parseTrigger(customTrigger(0, 3, 15))).toBe(-(3 * 3600 + 15 * 60) * 1000)
    expect(parseTrigger(customTrigger(2, 0, 0))).toBe(-2 * 86_400_000)
    expect(customTrigger(0, 0, 0)).toBe(AT_TIME)
  })

  it('разбор значения для барабанов', () => {
    expect(splitTrigger('TRIGGER:-P0DT3H15M0S')).toEqual({ days: 0, hours: 3, minutes: 15 })
    expect(splitTrigger('TRIGGER:-PT15M')).toEqual({ days: 0, hours: 0, minutes: 15 })
    expect(splitTrigger('TRIGGER:-P1D')).toEqual({ days: 1, hours: 0, minutes: 0 })
    expect(splitTrigger('мусор')).toEqual({ days: 0, hours: 0, minutes: 15 })
  })
  it('длительность хранится минутами и возвращается в окно даты', () => {
    const v: DateValue = { ...timed, duration: 90 }
    const patch = datePatchOf(v, ctx)
    expect(patch.fields.duration).toBe(90)
    expect(dateValueOf({ due: patch.fields.due, duration: 90, repeat: null, repeatFrom: 'due', reminders: {} }, ctx).duration).toBe(90)
    expect(describeDateValue(v, ctx)).toContain('10:30–12:00')
  })

  it('у задачи на весь день длительности нет', () => {
    expect(datePatchOf({ ...timed, time: null, duration: 60, reminders: [] }, ctx).fields.duration).toBeNull()
    expect(dateValueOf({ due: '2026-10-21', duration: 60, repeat: null, repeatFrom: 'due', reminders: {} }, ctx).duration).toBeNull()
  })

  it('конец не уходит за полночь', () => {
    expect(endTime('23:30', 120)).toBe('23:59')
    expect(endTime('09:00', 45)).toBe('09:45')
  })
})

describe('несколько напоминаний', () => {
  it('добавляет без повторов и держит порядок от раннего к позднему', () => {
    let list: string[] = []
    list = addReminder(list, 'TRIGGER:-PT15M')
    list = addReminder(list, 'TRIGGER:-P1D')
    list = addReminder(list, 'TRIGGER:PT0S')
    list = addReminder(list, 'TRIGGER:-PT15M')
    expect(list).toEqual(['TRIGGER:-P1D', 'TRIGGER:-PT15M', 'TRIGGER:PT0S'])
  })

  it('«в момент срока» с минусом и без считается одним напоминанием', () => {
    expect(addReminder(['TRIGGER:-PT0S'], 'TRIGGER:PT0S')).toEqual(['TRIGGER:-PT0S'])
    expect(removeReminder(['TRIGGER:-PT0S', 'TRIGGER:-PT5M'], 'TRIGGER:PT0S')).toEqual(['TRIGGER:-PT5M'])
  })

  it('в одну задачу влезает сколько угодно напоминаний', () => {
    let list: string[] = []
    for (const t of ['TRIGGER:PT0S', 'TRIGGER:-PT5M', 'TRIGGER:-PT15M', 'TRIGGER:-PT30M', 'TRIGGER:-PT1H', 'TRIGGER:-P1D', 'TRIGGER:-P2DT3H0M0S']) list = addReminder(list, t)
    expect(list).toHaveLength(7)
    expect(list[0]).toBe('TRIGGER:-P2DT3H0M0S')
  })
})
