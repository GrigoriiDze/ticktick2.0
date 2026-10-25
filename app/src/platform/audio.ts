/**
 * Web Audio API синтезатор звуков для таймера Помодоро:
 * - Звоночек завершения (Chime)
 * - Тиканье часов (Tick)
 * - Белый шум (White noise)
 * Не требует загрузки внешних mp3-файлов, работает автономно и офлайн.
 */

let ctx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (AudioCtx) {
      ctx = new AudioCtx()
    }
  }
  if (ctx && ctx.state === 'suspended') {
    void ctx.resume()
  }
  return ctx
}

/** Приятный колокольный звон завершения сессии (гармонический аккорд) */
export function playChime(): void {
  try {
    const ac = getAudioContext()
    if (!ac) return

    const notes = [523.25, 659.25, 783.99, 1046.5] // C5, E5, G5, C6
    const now = ac.currentTime

    notes.forEach((freq, idx) => {
      const osc = ac.createOscillator()
      const gain = ac.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now)

      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(0.15 / (idx + 1), now + 0.05 + idx * 0.04)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8 + idx * 0.1)

      osc.connect(gain)
      gain.connect(ac.destination)

      osc.start(now + idx * 0.04)
      osc.stop(now + 2.2)
    })
  } catch {}
}

/** Одиночный щелчок тиканья часов */
export function playTick(): void {
  try {
    const ac = getAudioContext()
    if (!ac) return

    const now = ac.currentTime
    const osc = ac.createOscillator()
    const gain = ac.createGain()

    osc.type = 'triangle'
    osc.frequency.setValueAtTime(1200, now)
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.02)

    gain.gain.setValueAtTime(0.04, now)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.02)

    osc.connect(gain)
    gain.connect(ac.destination)

    osc.start(now)
    osc.stop(now + 0.025)
  } catch {}
}

let whiteNoiseNode: AudioNode | null = null

/** Запуск/остановка непрерывного белого шума */
export function setWhiteNoise(enabled: boolean): void {
  try {
    const ac = getAudioContext()
    if (!ac) return

    if (!enabled) {
      if (whiteNoiseNode) {
        whiteNoiseNode.disconnect()
        whiteNoiseNode = null
      }
      return
    }

    if (whiteNoiseNode) return // уже играет

    // Создаём буфер с белым шумом на 2 секунды с зацикливанием
    const bufferSize = ac.sampleRate * 2
    const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate)
    const output = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1
    }

    const whiteNoise = ac.createBufferSource()
    whiteNoise.buffer = buffer
    whiteNoise.loop = true

    // Пропускаем через Lowpass-фильтр (мягкий шум дождя / ветра)
    const filter = ac.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 800

    const gain = ac.createGain()
    gain.gain.value = 0.05

    whiteNoise.connect(filter)
    filter.connect(gain)
    gain.connect(ac.destination)

    whiteNoise.start()
    whiteNoiseNode = gain
  } catch {}
}
