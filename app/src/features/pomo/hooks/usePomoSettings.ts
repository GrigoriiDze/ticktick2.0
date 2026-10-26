import { useState } from 'react'
import { StorageService } from '../../../platform/storage'
import { POMO_DURATIONS } from '../../../domain/pomo'
import type { WhiteNoiseId } from '../../../platform/audio'

export interface PomoSettings {
  pomoMins: number
  setPomoMins: (v: number) => void
  shortBreakMins: number
  setShortBreakMins: (v: number) => void
  longBreakMins: number
  setLongBreakMins: (v: number) => void
  longBreakInterval: number
  setLongBreakInterval: (v: number) => void
  autoNextPomo: boolean
  setAutoNextPomo: (v: boolean) => void
  autoStartBreak: boolean
  setAutoStartBreak: (v: boolean) => void
  whiteNoise: WhiteNoiseId
  setWhiteNoise: (v: WhiteNoiseId) => void
}

export function usePomoSettings(): PomoSettings {
  const [pomoMins, setPomoMinsState] = useState<number>(() =>
    StorageService.get<number>('tt_pomo_mins', Math.round(POMO_DURATIONS.pomo / 60)),
  )
  const [shortBreakMins, setShortBreakMinsState] = useState<number>(() =>
    StorageService.get<number>('tt_short_break_mins', Math.round(POMO_DURATIONS.shortBreak / 60)),
  )
  const [longBreakMins, setLongBreakMinsState] = useState<number>(() =>
    StorageService.get<number>('tt_long_break_mins', Math.round(POMO_DURATIONS.longBreak / 60)),
  )
  const [longBreakInterval, setLongBreakIntervalState] = useState<number>(() =>
    StorageService.get<number>('tt_long_break_interval', 4),
  )
  const [autoNextPomo, setAutoNextPomoState] = useState<boolean>(() =>
    StorageService.getBool('tt_auto_next_pomo', false),
  )
  const [autoStartBreak, setAutoStartBreakState] = useState<boolean>(() =>
    StorageService.getBool('tt_auto_start_break', false),
  )
  const [whiteNoise, setWhiteNoiseState] = useState<WhiteNoiseId>(() =>
    StorageService.get<WhiteNoiseId>('tt_white_noise', 'none'),
  )

  const setPomoMins = (v: number) => {
    setPomoMinsState(v)
    StorageService.set('tt_pomo_mins', v)
  }

  const setShortBreakMins = (v: number) => {
    setShortBreakMinsState(v)
    StorageService.set('tt_short_break_mins', v)
  }

  const setLongBreakMins = (v: number) => {
    setLongBreakMinsState(v)
    StorageService.set('tt_long_break_mins', v)
  }

  const setLongBreakInterval = (v: number) => {
    setLongBreakIntervalState(v)
    StorageService.set('tt_long_break_interval', v)
  }

  const setAutoNextPomo = (v: boolean) => {
    setAutoNextPomoState(v)
    StorageService.set('tt_auto_next_pomo', v ? '1' : '0')
  }

  const setAutoStartBreak = (v: boolean) => {
    setAutoStartBreakState(v)
    StorageService.set('tt_auto_start_break', v ? '1' : '0')
  }

  const setWhiteNoise = (v: WhiteNoiseId) => {
    setWhiteNoiseState(v)
    StorageService.set('tt_white_noise', v)
  }

  return {
    pomoMins,
    setPomoMins,
    shortBreakMins,
    setShortBreakMins,
    longBreakMins,
    setLongBreakMins,
    longBreakInterval,
    setLongBreakInterval,
    autoNextPomo,
    setAutoNextPomo,
    autoStartBreak,
    setAutoStartBreak,
    whiteNoise,
    setWhiteNoise,
  }
}

