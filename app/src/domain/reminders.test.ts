import { describe, expect, it } from 'vitest'
import { localToMs, type DateCtx } from './dates'
import { bodyFor, buildSchedule, describeTrigger, dueReminders, gmtOffset, fireTime, parseTrigger, reminderChoices, stableId } from './reminders'
import { INBOX_ID, type Task } from './types'

const MSK = 'Europe/Moscow'
const NOW = localToMs('2026-10-20', '15:00', MSK)
const ctx: DateCtx = { now: NOW, tz: MSK }

function task(over: Partial<Task>): Task {
  return {
    id: 't1',
    projectId: INBOX_ID,
    parentId: null,
    columnId: null,
    sortOrder: 0,
    title: 'Позвонить прорабу',
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

describe('разбор TRIGGER', () => {
  it.each([
    ['TRIGGER:PT0S', 0],
    ['TRIGGER:-PT15M', -15 * 60_000],
    ['TRIGGER:-PT1H', -3_600_000],
    ['TRIGGER:-PT1H30M', -5_400_000],
    ['TRIGGER:-P1D', -86_400_000],
    ['TRIGGER:P0DT9H0M0S', 9 * 3_600_000],
    ['TRIGGER:-P1DT15H0M0S', -(86_400_000 + 15 * 3_600_000)],
    ['TRIGGER:-P1W', -7 * 86_400_000],
    ['TRIGGER:-PT30S', -30_000],
    // значения из настоящей базы
    ['TRIGGER:-PT0S', 0],
    ['TRIGGER:-PT60M', -3_600_000],
    ['TRIGGER:-PT1440M', -86_400_000],
    ['TRIGGER:-PT135M', -135 * 60_000],
    ['TRIGGER:-P0DT15H0M0S', -15 * 3_600_000],
    ['TRIGGER:-P1DT9H', -(86_400_000 + 9 * 3_600_000)],
    ['TRIGGER:-P14D', -14 * 86_400_000],
  ])('%s', (text, ms) => {
    expect(parseTrigger(text)).toBe(ms)
  })

  it('мусор даёт null', () => {
    expect(parseTrigger('когда-нибудь')).toBeNull()
    expect(parseTrigger('TRIGGER:P')).toBeNull()
    expect(parseTrigger('')).toBeNull()
  })
})

describe('момент срабатывания', () => {
  it('задача со временем: срок плюс смещение', () => {
    const due = localToMs('2026-10-21', '10:00', MSK)
    expect(fireTime({ due, isAllDay: false }, 'TRIGGER:-PT15M', MSK)).toBe(due - 15 * 60_000)
    expect(fireTime({ due, isAllDay: false }, 'TRIGGER:PT0S', MSK)).toBe(due)
  })

  it('задача на весь день: «в 9:00» значит 9:00 по местному времени', () => {
    const at = fireTime({ due: '2026-10-21', isAllDay: true }, 'TRIGGER:P0DT9H0M0S', MSK)
    expect(at).toBe(localToMs('2026-10-21', '09:00', MSK))
  })

  it('задача на весь день: «за день в 9:00» TickTick пишет как 15 часов до полуночи', () => {
    const at = fireTime({ due: '2026-10-21', isAllDay: true }, 'TRIGGER:-P0DT15H0M0S', MSK)
    expect(at).toBe(localToMs('2026-10-20', '09:00', MSK))
  })

  it('задача на весь день: «за два дня в 9:00»', () => {
    const at = fireTime({ due: '2026-10-21', isAllDay: true }, 'TRIGGER:-P1DT15H0M0S', MSK)
    expect(at).toBe(localToMs('2026-10-19', '09:00', MSK))
  })

  it('без срока и с мусором напоминания нет', () => {
    expect(fireTime({ due: null, isAllDay: false }, 'TRIGGER:PT0S', MSK)).toBeNull()
    expect(fireTime({ due: '2026-10-21', isAllDay: true }, 'мусор', MSK)).toBeNull()
  })
})

describe('расписание', () => {
  const at = (day: string, time: string) => localToMs(day, time, MSK)

  it('только будущие напоминания открытых задач, по порядку', () => {
    const tasks = [
      task({ id: 'late', due: at('2026-10-22', '10:00'), reminders: { r: { trigger: 'TRIGGER:PT0S' } } }),
      task({ id: 'soon', due: at('2026-10-20', '16:00'), reminders: { r: { trigger: 'TRIGGER:-PT15M' } } }),
      task({ id: 'past', due: at('2026-10-20', '14:00'), reminders: { r: { trigger: 'TRIGGER:PT0S' } } }),
      task({ id: 'done', due: at('2026-10-21', '10:00'), status: 'done', reminders: { r: { trigger: 'TRIGGER:PT0S' } } }),
      task({ id: 'none', due: at('2026-10-21', '10:00') }),
    ]
    const plan = buildSchedule(tasks, ctx)
    expect(plan.map((p) => p.taskId)).toEqual(['soon', 'late'])
    expect(plan[0].at).toBe(at('2026-10-20', '15:45'))
  })

  it('корзина не напоминает', () => {
    const t = task({ due: at('2026-10-21', '10:00'), reminders: { r: { trigger: 'TRIGGER:PT0S' } }, deletedAt: {} as never })
    expect(buildSchedule([t], ctx)).toHaveLength(0)
  })

  it('несколько напоминаний у одной задачи', () => {
    const t = task({
      due: at('2026-10-22', '10:00'),
      reminders: { a: { trigger: 'TRIGGER:-P1D' }, b: { trigger: 'TRIGGER:PT0S' } },
    })
    const plan = buildSchedule([t], ctx)
    expect(plan.map((p) => p.reminderId)).toEqual(['a', 'b'])
    expect(plan[0].id).not.toBe(plan[1].id)
  })

  it('число уведомлений ограничено ближайшими', () => {
    const tasks = Array.from({ length: 100 }, (_, i) =>
      task({ id: `t${i}`, due: at('2026-10-21', '10:00') + i * 60_000, reminders: { r: { trigger: 'TRIGGER:PT0S' } } }),
    )
    const plan = buildSchedule(tasks, ctx, 60)
    expect(plan).toHaveLength(60)
    expect(plan[0].taskId).toBe('t0')
  })

  it('слишком далёкое будущее не планируем', () => {
    const t = task({ due: at('2027-06-01', '10:00'), reminders: { r: { trigger: 'TRIGGER:PT0S' } } })
    expect(buildSchedule([t], ctx)).toHaveLength(0)
  })

  it('текст: название, время и адрес', () => {
    const t = task({ title: 'Замер', due: at('2026-10-21', '10:30'), address: 'Свободы 5', reminders: { r: { trigger: 'TRIGGER:PT0S' } } })
    const [n] = buildSchedule([t], ctx)
    expect(n.title).toBe('Замер')
    expect(n.body).toBe('(10:30 GMT+3), Свободы 5')
  })

  it('номер уведомления устойчив и целый', () => {
    expect(stableId('t1:r1')).toBe(stableId('t1:r1'))
    expect(stableId('t1:r1')).not.toBe(stableId('t1:r2'))
    expect(Number.isInteger(stableId('любая строка'))).toBe(true)
    expect(stableId('любая строка')).toBeGreaterThan(0)
    expect(stableId('любая строка')).toBeLessThan(2 ** 31)
  })
})

describe('варианты для экрана', () => {
  it('для задач на весь день и со временем разные', () => {
    expect(reminderChoices(true).map((c) => c.key)).toEqual(['morning', 'evening-before', 'noon'])
    expect(reminderChoices(false)[0].trigger).toBe('TRIGGER:PT0S')
  })

  it('все предложенные значения разбираются', () => {
    for (const c of [...reminderChoices(true), ...reminderChoices(false)]) expect(parseTrigger(c.trigger)).not.toBeNull()
  })

  it('«в 18:00 накануне» для задачи на весь день действительно вечер предыдущего дня', () => {
    const c = reminderChoices(true).find((x) => x.key === 'evening-before')!
    expect(fireTime({ due: '2026-10-21', isAllDay: true }, c.trigger, MSK)).toBe(localToMs('2026-10-20', '18:00', MSK))
  })

  it('подпись для чужих значений', () => {
    expect(describeTrigger('TRIGGER:-PT90M')).toBe('За 1 ч 30 мин')
    expect(describeTrigger('TRIGGER:-P0DT3H15M0S')).toBe('За 3 ч 15 мин')
    expect(describeTrigger('TRIGGER:-PT15M')).toBe('За 15 мин')
    expect(describeTrigger('TRIGGER:-P2D')).toBe('За 2 дн.')
    expect(describeTrigger('TRIGGER:PT0S')).toBe('В момент срока')
    expect(describeTrigger('мусор')).toBe('Своё напоминание')
  })
})

describe('вторая строка уведомления как в TickTick', () => {
  it('смещение пояса: Москва, Алматы, Индия, летнее время', () => {
    const at = Date.UTC(2026, 9, 24, 12, 0)
    expect(gmtOffset(at, 'Europe/Moscow')).toBe('GMT+3')
    expect(gmtOffset(at, 'Asia/Almaty')).toBe('GMT+5')
    expect(gmtOffset(at, 'Asia/Kolkata')).toBe('GMT+5:30')
    expect(gmtOffset(at, 'UTC')).toBe('GMT+0')
  })

  it('время срока в скобках с поясом, адрес после запятой, задача на весь день без времени', () => {
    const base = { due: localToMs('2026-10-24', '18:00', 'Asia/Almaty'), address: null } as never
    expect(bodyFor(base, { now: 0, tz: 'Asia/Almaty' })).toBe('(18:00 GMT+5)')
    expect(bodyFor({ due: '2026-10-24', address: 'Свободы 5' } as never, { now: 0, tz: 'Asia/Almaty' })).toBe('(весь день), Свободы 5')
    expect(bodyFor({ due: null, address: null } as never, { now: 0, tz: 'Asia/Almaty' })).toBe('')
  })
})

describe('окно напоминания', () => {
  const t0 = localToMs('2026-10-24', '20:00', 'Asia/Almaty')
  const ctxNow = (min: number) => ({ now: t0 + min * 60_000, tz: 'Asia/Almaty' })
  const mk = (over: object) => ({ id: 'a', status: 'open', deletedAt: null, title: 'Созвон с лидом', content: 'Нужно 3 вещи:\n1) разбор', due: t0, isAllDay: false, reminders: { r1: { trigger: 'TRIGGER:PT0S' } }, ...over }) as never

  it('срабатывает в момент срока, подпись как в TickTick', () => {
    expect(dueReminders([mk({})], ctxNow(-1), new Set())).toEqual([])
    const [r] = dueReminders([mk({})], ctxNow(0), new Set())
    expect(r).toMatchObject({ taskId: 'a', title: 'Созвон с лидом', when: 'Сегодня, 20:00', note: 'Нужно 3 вещи: 1) разбор' })
  })

  it('«за 15 минут» срабатывает раньше срока, а подпись показывает время срока', () => {
    const [r] = dueReminders([mk({ reminders: { r1: { trigger: 'TRIGGER:-PT15M' } } })], ctxNow(-15), new Set())
    expect(r.when).toBe('Сегодня, 20:00')
  })

  it('обработанное, закрытое, удалённое и слишком старое не показывается', () => {
    const [r] = dueReminders([mk({})], ctxNow(1), new Set())
    expect(dueReminders([mk({})], ctxNow(1), new Set([r.key]))).toEqual([])
    expect(dueReminders([mk({ status: 'done' })], ctxNow(1), new Set())).toEqual([])
    expect(dueReminders([mk({ deletedAt: {} })], ctxNow(1), new Set())).toEqual([])
    expect(dueReminders([mk({})], ctxNow(7 * 60), new Set())).toEqual([])
  })

  it('если срок перенесли, это новое напоминание', () => {
    const a = dueReminders([mk({})], ctxNow(1), new Set())[0]
    const b = dueReminders([mk({ due: t0 + 30 * 60_000 })], ctxNow(31), new Set([a.key]))
    expect(b).toHaveLength(1)
  })
})
