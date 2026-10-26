import { useEffect, useRef, useState } from 'react'
import type { PomoMode, PomoStatus, FocusSession } from '../../../domain/pomo'
import { playPomoBell, startWhiteNoise, stopWhiteNoise } from '../../../platform/audio'
import type { PomoSettings } from './usePomoSettings'

interface UsePomoTimerParams {
  settings: PomoSettings
  recordSession: (sec: number, sessionMode: 'pomo' | 'stopwatch') => FocusSession[]
}

export function usePomoTimer({ settings, recordSession }: UsePomoTimerParams) {
  const {
    pomoMins,
    shortBreakMins,
    longBreakMins,
    longBreakInterval,
    autoNextPomo,
    autoStartBreak,
    whiteNoise,
  } = settings

  const [mode, setMode] = useState<PomoMode>('pomo')
  const [status, setStatus] = useState<PomoStatus>('idle')
  const [durationSec, setDurationSec] = useState<number>(pomoMins * 60)
  const [secondsLeft, setSecondsLeft] = useState<number>(pomoMins * 60)
  const [stopwatchSec, setStopwatchSec] = useState<number>(0)

  const intervalRef = useRef<number | null>(null)

  // Управляем классом body и белым шумом
  useEffect(() => {
    if (status === 'running') {
      document.body.classList.add('focus-running')
    } else {
      document.body.classList.remove('focus-running')
    }
    return () => {
      document.body.classList.remove('focus-running')
    }
  }, [status])

  useEffect(() => {
    if (status === 'running' && whiteNoise !== 'none') {
      startWhiteNoise(whiteNoise)
    } else {
      stopWhiteNoise()
    }
    return () => {
      stopWhiteNoise()
    }
  }, [status, whiteNoise])

  function getMinsForMode(m: PomoMode): number {
    if (m === 'pomo') return pomoMins
    if (m === 'shortBreak') return shortBreakMins
    if (m === 'longBreak') return longBreakMins
    return 0
  }

  // Живой тик таймера раз в 1 секунду
  useEffect(() => {
    if (status !== 'running') {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }
    intervalRef.current = window.setInterval(() => {
      if (mode === 'stopwatch') {
        setStopwatchSec((s) => s + 1)
      } else {
        setSecondsLeft((prev) => {
          if (prev <= 1) return 0
          return prev - 1
        })
      }
    }, 1000)
    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [status, mode])

  // Автозавершение таймера при достижении 00:00 (кроме секундомера)
  useEffect(() => {
    if (status !== 'running' || mode === 'stopwatch' || secondsLeft > 0) return
    playPomoBell()
    if (mode === 'pomo') {
      const nextSessions = recordSession(durationSec, 'pomo')
      const pomoCount = nextSessions.filter((s) => s.mode === 'pomo').length
      const nextMode: PomoMode = pomoCount % longBreakInterval === 0 ? 'longBreak' : 'shortBreak'
      const nextSec = getMinsForMode(nextMode) * 60
      setMode(nextMode)
      setDurationSec(nextSec)
      setSecondsLeft(nextSec)
      setStatus(autoStartBreak ? 'running' : 'idle')
    } else {
      const nextSec = pomoMins * 60
      setMode('pomo')
      setDurationSec(nextSec)
      setSecondsLeft(nextSec)
      setStatus(autoNextPomo ? 'running' : 'idle')
    }
  }, [secondsLeft, status, mode])

  function switchTab(nextTab: 'pomo' | 'stopwatch') {
    setStatus('idle')
    if (nextTab === 'stopwatch') {
      setMode('stopwatch')
      setStopwatchSec(0)
    } else {
      setMode('pomo')
      const sec = pomoMins * 60
      setDurationSec(sec)
      setSecondsLeft(sec)
    }
  }

  function switchMode(nextMode: PomoMode, customMins?: number) {
    setStatus('idle')
    setMode(nextMode)
    if (nextMode === 'stopwatch') {
      setStopwatchSec(0)
      return
    }
    const mins = customMins ?? getMinsForMode(nextMode)
    const sec = mins * 60
    setDurationSec(sec)
    setSecondsLeft(sec)
  }

  function toggleStartPause() {
    if (status === 'idle') {
      setStatus('running')
    } else if (status === 'running') {
      setStatus('paused')
    } else {
      setStatus('running')
    }
  }

  function handleStopOrFinish() {
    if (mode === 'stopwatch') {
      if (stopwatchSec >= 60) {
        recordSession(stopwatchSec, 'stopwatch')
      }
      setStatus('idle')
      setStopwatchSec(0)
      return
    }
    const elapsed = durationSec - secondsLeft
    if (mode === 'pomo' && elapsed >= 60) {
      recordSession(elapsed, 'pomo')
    }
    setStatus('idle')
    const sec = getMinsForMode(mode) * 60
    setDurationSec(sec)
    setSecondsLeft(sec)
  }

  const displaySec = mode === 'stopwatch' ? stopwatchSec : secondsLeft
  const progress =
    mode === 'stopwatch'
      ? (stopwatchSec % 3600) / 3600
      : durationSec > 0
        ? (durationSec - secondsLeft) / durationSec
        : 0

  return {
    mode,
    status,
    durationSec,
    secondsLeft,
    stopwatchSec,
    displaySec,
    progress,
    switchTab,
    switchMode,
    toggleStartPause,
    handleStopOrFinish,
  }
}
