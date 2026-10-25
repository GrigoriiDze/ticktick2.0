import { doc, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where, type Firestore, type Unsubscribe } from 'firebase/firestore'
import type { BoardColumn } from '../domain/types'
import { clean, col, newId } from './common'

const NAME = 'columns'

export type NewColumn = Partial<Omit<BoardColumn, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>> & { projectId: string; name: string }
export type ColumnPatch = Partial<Pick<BoardColumn, 'name' | 'sortOrder'>>

/** Колонки канбана: у каждой списка свои. Задача лежит в колонке, если её columnId указывает на неё */
export function createColumnsRepo(db: Firestore, uid: string) {
  const ref = (id: string) => doc(col(db, uid, NAME), id)

  return {
    async create(input: NewColumn, id: string = newId(db, uid, NAME)): Promise<string> {
      await setDoc(ref(id), {
        sortOrder: 0,
        ...clean(input),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        deletedAt: null,
      })
      return id
    },

    update(id: string, patch: ColumnPatch): Promise<void> {
      return updateDoc(ref(id), { ...clean(patch), updatedAt: serverTimestamp() })
    },

    softDelete(id: string): Promise<void> {
      return updateDoc(ref(id), { deletedAt: serverTimestamp(), updatedAt: serverTimestamp() })
    },

    subscribe(onChange: (columns: BoardColumn[]) => void, onError?: (e: Error) => void): Unsubscribe {
      const q = query(col(db, uid, NAME), where('deletedAt', '==', null))
      return onSnapshot(q, (snap) => onChange(snap.docs.map((d) => ({ ...(d.data() as Omit<BoardColumn, 'id'>), id: d.id }))), onError)
    },
  }
}

export type ColumnsRepo = ReturnType<typeof createColumnsRepo>
