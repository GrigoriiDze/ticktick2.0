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

const STORAGE_KEY = 'pomo_sessions'

export function loadFocusSessions(): FocusSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as FocusSession[]) : []
  } catch {
    return []
  }
}

export function saveFocusSessions(sessions: FocusSession[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(-200)))
  } catch {}
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
