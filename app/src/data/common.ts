import { collection, doc, type CollectionReference, type DocumentData, type Firestore } from 'firebase/firestore'

export function col(db: Firestore, uid: string, name: string): CollectionReference<DocumentData> {
  return collection(db, 'users', uid, name)
}

/** ID записи создаёт устройство, без запроса к серверу, иначе офлайн-создание ломается */
export function newId(db: Firestore, uid: string, name: string): string {
  return doc(col(db, uid, name)).id
}

/** Firestore не принимает undefined, убираем такие поля. Вложенные объекты не трогаем */
export function clean<T extends Record<string, unknown>>(data: T): Record<string, unknown> {
  return Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined))
}
