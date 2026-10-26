/**
 * Аудио-движок TickTick: оригинальные звуки из APK (/sounds/*) + Web Audio синтезатор-фоллбэк,
 * генератор белого шума для Фокуса и тактильный отклик (вибрация).
 */

export type CompletionSoundId = 'none' | 'jingle' | 'drip' | 'knock' | 'spiral'
export type NotificationSoundId = 'ticktick_pop' | 'dida_bells' | 'jingle' | 'soft' | 'silent'
export type WhiteNoiseId = 'none' | 'clock' | 'rain' | 'forest' | 'campfire' | 'waves' | 'white_noise'

export const COMPLETION_SOUND_LABELS: Record<CompletionSoundId, string> = {
  none: 'Нет',
  jingle: 'Джингл',
  drip: 'Капельница',
  knock: 'Стук',
  spiral: 'Спираль',
}

export const NOTIFICATION_SOUND_LABELS: Record<NotificationSoundId, string> = {
  ticktick_pop: 'По умолчанию (TickTick Pop)',
  dida_bells: 'Колокольчик (Bells)',
  jingle: 'Джингл',
  soft: 'Мягкий тон',
  silent: 'Без звука',
}

export const WHITE_NOISE_LABELS: Record<WhiteNoiseId, string> = {
  none: 'Нет',
  clock: 'Тиканье часов',
  rain: 'Дождь',
  forest: 'Лес',
  campfire: 'Костёр',
  waves: 'Морские волны',
  white_noise: 'Белый шум',
}

let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (AudioCtx) ctx = new AudioCtx()
  }
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {})
  }
  return ctx
}

export function getCompletionSoundPref(): CompletionSoundId {
  try {
    const v = localStorage.getItem('tt_completion_sound') as CompletionSoundId | null
    if (v && v in COMPLETION_SOUND_LABELS) return v
    // Backwards compatibility with old boolean flag
    if (localStorage.getItem('tt_sound_done') === '0') return 'none'
  } catch {}
  return 'jingle'
}

export function setCompletionSoundPref(sound: CompletionSoundId): void {
  try {
    localStorage.setItem('tt_completion_sound', sound)
    localStorage.setItem('tt_sound_done', sound === 'none' ? '0' : '1')
  } catch {}
}

export function getNotificationSoundPref(): NotificationSoundId {
  try {
    const v = localStorage.getItem('tt_notification_sound') as NotificationSoundId | null
    if (v && v in NOTIFICATION_SOUND_LABELS) return v
  } catch {}
  return 'ticktick_pop'
}

export function setNotificationSoundPref(sound: NotificationSoundId): void {
  try {
    localStorage.setItem('tt_notification_sound', sound)
  } catch {}
}

function playAudioFile(src: string, fallback: () => void): void {
  try {
    const audio = new Audio(src)
    audio.volume = 0.85
    const p = audio.play()
    if (p && typeof p.catch === 'function') {
      p.catch(() => fallback())
    }
  } catch {
    fallback()
  }
}

function playSynthCompletion(sound: CompletionSoundId): void {
  if (sound === 'none') return
  try {
    const c = getCtx()
    if (!c) return
    const now = c.currentTime
    if (sound === 'drip') {
      const osc = c.createOscillator()
      const g = c.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(520, now)
      osc.frequency.exponentialRampToValueAtTime(1280, now + 0.11)
      g.gain.setValueAtTime(0.01, now)
      g.gain.linearRampToValueAtTime(0.24, now + 0.02)
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.18)
      osc.connect(g)
      g.connect(c.destination)
      osc.start(now)
      osc.stop(now + 0.19)
      return
    }
    if (sound === 'knock') {
      const osc = c.createOscillator()
      const g = c.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(220, now)
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.09)
      g.gain.setValueAtTime(0.28, now)
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.11)
      osc.connect(g)
      g.connect(c.destination)
      osc.start(now)
      osc.stop(now + 0.12)
      return
    }
    if (sound === 'spiral') {
      const freqs = [523.25, 659.25, 783.99, 1046.5]
      freqs.forEach((f, idx) => {
        const osc = c.createOscillator()
        const g = c.createGain()
        const t = now + idx * 0.055
        osc.type = 'sine'
        osc.frequency.setValueAtTime(f, t)
        g.gain.setValueAtTime(0.16, t)
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.18)
        osc.connect(g)
        g.connect(c.destination)
        osc.start(t)
        osc.stop(t + 0.19)
      })
      return
    }
    // Default 'jingle'
    const osc1 = c.createOscillator()
    const osc2 = c.createOscillator()
    const gain = c.createGain()
    osc1.type = 'sine'
    osc2.type = 'triangle'
    osc1.frequency.setValueAtTime(587.33, now)
    osc1.frequency.setValueAtTime(880, now + 0.07)
    osc2.frequency.setValueAtTime(1174.66, now + 0.07)
    gain.gain.setValueAtTime(0.01, now)
    gain.gain.linearRampToValueAtTime(0.18, now + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28)
    osc1.connect(gain)
    osc2.connect(gain)
    gain.connect(c.destination)
    osc1.start(now)
    osc2.start(now + 0.07)
    osc1.stop(now + 0.28)
    osc2.stop(now + 0.28)
  } catch {}
}

