import { doc, getDocs, onSnapshot, query, serverTimestamp, where, writeBatch, type Firestore, type Unsubscribe } from 'firebase/firestore'
import { base64ToBytes, bytesToBase64, chunkId, MAX_FILE_BYTES, splitChunks, type TaskFile } from '../domain/files'
import { col, newId } from './common'

const FILES = 'taskFiles'
const CHUNKS = 'taskFileChunks'

/** Удаляет файлы (метку и все куски) одной операцией. Куски находятся по номерам, запрос не нужен */
function removeBatch(db: Firestore, uid: string, files: Array<Pick<TaskFile, 'id' | 'chunks'>>) {
  const batch = writeBatch(db)
  for (const f of files) {
    batch.delete(doc(col(db, uid, FILES), f.id))
    for (let i = 0; i < f.chunks; i++) batch.delete(doc(col(db, uid, CHUNKS), chunkId(f.id, i)))
  }
  return batch
}

/** Файлы всех этих задач удаляются. Зовётся при окончательном удалении задач, чтобы в базе не оставался мусор */
export async function removeFilesOfTasks(db: Firestore, uid: string, taskIds: string[]): Promise<void> {
  for (let i = 0; i < taskIds.length; i += 10) {
    const snap = await getDocs(query(col(db, uid, FILES), where('taskId', 'in', taskIds.slice(i, i + 10))))
    // В одной операции не больше 500 записей, поэтому файлы удаляем по одному
    for (const d of snap.docs) await removeBatch(db, uid, [{ id: d.id, chunks: Number((d.data() as TaskFile).chunks) }]).commit()
  }
}

export function createFilesRepo(db: Firestore, uid: string) {
  return {
    /** Сохраняет файл. Запись идёт одной операцией: либо файл целиком, либо ничего */
    async add(taskId: string, name: string, type: string, bytes: Uint8Array): Promise<string> {
      if (bytes.length > MAX_FILE_BYTES) throw new Error('Файл больше 5 МБ')
      const id = newId(db, uid, FILES)
      const chunks = splitChunks(bytesToBase64(bytes))
      const batch = writeBatch(db)
      batch.set(doc(col(db, uid, FILES), id), { taskId, name, type, size: bytes.length, chunks: chunks.length, createdAt: serverTimestamp() })
      chunks.forEach((data, index) => batch.set(doc(col(db, uid, CHUNKS), chunkId(id, index)), { fileId: id, index, data }))
      await batch.commit()
      return id
    },

    /** Файлы задачи, старые сверху. Обновляется само */
    subscribe(taskId: string, onChange: (files: TaskFile[]) => void, onError?: (e: Error) => void): Unsubscribe {
      const q = query(col(db, uid, FILES), where('taskId', '==', taskId))
      return onSnapshot(
        q,
        (snap) => {
          const time = (f: TaskFile) => (f.createdAt ? f.createdAt.toMillis() : Number.MAX_SAFE_INTEGER)
          onChange(snap.docs.map((d) => ({ ...(d.data() as Omit<TaskFile, 'id'>), id: d.id })).sort((a, b) => time(a) - time(b)))
        },
        onError,
      )
    },

    /** Читает файл целиком: собирает куски в порядке номеров */
    async read(file: Pick<TaskFile, 'id' | 'type'>): Promise<Blob> {
      const snap = await getDocs(query(col(db, uid, CHUNKS), where('fileId', '==', file.id)))
      const parts = snap.docs.map((d) => d.data() as { index: number; data: string }).sort((a, b) => a.index - b.index)
      return new Blob(parts.map((p) => base64ToBytes(p.data) as BlobPart), { type: file.type })
    },

    remove(file: Pick<TaskFile, 'id' | 'chunks'>): Promise<void> {
      return removeBatch(db, uid, [file]).commit()
    },
  }
}

export type FilesRepo = ReturnType<typeof createFilesRepo>
