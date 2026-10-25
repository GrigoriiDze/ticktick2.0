import {
  arrayRemove,
  arrayUnion,
  deleteDoc,
  deleteField,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore'
import { diffTask, HISTORY_WINDOW_MS, mergeChanges, type Changes, type HistoryEntry } from '../domain/history'
import type { NextOccurrence } from '../domain/repeat'
import type { ChecklistItem, Task } from '../domain/types'
import { clean, col, newId } from './common'
import { removeFilesOfTasks } from './files'

const NAME = 'tasks'
const HISTORY = 'taskHistory'

export type NewTask = Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>> & {
  projectId: string
  title: string
}

/** Поля, которые можно менять. Правятся только они, задача целиком никогда не перезаписывается */
export type TaskPatch = Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'items' | 'reminders'>>

function defaults(): Omit<Task, 'id' | 'projectId' | 'title' | 'createdAt' | 'updatedAt' | 'deletedAt'> {
  return {
    parentId: null,
    columnId: null,
    sortOrder: 0,
    content: '',
    kind: 'text',
    items: {},
    priority: 0,
    status: 'open',
    completedAt: null,
    start: null,
    due: null,
    isAllDay: false,
    timeZone: null,
    repeat: null,
    repeatFrom: 'due',
    exDates: [],
    reminders: {},
    tags: [],
    pinnedAt: null,
    waiting: null,
    address: null,
    sourceId: null,
  }
}

export function createTasksRepo(db: Firestore, uid: string) {
  const ref = (id: string) => doc(col(db, uid, NAME), id)
  const historyRef = (id: string) => doc(col(db, uid, HISTORY), id)

  // Последнее известное состояние задач: по нему считается, что именно изменила правка
  const known = new Map<string, Task>()
  // Последняя запись истории, начатая на этом устройстве: правки подряд вливаются в неё
  const lastEntry = new Map<string, { id: string; at: number; changes: Changes }>()

  /**
   * Правка задачи вместе с записью в историю одной операцией. Правки подряд за 10 минут склеиваются
   * в одну запись, а если поле вернули как было, запись исчезает. Записи истории лежат отдельной
   * коллекцией и ничего не меняют в самой задаче
   */
  function write(id: string, fields: Record<string, unknown>): Promise<void> {
    const old = known.get(id)
    const changes = old ? diffTask(old, fields) : {}
    const stamped = { ...fields, updatedAt: serverTimestamp() }
    if (old) known.set(id, { ...old, ...(fields as Partial<Task>) })
    if (Object.keys(changes).length === 0) return updateDoc(ref(id), stamped)

    const now = Date.now()
    const prev = lastEntry.get(id)
    const batch = writeBatch(db)
    batch.update(ref(id), stamped)
    if (prev && now - prev.at < HISTORY_WINDOW_MS) {
      const merged = mergeChanges(prev.changes, changes)
      if (Object.keys(merged).length === 0) {
        batch.delete(historyRef(prev.id))
        lastEntry.delete(id)
      } else {
        batch.set(historyRef(prev.id), { taskId: id, at: serverTimestamp(), changes: merged })
        lastEntry.set(id, { id: prev.id, at: now, changes: merged })
      }
    } else {
      const entryId = newId(db, uid, HISTORY)
      batch.set(historyRef(entryId), { taskId: id, at: serverTimestamp(), changes })
      lastEntry.set(id, { id: entryId, at: now, changes })
    }
    return batch.commit()
  }

  /** История и файлы задач, id которых переданы, удаляются вместе с ними */
  async function dropHistory(ids: string[]): Promise<void> {
    for (let i = 0; i < ids.length; i += 10) {
      const snap = await getDocs(query(col(db, uid, HISTORY), where('taskId', 'in', ids.slice(i, i + 10))))
      for (let j = 0; j < snap.docs.length; j += 400) {
        const batch = writeBatch(db)
        for (const d of snap.docs.slice(j, j + 400)) batch.delete(d.ref)
        await batch.commit()
      }
    }
    for (const id of ids) lastEntry.delete(id)
    await removeFilesOfTasks(db, uid, ids)
  }

  return {
    newId: () => newId(db, uid, NAME),

    /** Создаёт задачу. Запись попадает в локальную копию сразу, на сервер уходит, когда есть сеть */
    async create(input: NewTask, id: string = newId(db, uid, NAME)): Promise<string> {
      await setDoc(ref(id), {
        ...defaults(),
        ...clean(input),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        deletedAt: null,
      })
      return id
    },

    /** Меняет только переданные поля */
    update(id: string, patch: TaskPatch): Promise<void> {
      return write(id, clean(patch))
    },

    complete(id: string, done: boolean): Promise<void> {
      return write(id, { status: done ? 'done' : 'open', completedAt: done ? Date.now() : null })
    },

    /** «Не буду делать»: задача закрыта без выполнения. false возвращает её в работу */
    setSkipped(id: string, skipped: boolean): Promise<void> {
      return write(id, { status: skipped ? 'wontdo' : 'open', completedAt: skipped ? Date.now() : null })
    },

    /**
     * Выполнение повторяющейся задачи. Одной операцией: задача получает следующий срок, пункты чек-листа
     * сбрасываются, а в историю пишется выполненная копия. У копии фиксированный id (задача + срок),
     * поэтому два устройства, закрывшие один и тот же цикл, дают одну копию и один сдвиг
     */
    completeRepeating(task: Task, next: NextOccurrence, now: number): Promise<void> {
      const batch = writeBatch(db)
      const { id: _id, createdAt: _c, updatedAt: _u, deletedAt: _d, ...snapshot } = task
      batch.set(ref(`${task.id}~${String(task.due)}`), {
        ...snapshot,
        repeat: null,
        status: 'done',
        completedAt: now,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        deletedAt: null,
      })
      const advance: Record<string, unknown> = {
        due: next.due,
        start: next.start,
        repeat: next.rule,
        updatedAt: serverTimestamp(),
      }
      for (const itemId of Object.keys(task.items)) {
        advance[`items.${itemId}.done`] = false
        advance[`items.${itemId}.completedAt`] = deleteField()
      }
      batch.update(ref(task.id), advance)
      return batch.commit()
    },

    /** Пункт чек-листа правится по пути items.<id>, поэтому два устройства не затирают друг друга */
    setItem(id: string, itemId: string, item: ChecklistItem): Promise<void> {
      return updateDoc(ref(id), { [`items.${itemId}`]: item, updatedAt: serverTimestamp() })
    },

    removeItem(id: string, itemId: string): Promise<void> {
      return updateDoc(ref(id), { [`items.${itemId}`]: deleteField(), updatedAt: serverTimestamp() })
    },

    /** Заменяет все напоминания задачи. Пустой набор убирает их */
    setReminders(id: string, triggers: string[]): Promise<void> {
      const reminders = Object.fromEntries(triggers.map((trigger, i) => [`r${i + 1}`, { trigger }]))
      return updateDoc(ref(id), { reminders, updatedAt: serverTimestamp() })
    },

    setReminder(id: string, reminderId: string, trigger: string): Promise<void> {
      return updateDoc(ref(id), { [`reminders.${reminderId}`]: { trigger }, updatedAt: serverTimestamp() })
    },

    removeReminder(id: string, reminderId: string): Promise<void> {
      return updateDoc(ref(id), { [`reminders.${reminderId}`]: deleteField(), updatedAt: serverTimestamp() })
    },

    /** Мягкое удаление: запись остаётся, другие устройства узнают об удалении. Окончательно чистим через 30 дней */
    softDelete(id: string): Promise<void> {
      return updateDoc(ref(id), { deletedAt: serverTimestamp(), updatedAt: serverTimestamp() })
    },

    restore(id: string): Promise<void> {
      return updateDoc(ref(id), { deletedAt: null, updatedAt: serverTimestamp() })
    },

    /** Теги меняются по одному через arrayUnion и arrayRemove: два устройства не затирают теги друг друга */
    addTag(id: string, tag: string): Promise<void> {
      return updateDoc(ref(id), { tags: arrayUnion(tag), updatedAt: serverTimestamp() })
    },

    removeTag(id: string, tag: string): Promise<void> {
      return updateDoc(ref(id), { tags: arrayRemove(tag), updatedAt: serverTimestamp() })
    },

    /** Окончательное удаление. Только из корзины */
    async purge(id: string): Promise<void> {
      await deleteDoc(ref(id))
      await dropHistory([id])
    },

    async purgeMany(ids: string[]): Promise<void> {
      for (let i = 0; i < ids.length; i += 400) {
        const batch = writeBatch(db)
        for (const id of ids.slice(i, i + 400)) batch.delete(ref(id))
        await batch.commit()
      }
      await dropHistory(ids)
    },

    /** Записи истории одной задачи, новые сверху. Обновляется само */
    subscribeHistory(taskId: string, onChange: (entries: HistoryEntry[]) => void, onError?: (e: Error) => void): Unsubscribe {
      const q = query(col(db, uid, HISTORY), where('taskId', '==', taskId))
      return onSnapshot(
        q,
        (snap) => {
          const time = (e: HistoryEntry) => (e.at ? e.at.toMillis() : Number.MAX_SAFE_INTEGER)
          onChange(snap.docs.map((d) => ({ ...(d.data() as Omit<HistoryEntry, 'id'>), id: d.id })).sort((a, b) => time(b) - time(a)))
        },
        onError,
      )
    },

    /** Задачи в корзине */
    subscribeDeleted(onChange: (tasks: Task[]) => void, onError?: (e: Error) => void): Unsubscribe {
      const q = query(col(db, uid, NAME), where('deletedAt', '!=', null))
      return onSnapshot(
        q,
        (snap) => onChange(snap.docs.map((d) => ({ ...(d.data() as Omit<Task, 'id'>), id: d.id }))),
        onError,
      )
    },

    /** Все живые задачи. Обновляется само, в том числе когда правка пришла с другого устройства */
    subscribe(onChange: (tasks: Task[]) => void, onError?: (e: Error) => void): Unsubscribe {
      const q = query(col(db, uid, NAME), where('deletedAt', '==', null))
      return onSnapshot(
        q,
        (snap) => {
          const list = snap.docs.map((d) => ({ ...(d.data() as Omit<Task, 'id'>), id: d.id }))
          known.clear()
          for (const t of list) known.set(t.id, t)
          onChange(list)
        },
        onError,
      )
    },
  }
}

export type TasksRepo = ReturnType<typeof createTasksRepo>
