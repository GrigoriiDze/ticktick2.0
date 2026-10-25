import { describe, expect, it } from 'vitest'
import { focusStatsForDay, formatTimer, POMO_DURATIONS, type FocusSession } from './pomo'

describe('pomo domain logic', () => {
  it('formats seconds to MM:SS', () => {
    expect(formatTimer(0)).toBe('00:00')
    expect(formatTimer(59)).toBe('00:59')
    expect(formatTimer(60)).toBe('01:00')
    expect(formatTimer(1500)).toBe('25:00')
    expect(formatTimer(305)).toBe('05:05')
  })

  it('provides standard pomodoro durations', () => {
    expect(POMO_DURATIONS.pomo).toBe(1500)
    expect(POMO_DURATIONS.shortBreak).toBe(300)
    expect(POMO_DURATIONS.longBreak).toBe(900)
  })

  it('calculates focus stats for day correctly', () => {
    const dayStart = 1700000000000
    const dayEnd = dayStart + 24 * 60 * 60 * 1000

    const sessions: FocusSession[] = [
      { id: '1', taskId: 't1', durationSec: 1500, completedAt: dayStart + 1000, mode: 'pomo' },
      { id: '2', taskId: null, durationSec: 1500, completedAt: dayStart + 5000, mode: 'pomo' },
      { id: '3', taskId: 't2', durationSec: 600, completedAt: dayStart + 10000, mode: 'stopwatch' },
      { id: '4', taskId: 't3', durationSec: 1500, completedAt: dayEnd + 1000, mode: 'pomo' }, // next day
    ]

    const stats = focusStatsForDay(sessions, dayStart, dayEnd)
    expect(stats.pomoCount).toBe(2)
    expect(stats.minutes).toBe(60) // (1500 + 1500 + 600) / 60 = 60 min
  })
})

