import { describe, expect, it } from 'vitest'
import { dayKeyOf, localToMs, timeOf, type DateCtx } from './dates'
import { buildRule, describeRule, isValidRule, nextOccurrence, ruleParts } from './repeat'

const MSK = 'Europe/Moscow'
// Вторник, 20 октября 2026, 15:00 по Москве
const NOW = localToMs('2026-10-20', '15:00', MSK)
const ctx: DateCtx = { now: NOW, tz: MSK }

type Fields = Parameters<typeof nextOccurrence>[0]

function t(over: Partial<Fields>): Fields {
  return { due: '2026-10-20', start: null, repeat: 'RRULE:FREQ=DAILY', repeatFrom: 'due', exDates: [], status: 'open', ...over }
}

const nextDue = (f: Fields, c: DateCtx = ctx, at = NOW) => nextOccurrence(f, c, at)?.due

describe('от срока', () => {
  it('каждый день', () => {
    expect(nextDue(t({}))).toBe('2026-10-21')
  })

  it('каждый понедельник', () => {
    expect(nextDue(t({ due: '2026-10-19', repeat: 'RRULE:FREQ=WEEKLY;WKST=MO;INTERVAL=1;BYDAY=MO' }))).toBe('2026-10-26')
  })

  it('неделя без дней недели считается от дня срока', () => {
    // 22 октября четверг
    expect(nextDue(t({ due: '2026-10-22', repeat: 'RRULE:FREQ=WEEKLY' }))).toBe('2026-10-29')
  })

  it('несколько дней недели: после четверга идёт вторник', () => {
    expect(nextDue(t({ due: '2026-10-22', repeat: 'RRULE:FREQ=WEEKLY;BYDAY=TU,TH' }))).toBe('2026-10-27')
    expect(nextDue(t({ due: '2026-10-25', repeat: 'RRULE:FREQ=WEEKLY;BYDAY=TU,FR,SA,SU,TH' }))).toBe('2026-10-27')
  })

  it('просроченная на три недели задача не выдаёт цепочку прошлых дат, а встаёт на ближайший понедельник', () => {
    expect(nextDue(t({ due: '2026-09-28', repeat: 'RRULE:FREQ=WEEKLY;BYDAY=MO' }))).toBe('2026-10-26')
  })

  it('просроченная ежедневная становится на сегодня, а не пропускает его', () => {
    expect(nextDue(t({ due: '2026-10-15' }))).toBe('2026-10-20')
  })

  it('каждые три дня', () => {
    expect(nextDue(t({ repeat: 'RRULE:FREQ=DAILY;INTERVAL=3' }))).toBe('2026-10-23')
  })

  it('раз в месяц 15 числа, через границу года', () => {
    expect(nextDue(t({ due: '2026-10-15', repeat: 'RRULE:FREQ=MONTHLY;BYMONTHDAY=15' }))).toBe('2026-11-15')
    const dec: DateCtx = { now: localToMs('2026-12-20', '10:00', MSK), tz: MSK }
    expect(nextDue(t({ due: '2026-12-15', repeat: 'RRULE:FREQ=MONTHLY;BYMONTHDAY=15' }), dec)).toBe('2027-01-15')
  })

  it('31 число: месяцы, где его нет, пропускаются', () => {
    expect(nextDue(t({ due: '2026-10-31', repeat: 'RRULE:FREQ=MONTHLY;BYMONTHDAY=31' }))).toBe('2026-12-31')
  })

  it('раз в квартал первого числа', () => {
    expect(nextDue(t({ due: '2026-10-01', repeat: 'RRULE:FREQ=MONTHLY;INTERVAL=3;BYMONTHDAY=1' }))).toBe('2027-01-01')
  })

  it('29 февраля раз в год: следующее в високосном году', () => {
    const feb: DateCtx = { now: localToMs('2028-03-05', '10:00', MSK), tz: MSK }
    expect(nextDue(t({ due: '2028-02-29', repeat: 'RRULE:FREQ=YEARLY' }), feb)).toBe('2032-02-29')
  })
})

describe('от выполнения', () => {
  it('раз в 3 дня от дня выполнения, а не от срока', () => {
    const f = t({ due: '2026-10-10', repeat: 'RRULE:FREQ=DAILY;INTERVAL=3', repeatFrom: 'done' })
    expect(nextDue(f, ctx, localToMs('2026-10-22', '18:00', MSK))).toBe('2026-10-25')
  })

  it('каждый понедельник, выполнена в среду: следующий понедельник', () => {
    const f = t({ due: '2026-10-19', repeat: 'RRULE:FREQ=WEEKLY;BYDAY=MO', repeatFrom: 'done' })
    expect(nextDue(f, ctx, localToMs('2026-10-21', '18:00', MSK))).toBe('2026-10-26')
  })

  it('выполнена поздно вечером: день считается в часовом поясе задачи', () => {
    const f = t({ repeat: 'RRULE:FREQ=DAILY', repeatFrom: 'done' })
    const lateMsk = localToMs('2026-10-20', '23:50', MSK) // в UTC это ещё 20:50 того же дня
    expect(nextDue(f, ctx, lateMsk)).toBe('2026-10-21')
  })
})

