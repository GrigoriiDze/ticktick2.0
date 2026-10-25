import { addDays, type DayKey } from './dates'
import { plural } from './sites'
import type { Countdown } from './types'

const DAY_MS = 86_400_000
const toUtc = (d: DayKey) => Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10)))

/** Сколько дней от сегодняшнего дня до даты: ноль в самый день, отрицательное после него */
export function daysUntil(date: DayKey, today: DayKey): number {
  return Math.round((toUtc(date) - toUtc(today)) / DAY_MS)
}

/** Подпись под названием: «Осталось 5 дней», «Сегодня», «Прошло 3 дня» */
export function countdownLabel(days: number): string {
  if (days === 0) return 'Сегодня'
  const n = Math.abs(days)
  const word = plural(n, ['день', 'дня', 'дней'])
  if (days > 0) return `${plural(n, ['Остался', 'Осталось', 'Осталось'])} ${n} ${word}`
  return `${plural(n, ['Прошёл', 'Прошло', 'Прошло'])} ${n} ${word}`
}

/** Сначала ближайшие будущие, потом прошедшие (свежие выше) */
export function sortCountdowns(list: Countdown[], today: DayKey): Countdown[] {
  const rank = (c: Countdown) => (daysUntil(c.date, today) >= 0 ? 0 : 1)
  return [...list].sort((a, b) => {
    if (rank(a) !== rank(b)) return rank(a) - rank(b)
    const da = daysUntil(a.date, today)
    const db = daysUntil(b.date, today)
    return rank(a) === 0 ? da - db : db - da || a.name.localeCompare(b.name)
  })
}

/** Дата через n дней от сегодня, для подсказки в форме */
export const inDays = (today: DayKey, n: number): DayKey => addDays(today, n)
