import { Capacitor } from '@capacitor/core'
import { SpeechRecognition } from '@capacitor-community/speech-recognition'

const LANGUAGE = 'ru-RU'

interface WebRecognition {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onend: (() => void) | null
  onerror: ((e: { error: string }) => void) | null
  start: () => void
  stop: () => void
}

function webRecognition(): (new () => WebRecognition) | null {
  const w = window as unknown as { SpeechRecognition?: new () => WebRecognition; webkitSpeechRecognition?: new () => WebRecognition }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

/** Есть ли голосовой ввод: на телефоне через системное распознавание Android, в браузере если он это умеет */
export async function voiceSupported(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      return (await SpeechRecognition.available()).available
    } catch {
      return false
    }
  }
  return webRecognition() !== null
}

export interface VoiceHandlers {
  /** Весь распознанный текст на данный момент, он заменяет предыдущий */
  onText: (text: string) => void
  onEnd: () => void
  onError: (message: string) => void
}

const ERRORS: Record<string, string> = {
  'not-allowed': 'Нет доступа к микрофону',
  'service-not-allowed': 'Нет доступа к микрофону',
  'no-speech': 'Ничего не услышал',
  network: 'Для распознавания нужен интернет',
}

/** Запускает запись голоса и возвращает функцию остановки */
export async function startVoice(h: VoiceHandlers): Promise<() => void> {
  if (Capacitor.isNativePlatform()) {
    const perm = await SpeechRecognition.requestPermissions()
    if (perm.speechRecognition !== 'granted') {
      h.onError('Нет доступа к микрофону')
      h.onEnd()
      return () => undefined
    }
    let finished = false
    const finish = () => {
      if (finished) return
      finished = true
      void SpeechRecognition.removeAllListeners()
      h.onEnd()
    }
    await SpeechRecognition.addListener('partialResults', (e: { matches?: string[] }) => {
      if (e.matches?.[0]) h.onText(e.matches[0])
    })
    await SpeechRecognition.addListener('listeningState', (e: { status: 'started' | 'stopped' }) => {
      if (e.status === 'stopped') finish()
    })
    try {
      await SpeechRecognition.start({ language: LANGUAGE, partialResults: true, popup: false, maxResults: 1 })
    } catch (e) {
      h.onError(e instanceof Error ? e.message : 'Не удалось включить микрофон')
      finish()
    }
    return () => void SpeechRecognition.stop().catch(() => finish())
  }

  const Rec = webRecognition()
  if (!Rec) {
    h.onError('Браузер не умеет распознавать речь')
    h.onEnd()
    return () => undefined
  }
  const rec = new Rec()
  rec.lang = LANGUAGE
  rec.interimResults = true
  rec.continuous = false
  rec.onresult = (e) => {
    const text = Array.from(e.results, (r) => r[0]?.transcript ?? '').join(' ').trim()
    if (text) h.onText(text)
  }
  rec.onerror = (e) => h.onError(ERRORS[e.error] ?? 'Не удалось распознать речь')
  rec.onend = () => h.onEnd()
  rec.start()
  return () => rec.stop()
}