/** Проигрывает звук завершения задачи (или конкретный звук при предпросмотре в Настройках) */
export function playCompletionSound(override?: CompletionSoundId): void {
  const sound = override ?? getCompletionSoundPref()
  if (sound === 'none') return
  const fileMap: Record<Exclude<CompletionSoundId, 'none'>, string> = {
    jingle: '/sounds/completion_sound_jingle.aac',
    drip: '/sounds/completion_sound_drip.aac',
    knock: '/sounds/completion_sound_knock.aac',
    spiral: '/sounds/completion_sound_spiral.aac',
  }
  playAudioFile(fileMap[sound], () => playSynthCompletion(sound))
}

/** Вибрация при завершении задачи или перетаскивании */
export function triggerCompletionVibration(force = false): void {
  try {
    const enabled = force || localStorage.getItem('tt_vibrate_done') !== '0'
    if (enabled && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(30)
    }
  } catch {}
}

/** Проигрывает звук уведомления/напоминания */
export function playNotificationSound(override?: NotificationSoundId): void {
  const sound = override ?? getNotificationSoundPref()
  if (sound === 'silent') return
  if (sound === 'ticktick_pop') {
    playAudioFile('/sounds/ticktick_pop.ogg', () => playSynthNotification('ticktick_pop'))
    return
  }
  if (sound === 'dida_bells') {
    playAudioFile('/sounds/dida_bells.mp3', () => playSynthNotification('dida_bells'))
    return
  }
  if (sound === 'jingle') {
    playAudioFile('/sounds/completion_sound_jingle.aac', () => playSynthCompletion('jingle'))
    return
  }
  playSynthNotification('soft')
}

function playSynthNotification(sound: NotificationSoundId): void {
  try {
    const c = getCtx()
    if (!c) return
    const now = c.currentTime
    const notes =
      sound === 'dida_bells'
        ? [659.25, 783.99, 987.77, 1318.5]
        : sound === 'soft'
          ? [440, 554.37]
          : [587.33, 880, 1174.66]
    notes.forEach((freq, i) => {
      const osc = c.createOscillator()
      const g = c.createGain()
      osc.type = 'sine'
      const start = now + i * 0.1
      osc.frequency.setValueAtTime(freq, start)
      g.gain.setValueAtTime(0.01, start)
      g.gain.linearRampToValueAtTime(0.22, start + 0.02)
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.35)
      osc.connect(g)
      g.connect(c.destination)
      osc.start(start)
      osc.stop(start + 0.36)
    })
  } catch {}
}

/** Звук окончания сессии Помодоро */
export function playPomoBell(): void {
  playAudioFile('/sounds/pomo_end.aac', () => playSynthNotification('dida_bells'))
  try {
    if (localStorage.getItem('tt_vibrate_notif') !== '0' && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([120, 80, 180])
    }
  } catch {}
}

// ─── Генератор фонового белого шума для Помодоро ───────────────────────────

let whiteNoiseTimer: number | null = null
let whiteNoiseSource: AudioBufferSourceNode | null = null
let whiteNoiseGain: GainNode | null = null

export function stopWhiteNoise(): void {
  if (whiteNoiseTimer !== null) {
    window.clearInterval(whiteNoiseTimer)
    whiteNoiseTimer = null
  }
  if (whiteNoiseSource) {
    try {
      whiteNoiseSource.stop()
      whiteNoiseSource.disconnect()
    } catch {}
    whiteNoiseSource = null
  }
  if (whiteNoiseGain) {
    try {
      whiteNoiseGain.disconnect()
    } catch {}
    whiteNoiseGain = null
  }
}

export function startWhiteNoise(mode: WhiteNoiseId): void {
  stopWhiteNoise()
  if (mode === 'none') return
  const c = getCtx()
  if (!c) return

  if (mode === 'clock') {
    const tick = () => {
      try {
        const now = c.currentTime
        const osc = c.createOscillator()
        const g = c.createGain()
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(900, now)
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.025)
        g.gain.setValueAtTime(0.08, now)
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.03)
        osc.connect(g)
        g.connect(c.destination)
        osc.start(now)
        osc.stop(now + 0.035)
      } catch {}
    }
    tick()
    whiteNoiseTimer = window.setInterval(tick, 1000)
    return
  }

  try {
    const bufferSize = c.sampleRate * 3
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate)
    const data = buffer.getChannelData(0)
    let lastOut = 0
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1
      if (mode === 'white_noise') {
        data[i] = white * 0.25
      } else {
        // Brown/Pink filtered noise for rain, forest, campfire, waves
        lastOut = (lastOut + 0.04 * white) / 1.04
        data[i] = lastOut * 1.4
      }
    }

    const source = c.createBufferSource()
    source.buffer = buffer
    source.loop = true

    const filter = c.createBiquadFilter()
    filter.type = mode === 'forest' ? 'bandpass' : 'lowpass'
    filter.frequency.value =
      mode === 'rain' ? 1100 : mode === 'campfire' ? 650 : mode === 'waves' ? 420 : mode === 'forest' ? 880 : 1800

    const gain = c.createGain()
    gain.gain.value = 0.12

    source.connect(filter)
    filter.connect(gain)
    gain.connect(c.destination)
    source.start()

    whiteNoiseSource = source
    whiteNoiseGain = gain
  } catch {}
}
