import {
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore'
import type { CheckStatus, Habit, HabitCheckin } from '../domain/types'
import { clean, col, newId } from './common'

const HABITS = 'habits'
const CHECKINS = 'habitCheckins'

export type NewHabit = Partial<Omit<Habit, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>> & { name: string; startDay: string }
export type HabitPatch = Partial<Omit<Habit, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>>

export function checkinId(habitId: string, day: string): string {
  return `${habitId}~${day}`
}

export function createHabitsRepo(db: Firestore, uid: string) {
  const ref = (id: string) => doc(col(db, uid, HABITS), id)

  return {
    newId: () => newId(db, uid, HABITS),

    async create(input: NewHabit, id: string = newId(db, uid, HABITS)): Promise<string> {
      await setDoc(ref(id), {
        color: '#7BC4FA',
        repeat: null,
        targetDays: null,
        reminders: [],
        archivedAt: null,
        sortOrder: 0,
        encouragement: null,
        sourceId: null,
        ...clean(input),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        deletedAt: null,
      })
      return id
    },

    update(id: string, patch: HabitPatch): Promise<void> {
      return updateDoc(ref(id), { ...clean(patch), updatedAt: serverTimestamp() })
    },

    archive(id: string, archived: boolean): Promise<void> {
      return updateDoc(ref(id), { archivedAt: archived ? Date.now() : null, updatedAt: serverTimestamp() })
    },

    softDelete(id: string): Promise<void> {
      return updateDoc(ref(id), { deletedAt: serverTimestamp(), updatedAt: serverTimestamp() })
    },

    subscribe(onChange: (habits: Habit[]) => void, onError?: (e: Error) => void): Unsubscribe {
      const q = query(col(db, uid, HABITS), where('deletedAt', '==', null))
      return onSnapshot(
        q,
        (snap) => onChange(snap.docs.map((d) => ({ ...(d.data() as Omit<Habit, 'id'>), id: d.id }))),
        onError,
      )
    },
  }
}

export function createCheckinsRepo(db: Firestore, uid: string) {
  const ref = (habitId: string, day: string) => doc(col(db, uid, CHECKINS), checkinId(habitId, day))

  return {
    /**
     * Отметка за день. Идентификатор складывается из привычки и дня, поэтому на один день она одна,
     * даже если два устройства отметили её без сети. merge не затирает заметку
     */
    set(habitId: string, day: string, status: CheckStatus): Promise<void> {
      return setDoc(ref(habitId, day), { habitId, day, status, updatedAt: serverTimestamp(), createdAt: serverTimestamp() }, { merge: true })
    },

    clear(habitId: string, day: string): Promise<void> {
      return deleteDoc(ref(habitId, day))
    },

    setNote(habitId: string, day: string, note: string | null): Promise<void> {
      return setDoc(ref(habitId, day), { habitId, day, note, updatedAt: serverTimestamp() }, { merge: true })
    },

    subscribe(onChange: (list: HabitCheckin[]) => void, onError?: (e: Error) => void): Unsubscribe {
      return onSnapshot(
        col(db, uid, CHECKINS),
        (snap) => onChange(snap.docs.map((d) => {
            const data = d.data() as Omit<HabitCheckin, 'id'>
            return { ...data, note: data.note ?? null, id: d.id }
          })),
        onError,
      )
    },
  }
}

export type HabitsRepo = ReturnType<typeof createHabitsRepo>
export type CheckinsRepo = ReturnType<typeof createCheckinsRepo>