describe('время суток и пояса', () => {
  it('задача на 9:00 остаётся на 9:00', () => {
    const due = localToMs('2026-10-19', '09:00', MSK)
    const n = nextOccurrence(t({ due, repeat: 'RRULE:FREQ=WEEKLY;BYDAY=MO' }), ctx, NOW)!
    expect(dayKeyOf(n.due as number, MSK)).toBe('2026-10-26')
    expect(timeOf(n.due as number, MSK)).toBe('09:00')
  })

  it('через переход на зимнее время 9:00 по Нью-Йорку остаётся 9:00', () => {
    const ny = 'America/New_York'
    const c: DateCtx = { now: localToMs('2026-10-31', '12:00', ny), tz: ny }
    const due = localToMs('2026-10-31', '09:00', ny)
    const n = nextOccurrence(t({ due, repeat: 'RRULE:FREQ=DAILY' }), c, c.now)!
    expect(dayKeyOf(n.due as number, ny)).toBe('2026-11-01')
    expect(timeOf(n.due as number, ny)).toBe('09:00')
    // между 31 октября и 1 ноября в этом году 25 часов
    expect((n.due as number) - due).toBe(25 * 3600_000)
  })
})

describe('конец цикла и исключения', () => {
  const april: DateCtx = { now: localToMs('2026-04-20', '10:00', MSK), tz: MSK }

  it('UNTIL включает последний день, после него цикла нет', () => {
    const rule = 'RRULE:FREQ=DAILY;UNTIL=20260421'
    expect(nextDue(t({ due: '2026-04-20', repeat: rule }), april)).toBe('2026-04-21')
    expect(nextOccurrence(t({ due: '2026-04-21', repeat: rule }), april, april.now)).toBeNull()
  })

  it('COUNT уменьшается и на последнем цикле заканчивается', () => {
    const n = nextOccurrence(t({ repeat: 'RRULE:FREQ=DAILY;COUNT=3' }), ctx, NOW)!
    expect(n.rule).toBe('RRULE:FREQ=DAILY;COUNT=2')
    expect(nextOccurrence(t({ repeat: 'RRULE:FREQ=DAILY;COUNT=1' }), ctx, NOW)).toBeNull()
  })

  it('исключённые даты пропускаются', () => {
    expect(nextDue(t({ exDates: ['2026-10-21'] }))).toBe('2026-10-22')
    expect(nextDue(t({ exDates: ['2026-10-21', '2026-10-22', '2026-10-23'] }))).toBe('2026-10-24')
  })

  it('задача на несколько дней сохраняет длительность', () => {
    const n = nextOccurrence(t({ start: '2026-10-19', due: '2026-10-21', repeat: 'RRULE:FREQ=WEEKLY' }), ctx, NOW)!
    expect(n.start).toBe('2026-10-26')
    expect(n.due).toBe('2026-10-28')
  })

  it('без правила, без срока или с мусором возвращает null', () => {
    expect(nextOccurrence(t({ repeat: null }), ctx, NOW)).toBeNull()
    expect(nextOccurrence(t({ due: null }), ctx, NOW)).toBeNull()
    expect(nextOccurrence(t({ repeat: 'не правило' }), ctx, NOW)).toBeNull()
    expect(isValidRule('не правило')).toBe(false)
    expect(isValidRule('RRULE:FREQ=DAILY')).toBe(true)
  })
})

