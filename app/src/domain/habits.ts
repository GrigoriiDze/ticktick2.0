import { monthGrid, sameMonth } from './calendar'
import { addDays, type DayKey } from './dates'
import { daysByRule } from './repeat'
import type { CheckStatus, Habit } from './types'

type Schedule = Pick<Habit, 'repeat' | 'startDay'>

/** Дни периода, в которые привычку надо делать. Без правила это каждый день, начиная со startDay */
export function scheduledDays(habit: Schedule, from: DayKey, to: DayKey): Set<DayKey> {
  const lo = from < habit.startDay ? habit.startDay : from
  const out = new Set<DayKey>()
  if (lo > to) return out
  if (habit.repeat) {
    for (const d of daysByRule(habit.repeat, habit.startDay, lo, to)) out.add(d)
    return out
  }
  for (let d = lo; d <= to; d = addDays(d, 1)) out.add(d)
  return out
}

export interface HabitStats {
  /** Сколько дней с отметкой «сделано» за всё время. Это то, что TickTick показывает молнией */
  total: number
  /** Подряд выполненных дней по расписанию. Сегодняшний день, пока не отмечен, серию не рвёт */
  currentStreak: number
  bestStreak: number
}

/**
 * Статистика привычки. Серия считается только по дням расписания: выходной в расписании «по будням» серию не рвёт.
 * Отметка «не сделано» и просто пропущенный прошлый день серию обнуляют
 */
export function habitStats(habit: Schedule, checks: ReadonlyMap<DayKey, CheckStatus>, todayKey: DayKey): HabitStats {
  let total = 0
  let first: DayKey | null = null
  for (const [day, status] of checks) {
    if (status === 'done') total++
    if (first === null || day < first) first = day
  }
  if (first === null) return { total: 0, currentStreak: 0, bestStreak: 0 }

  const start = first < habit.startDay ? first : habit.startDay
  const days = [...scheduledDays({ repeat: habit.repeat, startDay: start }, start, todayKey)].sort()

  let streak = 0
  let best = 0
  for (const day of days) {
    const status = checks.get(day)
    if (status === 'done') {
      streak++
      if (streak > best) best = streak
    } else if (day === todayKey && status === undefined) {
      // сегодня ещё можно успеть
    } else {
      streak = 0
    }
  }
  return { total, currentStreak: streak, bestStreak: best }
}

/** Нажатие на день: выполнено → снято, всё остальное → выполнено */
export function tapStatus(current: CheckStatus | undefined): CheckStatus | undefined {
  return current === 'done' ? undefined : 'done'
}

/** Нажатие на клетку месяца: пусто → выполнено → не выполнено → пусто */
export function cycleStatus(current: CheckStatus | undefined): CheckStatus | undefined {
  if (current === undefined) return 'done'
  return current === 'done' ? 'failed' : undefined
}

export interface DayCell {
  day: DayKey
  inMonth: boolean
  scheduled: boolean
  status: CheckStatus | undefined
  future: boolean
}

/** Клетки месяца для карточки привычки */
export function monthCells(habit: Schedule, checks: ReadonlyMap<DayKey, CheckStatus>, anchor: DayKey, todayKey: DayKey): DayCell[][] {
  const weeks = monthGrid(anchor)
  const scheduled = scheduledDays(habit, weeks[0][0], weeks[weeks.length - 1][6])
  return weeks.map((week) =>
    week.map((day) => ({
      day,
      inMonth: sameMonth(day, anchor),
      scheduled: scheduled.has(day),
      status: checks.get(day),
      future: day > todayKey,
    })),
  )
}

/** Последние n дней для полоски отметок, самый новый справа */
export function lastDays(todayKey: DayKey, n: number): DayKey[] {
  return Array.from({ length: n }, (_, i) => addDays(todayKey, i - (n - 1)))
}

/** Привычка видна в списке: не в архиве */
export function isActive(habit: Pick<Habit, 'archivedAt'>): boolean {
  return habit.archivedAt === null
}

/** Челлендж на N дней: сколько дней выполнено из цели */
export function challengeProgress(habit: Pick<Habit, 'targetDays' | 'startDay'>, checks: ReadonlyMap<DayKey, CheckStatus>): { done: number; target: number } | null {
  if (!habit.targetDays) return null
  let done = 0
  for (const [day, status] of checks) if (status === 'done' && day >= habit.startDay) done++
  return { done: Math.min(done, habit.targetDays), target: habit.targetDays }
}
