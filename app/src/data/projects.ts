import {
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
import { INBOX_ID, type Project } from '../domain/types'
import { clean, col, newId } from './common'

const NAME = 'projects'

export type NewProject = Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>> & { name: string }

export type ProjectPatch = Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>>

function defaults(): Omit<Project, 'id' | 'name' | 'createdAt' | 'updatedAt' | 'deletedAt'> {
  return {
    color: null,
    groupId: null,
    sortOrder: 0,
    viewMode: 'list',
    kind: 'task',
    isInbox: false,
    closed: false,
    site: null,
  }
}

export function createProjectsRepo(db: Firestore, uid: string) {
  const ref = (id: string) => doc(col(db, uid, NAME), id)

  return {
    newId: () => newId(db, uid, NAME),

    async create(input: NewProject, id: string = newId(db, uid, NAME)): Promise<string> {
      await setDoc(ref(id), {
        ...defaults(),
        ...clean(input),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        deletedAt: null,
      })
      return id
    },

    update(id: string, patch: ProjectPatch): Promise<void> {
      return updateDoc(ref(id), { ...clean(patch), updatedAt: serverTimestamp() })
    },

    /** Карточка объекта правится по полям, как и всё остальное */
    setSiteField(id: string, field: string, value: unknown): Promise<void> {
      return updateDoc(ref(id), { [`site.${field}`]: value, updatedAt: serverTimestamp() })
    },

    softDelete(id: string): Promise<void> {
      return updateDoc(ref(id), { deletedAt: serverTimestamp(), updatedAt: serverTimestamp() })
    },

    /**
     * Входящие имеют фиксированный id, поэтому два устройства создадут одну запись, а не две.
     * Вызывать только когда сервер подтвердил, что Входящих нет (см. subscribe, fromCache=false).
     * Иначе на свежем устройстве с пустой копией перезапишем уже существующие
     */
    async createInbox(): Promise<void> {
      await this.create({ name: 'Входящие', isInbox: true, sortOrder: -1 }, INBOX_ID)
    },

    /** fromCache = true значит данные из локальной копии, сервер ещё не отвечал */
    subscribe(
      onChange: (projects: Project[], meta: { fromCache: boolean }) => void,
      onError?: (e: Error) => void,
    ): Unsubscribe {
      const q = query(col(db, uid, NAME), where('deletedAt', '==', null))
      // Без includeMetadataChanges подписка не вызывается, когда меняется только fromCache,
      // и мы бы никогда не узнали, что сервер ответил
      return onSnapshot(
        q,
        { includeMetadataChanges: true },
        (snap) =>
          onChange(
            snap.docs.map((d) => ({ ...(d.data() as Omit<Project, 'id'>), id: d.id })),
            { fromCache: snap.metadata.fromCache },
          ),
        onError,
      )
    },
  }
}

export type ProjectsRepo = ReturnType<typeof createProjectsRepo>
