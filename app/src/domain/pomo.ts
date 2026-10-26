import { StorageService, STORAGE_KEYS } from '../platform/storage'

export type PomoMode = 'pomo' | 'shortBreak' | 'longBreak' | 'stopwatch'
export type PomoStatus = 'idle' | 'running' | 'paused'

export interface FocusSession {
  id: string
  taskId: string | null
  taskTitle?: string | null
  durationSec: number
  completedAt: number // timestamp
  mode: 'pomo' | 'stopwatch'
}

export const POMO_DURATIONS: Record<'pomo' | 'shortBreak' | 'longBreak', number> = {
  pomo: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
}

export function loadFocusSessions(): FocusSession[] {
  return StorageService.get<FocusSession[]>(STORAGE_KEYS.POMO_SESSIONS, [])
}

export function saveFocusSessions(sessions: FocusSession[]): void {
  StorageService.set(STORAGE_KEYS.POMO_SESSIONS, sessions.slice(-200))
}

/** Считает минуты фокуса за указанный день (по полуночи в локальной таймзоне) */
export function focusStatsForDay(sessions: FocusSession[], dayStartMs: number, dayEndMs: number): { minutes: number; pomoCount: number } {
  let totalSec = 0
  let pomoCount = 0

  for (const s of sessions) {
    if (s.completedAt >= dayStartMs && s.completedAt < dayEndMs) {
      totalSec += s.durationSec
      if (s.mode === 'pomo') {
        pomoCount++
      }
    }
  }

  return {
    minutes: Math.round(totalSec / 60),
    pomoCount,
  }
}

/** Форматирует секунды в MM:SS */
export function formatTimer(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
