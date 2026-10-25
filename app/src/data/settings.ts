import { doc, onSnapshot, setDoc, type Firestore, type Unsubscribe } from 'firebase/firestore'
import { DEFAULT_AI, type AiSettings } from '../domain/assistant'
import { col } from './common'

/** Настройки пользователя, которые должны быть одинаковы на всех его устройствах */
export function createSettingsRepo(db: Firestore, uid: string) {
  const ai = () => doc(col(db, uid, 'settings'), 'ai')
  return {
    /** Настройки помощника. Пока ничего не вносили, приходят значения по умолчанию */
    subscribeAi(onChange: (s: AiSettings) => void, onError?: (e: Error) => void): Unsubscribe {
      return onSnapshot(ai(), (snap) => onChange({ ...DEFAULT_AI, ...(snap.data() as Partial<AiSettings> | undefined) }), onError)
    },

    /** Меняет только переданные поля */
    setAi(patch: Partial<AiSettings>): Promise<void> {
      return setDoc(ai(), patch, { merge: true })
    },
  }
}

export type SettingsRepo = ReturnType<typeof createSettingsRepo>
