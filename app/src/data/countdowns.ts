import { doc, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where, type Firestore, type Unsubscribe } from 'firebase/firestore'
import type { Countdown } from '../domain/types'
import { clean, col, newId } from './common'

const NAME = 'countdowns'

export type NewCountdown = Partial<Omit<Countdown, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>> & { name: string; date: string }
export type CountdownPatch = Partial<Pick<Countdown, 'name' | 'date' | 'sortOrder'>>

/** Обратный отсчёт: события с датой, до которых считаем дни */
export function createCountdownsRepo(db: Firestore, uid: string) {
  const ref = (id: string) => doc(col(db, uid, NAME), id)

  return {
    async create(input: NewCountdown, id: string = newId(db, uid, NAME)): Promise<string> {
      await setDoc(ref(id), { sortOrder: 0, ...clean(input), createdAt: serverTimestamp(), updatedAt: serverTimestamp(), deletedAt: null })
      return id
    },

    update(id: string, patch: CountdownPatch): Promise<void> {
      return updateDoc(ref(id), { ...clean(patch), updatedAt: serverTimestamp() })
    },

    softDelete(id: string): Promise<void> {
      return updateDoc(ref(id), { deletedAt: serverTimestamp(), updatedAt: serverTimestamp() })
    },

    subscribe(onChange: (list: Countdown[]) => void, onError?: (e: Error) => void): Unsubscribe {
      const q = query(col(db, uid, NAME), where('deletedAt', '==', null))
      return onSnapshot(q, (snap) => onChange(snap.docs.map((d) => ({ ...(d.data() as Omit<Countdown, 'id'>), id: d.id }))), onError)
    },
  }
}

export type CountdownsRepo = ReturnType<typeof createCountdownsRepo>
