import { doc, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where, type Firestore, type Unsubscribe } from 'firebase/firestore'
import type { ProjectGroup } from '../domain/types'
import { clean, col, newId } from './common'

const NAME = 'projectGroups'

export type NewProjectGroup = Partial<Omit<ProjectGroup, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>> & { name: string }
export type ProjectGroupPatch = Partial<Omit<ProjectGroup, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>>

export function createProjectGroupsRepo(db: Firestore, uid: string) {
  const ref = (id: string) => doc(col(db, uid, NAME), id)

  return {
    async create(input: NewProjectGroup, id: string = newId(db, uid, NAME)): Promise<string> {
      await setDoc(ref(id), {
        sortOrder: 0,
        collapsed: false,
        ...clean(input),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        deletedAt: null,
      })
      return id
    },

    update(id: string, patch: ProjectGroupPatch): Promise<void> {
      return updateDoc(ref(id), { ...clean(patch), updatedAt: serverTimestamp() })
    },

    softDelete(id: string): Promise<void> {
      return updateDoc(ref(id), { deletedAt: serverTimestamp(), updatedAt: serverTimestamp() })
    },

    subscribe(onChange: (groups: ProjectGroup[]) => void, onError?: (e: Error) => void): Unsubscribe {
      const q = query(col(db, uid, NAME), where('deletedAt', '==', null))
      return onSnapshot(q, (snap) => onChange(snap.docs.map((d) => ({ ...(d.data() as Omit<ProjectGroup, 'id'>), id: d.id }))), onError)
    },
  }
}

export type ProjectGroupsRepo = ReturnType<typeof createProjectGroupsRepo>