// Все правила из настоящей базы Григория (23 разных)
const REAL_RULES = [
  'FREQ=WEEKLY',
  'FREQ=WEEKLY;WKST=MO;INTERVAL=1;BYDAY=SA',
  'FREQ=WEEKLY;WKST=MO;INTERVAL=1;BYDAY=MO',
  'FREQ=DAILY;INTERVAL=1',
  'FREQ=WEEKLY;WKST=MO;INTERVAL=1;BYDAY=TU,FR,SA,SU',
  'FREQ=WEEKLY;BYDAY=TU,FR,SA,SU,TH',
  'FREQ=WEEKLY;INTERVAL=1',
  'FREQ=WEEKLY;WKST=MO;INTERVAL=1;BYDAY=MO,WE,FR',
  'FREQ=WEEKLY;WKST=MO;INTERVAL=1;BYDAY=TU,TH',
  'FREQ=WEEKLY;WKST=MO;INTERVAL=1;BYDAY=WE,FR',
  'FREQ=DAILY;UNTIL=20250510',
  'FREQ=WEEKLY;INTERVAL=1;BYDAY=MO',
  'FREQ=WEEKLY;WKST=MO;INTERVAL=1;BYDAY=TU,WE,TH,FR,SU',
  'FREQ=WEEKLY;UNTIL=20260419;INTERVAL=1;BYDAY=MO',
  'FREQ=DAILY;UNTIL=20260404;INTERVAL=1',
  'FREQ=WEEKLY;INTERVAL=1;BYDAY=SA',
  'FREQ=DAILY;UNTIL=20260727',
  'FREQ=WEEKLY;WKST=MO;INTERVAL=1;BYDAY=MO,TU,WE,TH,FR',
  'FREQ=WEEKLY;WKST=MO;INTERVAL=1;BYDAY=MO,FR',
  'FREQ=MONTHLY;INTERVAL=1;BYMONTHDAY=15',
  'FREQ=DAILY',
  'FREQ=MONTHLY;INTERVAL=3;BYMONTHDAY=1',
]

describe('настоящие правила из TickTick', () => {
  it.each(REAL_RULES)('%s: считается следующая дата и есть понятное описание', (rule) => {
    const full = `RRULE:${rule}`
    expect(isValidRule(full)).toBe(true)
    expect(describeRule(full, ctx)).not.toBe('Свой повтор')
    // Следующая дата считается без ошибок, для правил с UNTIL в прошлом цикла уже нет
    const n = nextOccurrence(t({ due: '2026-10-19', repeat: full }), ctx, NOW)
    if (/UNTIL/.test(rule)) expect(n).toBeNull()
    else expect(n).not.toBeNull()
  })
})

describe('описание правил', () => {
  const d = (r: string) => describeRule(`RRULE:${r}`, ctx)

  it('простые', () => {
    expect(d('FREQ=DAILY')).toBe('Каждый день')
    expect(d('FREQ=DAILY;INTERVAL=3')).toBe('Каждые 3 дня')
    expect(d('FREQ=DAILY;INTERVAL=5')).toBe('Каждые 5 дней')
    expect(d('FREQ=WEEKLY')).toBe('Каждую неделю')
    expect(d('FREQ=WEEKLY;INTERVAL=2')).toBe('Каждые 2 недели')
    expect(d('FREQ=MONTHLY;BYMONTHDAY=15')).toBe('Каждый месяц, 15 числа')
    expect(d('FREQ=MONTHLY;INTERVAL=3;BYMONTHDAY=1')).toBe('Раз в квартал, 1 числа')
    expect(d('FREQ=YEARLY')).toBe('Каждый год')
  })

  it('дни недели, будни и выходные', () => {
    expect(d('FREQ=WEEKLY;BYDAY=MO,WE,FR')).toBe('Каждую неделю по пн, ср, пт')
    expect(d('FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR')).toBe('По будням')
    expect(d('FREQ=WEEKLY;BYDAY=SA,SU')).toBe('По выходным')
    expect(d('FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR,SA,SU')).toBe('Каждый день')
  })

  it('конец цикла', () => {
    expect(d('FREQ=WEEKLY;BYDAY=MO;UNTIL=20261229')).toBe('Каждую неделю по пн до 29 дек')
  })

  it('сложное правило не ломается', () => {
    expect(d('FREQ=MONTHLY;BYDAY=MO;BYSETPOS=1')).toBe('Свой повтор')
    expect(describeRule('мусор', ctx)).toBe('Свой повтор')
  })
})

describe('сборка правил для экрана', () => {
  it('собирает и разбирает обратно', () => {
    const rule = buildRule({ freq: 'WEEKLY', interval: 2, byday: ['FR', 'MO'], bymonthday: null })
    expect(rule).toBe('RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,FR')
    expect(ruleParts(rule)).toEqual({ freq: 'WEEKLY', interval: 2, byday: ['MO', 'FR'], bymonthday: null })
  })

  it('интервал 1 не пишется, месяц с числом', () => {
    expect(buildRule({ freq: 'DAILY', interval: 1, byday: [], bymonthday: null })).toBe('RRULE:FREQ=DAILY')
    expect(buildRule({ freq: 'MONTHLY', interval: 1, byday: [], bymonthday: 15 })).toBe('RRULE:FREQ=MONTHLY;BYMONTHDAY=15')
  })

  it('сложное правило редактор не берёт', () => {
    expect(ruleParts('RRULE:FREQ=MONTHLY;BYDAY=MO;BYSETPOS=1')).toBeNull()
  })
})
