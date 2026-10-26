import { useMemo, useState } from 'react'
import {
  focusStatsForDay,
  loadFocusSessions,
  saveFocusSessions,
  type FocusSession,
} from '../../../domain/pomo'
import type { Task } from '../../../domain/types'

export function usePomoStats(selectedTask: Task | null) {
  const [sessions, setSessions] = useState<FocusSession[]>(loadFocusSessions)

  function recordSession(sec: number, sessionMode: 'pomo' | 'stopwatch'): FocusSession[] {
    if (sec < 60) return sessions
    const entry: FocusSession = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      taskId: selectedTask?.id ?? null,
      taskTitle: selectedTask?.title ?? (sessionMode === 'stopwatch' ? 'Секундомер' : 'Фокус'),
      durationSec: sec,
      completedAt: Date.now(),
      mode: sessionMode,
    }
    const next = [...sessions, entry]
    setSessions(next)
    saveFocusSessions(next)
    return next
  }

  function addManualRecord(minutes: number): FocusSession[] {
    const mins = Math.max(1, Math.min(300, minutes))
    return recordSession(mins * 60, 'pomo')
  }

  const todayStats = useMemo(() => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const end = start + 86_400_000
    return focusStatsForDay(sessions, start, end)
  }, [sessions])

  const totalPomoCount = useMemo(
    () => sessions.filter((s) => s.mode === 'pomo').length,
    [sessions],
  )

  const totalMins = useMemo(
    () => Math.round(sessions.reduce((acc, s) => acc + s.durationSec, 0) / 60),
    [sessions],
  )

  return {
    sessions,
    todayStats,
    totalPomoCount,
    totalMins,
    recordSession,
    addManualRecord,
  }
}

