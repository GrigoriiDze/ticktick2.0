import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { disableNetwork, doc, enableNetwork, getDocFromServer, waitForPendingWrites, type Firestore } from 'firebase/firestore'
import { localToMs } from '../domain/dates'
import { rollbackPatch } from '../domain/history'
import { nextOccurrence } from '../domain/repeat'
import { checkinId, createCheckinsRepo, createHabitsRepo } from './habits'
import { createColumnsRepo } from './columns'
import { createCountdownsRepo } from './countdowns'
import { createFilesRepo } from './files'
import { createTasksRepo } from './tasks'
import { createProjectGroupsRepo } from './projectGroups'
import { createProjectsRepo } from './projects'

const UID = 'alice'
const MSK = 'Europe/Moscow'
const NOW = localToMs('2026-10-20', '15:00', MSK)

let env: RulesTestEnvironment
let dbA: Firestore
let dbB: Firestore

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-ticktick',
    firestore: {
      rules: readFileSync(resolve(import.meta.dirname, '../../../firestore.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  })
})

afterAll(async () => {
  await env.cleanup()
})

beforeEach(async () => {
  await env.clearFirestore()
  // Два устройства одного пользователя
  dbA = env.authenticatedContext(UID).firestore() as unknown as Firestore
  dbB = env.authenticatedContext(UID).firestore() as unknown as Firestore
  await enableNetwork(dbA)
  await enableNetwork(dbB)
})

/** Читает задачу прямо с сервера, минуя локальную копию */
async function serverTask(db: Firestore, id: string) {
  const snap = await getDocFromServer(doc(db, 'users', UID, 'tasks', id))
  return snap.exists() ? snap.data() : null
}

/** Отправляет накопленные офлайн правки и ждёт подтверждения сервера */
async function goOnline(...dbs: Firestore[]) {
  await Promise.all(dbs.map((d) => enableNetwork(d)))
  await Promise.all(dbs.map((d) => waitForPendingWrites(d)))
}

describe('создание и чтение', () => {
  it('задача, созданная на одном устройстве, видна на другом', async () => {
    const a = createTasksRepo(dbA, UID)
    const id = await a.create({ projectId: 'inbox', title: 'Замер на Свободы 5' })

    const onB = await serverTask(dbB, id)
    expect(onB?.title).toBe('Замер на Свободы 5')
    expect(onB?.status).toBe('open')
    expect(onB?.deletedAt).toBeNull()
  })

  it('задача, созданная без сети, доходит до сервера после возвращения сети', async () => {
    const a = createTasksRepo(dbA, UID)
    await disableNetwork(dbA)
    const id = a.newId()
    void a.create({ projectId: 'inbox', title: 'Создана в метро' }, id)

    expect(await serverTask(dbB, id)).toBeNull()

    await goOnline(dbA)
    expect((await serverTask(dbB, id))?.title).toBe('Создана в метро')
  })
})

describe('конфликты правок', () => {
  it('правки разных полей с двух устройств сохраняются обе', async () => {
    const a = createTasksRepo(dbA, UID)
    const b = createTasksRepo(dbB, UID)
    const id = await a.create({ projectId: 'inbox', title: 'Исходное название' })
    await serverTask(dbB, id)

    await disableNetwork(dbA)
    await disableNetwork(dbB)
    void a.update(id, { title: 'Новое название' })
    void b.update(id, { priority: 5 })
    await goOnline(dbA, dbB)

    const result = await serverTask(dbA, id)
    expect(result?.title).toBe('Новое название')
    expect(result?.priority).toBe(5)
  })

  it('одно и то же поле с двух устройств: побеждает та правка, что дошла до сервера позже', async () => {
    const a = createTasksRepo(dbA, UID)
    const b = createTasksRepo(dbB, UID)
    const id = await a.create({ projectId: 'inbox', title: 'Исходное' })

    await a.update(id, { title: 'Правка с телефона' })
    await b.update(id, { title: 'Правка с компьютера' })

    expect((await serverTask(dbA, id))?.title).toBe('Правка с компьютера')
  })

  it('пункты чек-листа, добавленные на двух устройствах без сети, не затирают друг друга', async () => {
    const a = createTasksRepo(dbA, UID)
    const b = createTasksRepo(dbB, UID)
    const id = await a.create({ projectId: 'inbox', title: 'Список закупок', kind: 'checklist' })
    await serverTask(dbB, id)

    await disableNetwork(dbA)
    await disableNetwork(dbB)
    void a.setItem(id, 'i1', { title: 'Воздуховод', done: false, sortOrder: 1 })
    void b.setItem(id, 'i2', { title: 'Хомуты', done: false, sortOrder: 2 })
    await goOnline(dbA, dbB)

    const items = (await serverTask(dbA, id))?.items
    expect(Object.keys(items ?? {}).sort()).toEqual(['i1', 'i2'])
  })

  it('отметка пункта на одном устройстве и новый пункт на другом сохраняются оба', async () => {
    const a = createTasksRepo(dbA, UID)
    const b = createTasksRepo(dbB, UID)
    const id = await a.create({
      projectId: 'inbox',
      title: 'Монтаж',
      kind: 'checklist',
      items: { i1: { title: 'Трасса', done: false, sortOrder: 1 } },
    })
    await serverTask(dbB, id)

    await disableNetwork(dbA)
    await disableNetwork(dbB)
    void a.setItem(id, 'i1', { title: 'Трасса', done: true, sortOrder: 1 })
    void b.setItem(id, 'i2', { title: 'Пусконаладка', done: false, sortOrder: 2 })
    await goOnline(dbA, dbB)

    const items = (await serverTask(dbA, id))?.items
    expect(items?.i1.done).toBe(true)
    expect(items?.i2.title).toBe('Пусконаладка')
  })
})

describe('удаление', () => {
  it('мягкое удаление не стирает запись и пропадает из списка живых задач', async () => {
    const a = createTasksRepo(dbA, UID)
    const id = await a.create({ projectId: 'inbox', title: 'Лишняя задача' })
    await a.softDelete(id)

    const onServer = await serverTask(dbB, id)
    expect(onServer).not.toBeNull()
    expect(onServer?.deletedAt).not.toBeNull()

    const alive = await new Promise<string[]>((resolveList) => {
      const stop = createTasksRepo(dbB, UID).subscribe((tasks) => {
        stop()
        resolveList(tasks.map((t) => t.id))
      })
    })
    expect(alive).not.toContain(id)
  })

  it('правка на втором устройстве не воскрешает удалённую задачу', async () => {
    const a = createTasksRepo(dbA, UID)
    const b = createTasksRepo(dbB, UID)
    const id = await a.create({ projectId: 'inbox', title: 'Исходное' })
    await serverTask(dbB, id)

    await disableNetwork(dbB)
    void b.update(id, { title: 'Правка пока шла' })
    await a.softDelete(id)
    await goOnline(dbB)

    const result = await serverTask(dbA, id)
    expect(result?.title).toBe('Правка пока шла')
    expect(result?.deletedAt).not.toBeNull()
  })

  it('восстановление возвращает задачу', async () => {
    const a = createTasksRepo(dbA, UID)
    const id = await a.create({ projectId: 'inbox', title: 'Вернуть' })
    await a.softDelete(id)
    await a.restore(id)
    expect((await serverTask(dbB, id))?.deletedAt).toBeNull()
  })
})

describe('выполнение, время правки, проекты', () => {
  it('отметка выполнения ставит статус и время', async () => {
    const a = createTasksRepo(dbA, UID)
    const id = await a.create({ projectId: 'inbox', title: 'Позвонить прорабу' })
    await a.complete(id, true)

    const t = await serverTask(dbB, id)
    expect(t?.status).toBe('done')
    expect(typeof t?.completedAt).toBe('number')

    await a.complete(id, false)
    const back = await serverTask(dbB, id)
    expect(back?.status).toBe('open')
    expect(back?.completedAt).toBeNull()
  })

  it('«не буду делать» и возврат в работу доходят до другого устройства, закрепление тоже', async () => {
    const a = createTasksRepo(dbA, UID)
    const id = await a.create({ projectId: 'inbox', title: 'Позвонить прорабу' })
    await a.setSkipped(id, true)
    const skipped = await serverTask(dbB, id)
    expect(skipped?.status).toBe('wontdo')
    expect(typeof skipped?.completedAt).toBe('number')

    await a.setSkipped(id, false)
    await a.update(id, { pinnedAt: 123 })
    const back = await serverTask(dbB, id)
    expect(back?.status).toBe('open')
    expect(back?.completedAt).toBeNull()
    expect(back?.pinnedAt).toBe(123)

    await a.update(id, { pinnedAt: null })
    expect((await serverTask(dbB, id))?.pinnedAt).toBeNull()
  })

  it('время правки ставит сервер и оно растёт', async () => {
    const a = createTasksRepo(dbA, UID)
    const id = await a.create({ projectId: 'inbox', title: 'Время' })
    const first = (await serverTask(dbB, id))?.updatedAt.toMillis()
    await a.update(id, { title: 'Время 2' })
    const second = (await serverTask(dbB, id))?.updatedAt.toMillis()
    expect(second).toBeGreaterThan(first)
  })

  it('Входящие с фиксированным id, созданные на двух устройствах, остаются одной записью', async () => {
    const pa = createProjectsRepo(dbA, UID)
    const pb = createProjectsRepo(dbB, UID)
    await disableNetwork(dbA)
    await disableNetwork(dbB)
    void pa.createInbox()
    void pb.createInbox()
    await goOnline(dbA, dbB)

    const list = await new Promise<string[]>((resolveList) => {
      const stop = createProjectsRepo(dbA, UID).subscribe((projects, { fromCache }) => {
        if (fromCache) return
        stop()
        resolveList(projects.map((p) => p.id))
      })
    })
    expect(list).toEqual(['inbox'])
  })

  it('карточка объекта правится по полям', async () => {
    const pa = createProjectsRepo(dbA, UID)
    const pb = createProjectsRepo(dbB, UID)
    const id = await pa.create({
      name: 'Ресторан на Свободы',
      site: { address: 'Свободы 5', contactName: '', contactPhone: '', budget: null, drawingsUrl: '', stage: 'measure' },
    })
    await new Promise<void>((r) => setTimeout(r, 200))

    await disableNetwork(dbA)
    await disableNetwork(dbB)
    void pa.setSiteField(id, 'stage', 'install')
    void pb.setSiteField(id, 'contactPhone', '+7 900 000-00-00')
    await goOnline(dbA, dbB)

    const snap = await getDocFromServer(doc(dbA, 'users', UID, 'projects', id))
    const site = snap.data()?.site
    expect(site.stage).toBe('install')
    expect(site.contactPhone).toBe('+7 900 000-00-00')
    expect(site.address).toBe('Свободы 5')
  })
})

describe('повторяющиеся задачи', () => {
  async function repeating(a: ReturnType<typeof createTasksRepo>, over: Record<string, unknown> = {}) {
    return a.create({ projectId: 'inbox', title: 'Проверка бригады', due: '2026-10-20', isAllDay: true, repeat: 'RRULE:FREQ=WEEKLY', ...over })
  }
  const load = async (db: Firestore, id: string) => {
    const snap = await getDocFromServer(doc(db, 'users', UID, 'tasks', id))
    return snap.data() as Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
  }

  it('выполнение сдвигает срок, задача остаётся открытой, в истории появляется выполненная копия', async () => {
    const a = createTasksRepo(dbA, UID)
    const id = await repeating(a)
    const current = await load(dbA, id)
    const next = nextOccurrence({ ...current, due: current.due } as never, { now: NOW, tz: MSK }, NOW)!
    await a.completeRepeating({ ...current, id } as never, next, NOW)

    const task = await load(dbB, id)
    expect(task.status).toBe('open')
    expect(task.due).toBe('2026-10-27')
    expect(task.repeat).toBe('RRULE:FREQ=WEEKLY')

    const copy = await load(dbB, `${id}~2026-10-20`)
    expect(copy.status).toBe('done')
    expect(copy.completedAt).toBe(NOW)
    expect(copy.due).toBe('2026-10-20')
    expect(copy.repeat).toBeNull()
  })

  it('пункты чек-листа сбрасываются на новый цикл', async () => {
    const a = createTasksRepo(dbA, UID)
    const id = await repeating(a, { kind: 'checklist', items: { i1: { title: 'Замеры', done: true, sortOrder: 1, completedAt: 5 }, i2: { title: 'Фото', done: true, sortOrder: 2 } } })
    const current = await load(dbA, id)
    const next = nextOccurrence(current as never, { now: NOW, tz: MSK }, NOW)!
    await a.completeRepeating({ ...current, id } as never, next, NOW)

    const items = (await load(dbB, id)).items
    expect(items.i1.done).toBe(false)
    expect(items.i1.completedAt).toBeUndefined()
    expect(items.i2.done).toBe(false)
    expect(items.i1.title).toBe('Замеры')
  })

  it('два устройства закрыли один цикл без сети: один сдвиг и одна копия в истории', async () => {
    const a = createTasksRepo(dbA, UID)
    const b = createTasksRepo(dbB, UID)
    const id = await repeating(a)
    const current = { ...(await load(dbA, id)), id }
    await serverTask(dbB, id)

    const next = nextOccurrence(current as never, { now: NOW, tz: MSK }, NOW)!
    await disableNetwork(dbA)
    await disableNetwork(dbB)
    void a.completeRepeating(current as never, next, NOW)
    void b.completeRepeating(current as never, next, NOW + 5000)
    await goOnline(dbA, dbB)

    expect((await load(dbA, id)).due).toBe('2026-10-27')
    const copies = await new Promise<number>((resolveCount) => {
      const stop = createTasksRepo(dbA, UID).subscribe((tasks, ) => {
        stop()
        resolveCount(tasks.filter((t) => t.title === 'Проверка бригады' && t.status === 'done').length)
      })
    })
    expect(copies).toBe(1)
  })
})

describe('теги, корзина, окончательное удаление', () => {
  const load = async (db: Firestore, id: string) => (await getDocFromServer(doc(db, 'users', UID, 'tasks', id))).data() as Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

  it('теги, добавленные на двух устройствах без сети, сохраняются оба', async () => {
    const a = createTasksRepo(dbA, UID)
    const b = createTasksRepo(dbB, UID)
    const id = await a.create({ projectId: 'inbox', title: 'Заказать воздуховод' })
    await serverTask(dbB, id)

    await disableNetwork(dbA)
    await disableNetwork(dbB)
    void a.addTag(id, 'поставщик')
    void b.addTag(id, 'срочно')
    await goOnline(dbA, dbB)

    expect(((await load(dbA, id)).tags as string[]).sort()).toEqual(['поставщик', 'срочно'])
  })

  it('удаление тега на одном устройстве не трогает теги другого', async () => {
    const a = createTasksRepo(dbA, UID)
    const id = await a.create({ projectId: 'inbox', title: 'Задача', tags: ['a', 'b'] })
    await a.removeTag(id, 'a')
    expect((await load(dbB, id)).tags).toEqual(['b'])
  })

  it('корзина показывает удалённые задачи и не показывает живые', async () => {
    const a = createTasksRepo(dbA, UID)
    const alive = await a.create({ projectId: 'inbox', title: 'Живая' })
    const gone = await a.create({ projectId: 'inbox', title: 'Удалённая' })
    await a.softDelete(gone)

    const trash = await new Promise<string[]>((resolveIds) => {
      const stop = createTasksRepo(dbB, UID).subscribeDeleted((tasks) => {
        stop()
        resolveIds(tasks.map((t) => t.id))
      })
    })
    expect(trash).toContain(gone)
    expect(trash).not.toContain(alive)
  })

  it('окончательное удаление стирает запись, восстановление возвращает задачу из корзины', async () => {
    const a = createTasksRepo(dbA, UID)
    const id = await a.create({ projectId: 'inbox', title: 'Навсегда' })
    const other = await a.create({ projectId: 'inbox', title: 'Вернуть' })
    await a.softDelete(id)
    await a.softDelete(other)
    await a.restore(other)
    await a.purge(id)

    expect(await serverTask(dbB, id)).toBeNull()
    expect((await load(dbB, other)).deletedAt).toBeNull()
  })

  it('пачка окончательного удаления', async () => {
    const a = createTasksRepo(dbA, UID)
    const ids = await Promise.all([1, 2, 3].map((n) => a.create({ projectId: 'inbox', title: `Старая ${n}` })))
    await a.purgeMany(ids)
    for (const id of ids) expect(await serverTask(dbB, id)).toBeNull()
  })

  it('пункт чек-листа отмечается по полям', async () => {
    const a = createTasksRepo(dbA, UID)
    const id = await a.create({ projectId: 'inbox', title: 'Взять в горы', kind: 'checklist', items: { i1: { title: 'Палатка', done: false, sortOrder: 1 } } })
    await a.setItem(id, 'i1', { title: 'Палатка', done: true, sortOrder: 1, completedAt: 123 })
    await a.removeItem(id, 'nope')
    const items = (await load(dbB, id)).items
    expect(items.i1.done).toBe(true)
    expect(items.i1.completedAt).toBe(123)
  })
})

describe('привычки и отметки', () => {
  const loadCheckin = async (db: Firestore, habitId: string, day: string) => {
    const snap = await getDocFromServer(doc(db, 'users', UID, 'habitCheckins', checkinId(habitId, day)))
    return snap.exists() ? (snap.data() as Record<string, any>) : null // eslint-disable-line @typescript-eslint/no-explicit-any
  }

  it('привычка создаётся, правится и уходит в архив', async () => {
    const a = createHabitsRepo(dbA, UID)
    const id = await a.create({ name: 'Зарядка', startDay: '2026-10-01' })
    await a.update(id, { name: 'Зарядка утром', reminders: ['07:00'] })
    await a.archive(id, true)

    const snap = (await getDocFromServer(doc(dbB, 'users', UID, 'habits', id))).data()!
    expect(snap.name).toBe('Зарядка утром')
    expect(snap.reminders).toEqual(['07:00'])
    expect(typeof snap.archivedAt).toBe('number')
    await a.archive(id, false)
    expect((await getDocFromServer(doc(dbB, 'users', UID, 'habits', id))).data()!.archivedAt).toBeNull()
  })

  it('удалённые привычки в подписку не попадают', async () => {
    const a = createHabitsRepo(dbA, UID)
    const live = await a.create({ name: 'Живая', startDay: '2026-10-01' })
    const gone = await a.create({ name: 'Удалённая', startDay: '2026-10-01' })
    await a.softDelete(gone)
    const ids = await new Promise<string[]>((resolveIds) => {
      const stop = createHabitsRepo(dbB, UID).subscribe((list) => {
        stop()
        resolveIds(list.map((h) => h.id))
      })
    })
    expect(ids).toContain(live)
    expect(ids).not.toContain(gone)
  })

  it('отметка с двух устройств за один день остаётся одной записью', async () => {
    const a = createCheckinsRepo(dbA, UID)
    const b = createCheckinsRepo(dbB, UID)
    await disableNetwork(dbA)
    await disableNetwork(dbB)
    void a.set('h1', '2026-10-20', 'done')
    void b.set('h1', '2026-10-20', 'done')
    await goOnline(dbA, dbB)

    const all = await new Promise<number>((resolveCount) => {
      const stop = createCheckinsRepo(dbA, UID).subscribe((list, ) => {
        stop()
        resolveCount(list.filter((c) => c.habitId === 'h1').length)
      })
    })
    expect(all).toBe(1)
    expect((await loadCheckin(dbA, 'h1', '2026-10-20'))?.status).toBe('done')
  })

  it('смена отметки и снятие', async () => {
    const a = createCheckinsRepo(dbA, UID)
    await a.set('h2', '2026-10-19', 'done')
    await a.set('h2', '2026-10-19', 'failed')
    expect((await loadCheckin(dbB, 'h2', '2026-10-19'))?.status).toBe('failed')
    await a.clear('h2', '2026-10-19')
    expect(await loadCheckin(dbB, 'h2', '2026-10-19')).toBeNull()
  })

  it('заметка не теряется при смене отметки', async () => {
    const a = createCheckinsRepo(dbA, UID)
    await a.set('h3', '2026-10-18', 'done')
    await a.setNote('h3', '2026-10-18', 'Пробежал 5 км')
    await a.set('h3', '2026-10-18', 'failed')
    const c = await loadCheckin(dbB, 'h3', '2026-10-18')
    expect(c?.note).toBe('Пробежал 5 км')
    expect(c?.status).toBe('failed')
  })

  it('разные привычки в один день не мешают друг другу', async () => {
    const a = createCheckinsRepo(dbA, UID)
    await a.set('h4', '2026-10-17', 'done')
    await a.set('h5', '2026-10-17', 'failed')
    expect((await loadCheckin(dbB, 'h4', '2026-10-17'))?.status).toBe('done')
    expect((await loadCheckin(dbB, 'h5', '2026-10-17'))?.status).toBe('failed')
  })
})


describe('папки списков', () => {
  it('папка и привязка списка видны на другом устройстве, свёрнутость тоже', async () => {
    const groups = createProjectGroupsRepo(dbA, UID)
    const projects = createProjectsRepo(dbA, UID)
    const gid = await groups.create({ name: 'Финансы', sortOrder: 2 })
    const pid = await projects.create({ name: 'Квартира', groupId: gid })
    await groups.update(gid, { collapsed: true })

    const g = (await getDocFromServer(doc(dbB, 'users', UID, 'projectGroups', gid))).data()
    expect(g).toMatchObject({ name: 'Финансы', sortOrder: 2, collapsed: true, deletedAt: null })
    const p = (await getDocFromServer(doc(dbB, 'users', UID, 'projects', pid))).data()
    expect(p?.groupId).toBe(gid)
  })

  it('переименование на одном устройстве и сворачивание на другом не мешают друг другу', async () => {
    const a = createProjectGroupsRepo(dbA, UID)
    const b = createProjectGroupsRepo(dbB, UID)
    const gid = await a.create({ name: 'Сферы' })
    await getDocFromServer(doc(dbB, 'users', UID, 'projectGroups', gid))
    await disableNetwork(dbA)
    await disableNetwork(dbB)
    void a.update(gid, { name: 'Сферы жизни' })
    void b.update(gid, { collapsed: true })
    await goOnline(dbA, dbB)
    const g = (await getDocFromServer(doc(dbA, 'users', UID, 'projectGroups', gid))).data()
    expect(g).toMatchObject({ name: 'Сферы жизни', collapsed: true })
  })

  it('удалённая папка в подписку не попадает', async () => {
    const groups = createProjectGroupsRepo(dbA, UID)
    const keep = await groups.create({ name: 'Остаётся' })
    const gone = await groups.create({ name: 'Уходит' })
    await groups.softDelete(gone)
    const seen = await new Promise<string[]>((resolve, reject) => {
      const stop = groups.subscribe((list) => {
        stop()
        resolve(list.map((g) => g.id))
      }, reject)
    })
    expect(seen).toContain(keep)
    expect(seen).not.toContain(gone)
  })
})

describe('колонки канбана', () => {
  it('колонка и положение задачи в ней видны на другом устройстве', async () => {
    const columns = createColumnsRepo(dbA, UID)
    const tasks = createTasksRepo(dbA, UID)
    const cid = await columns.create({ projectId: 'p1', name: 'В работе', sortOrder: 2048 })
    const tid = await tasks.create({ projectId: 'p1', title: 'Смонтировать воздуховод' })
    await tasks.update(tid, { columnId: cid, sortOrder: 512 })

    const c = (await getDocFromServer(doc(dbB, 'users', UID, 'columns', cid))).data()
    expect(c).toMatchObject({ projectId: 'p1', name: 'В работе', sortOrder: 2048, deletedAt: null })
    const t = (await getDocFromServer(doc(dbB, 'users', UID, 'tasks', tid))).data()
    expect(t).toMatchObject({ columnId: cid, sortOrder: 512 })
  })

  it('перенос карточки на одном устройстве и правка названия на другом не мешают друг другу', async () => {
    const a = createTasksRepo(dbA, UID)
    const b = createTasksRepo(dbB, UID)
    const tid = await a.create({ projectId: 'p1', title: 'Заказать вентилятор' })
    await getDocFromServer(doc(dbB, 'users', UID, 'tasks', tid))
    await disableNetwork(dbA)
    await disableNetwork(dbB)
    void a.update(tid, { columnId: 'c2', sortOrder: 100 })
    void b.update(tid, { title: 'Заказать вентилятор канальный' })
    await goOnline(dbA, dbB)
    const t = (await getDocFromServer(doc(dbA, 'users', UID, 'tasks', tid))).data()
    expect(t).toMatchObject({ columnId: 'c2', sortOrder: 100, title: 'Заказать вентилятор канальный' })
  })

  it('удалённая колонка в подписку не попадает', async () => {
    const columns = createColumnsRepo(dbA, UID)
    const keep = await columns.create({ projectId: 'p1', name: 'Остаётся' })
    const gone = await columns.create({ projectId: 'p1', name: 'Уходит' })
    await columns.softDelete(gone)
    const seen = await new Promise<string[]>((resolve, reject) => {
      const stop = columns.subscribe((list) => {
        stop()
        resolve(list.map((c) => c.id))
      }, reject)
    })
    expect(seen).toContain(keep)
    expect(seen).not.toContain(gone)
  })
})

describe('обратный отсчёт', () => {
  it('событие видно на другом устройстве, правка и удаление доходят', async () => {
    const a = createCountdownsRepo(dbA, UID)
    const id = await a.create({ name: 'Сдача объекта', date: '2026-12-01' })
    const first = (await getDocFromServer(doc(dbB, 'users', UID, 'countdowns', id))).data()
    expect(first).toMatchObject({ name: 'Сдача объекта', date: '2026-12-01', deletedAt: null })

    await a.update(id, { date: '2026-12-15' })
    expect((await getDocFromServer(doc(dbB, 'users', UID, 'countdowns', id))).data()).toMatchObject({ name: 'Сдача объекта', date: '2026-12-15' })

    await a.softDelete(id)
    const gone = (await getDocFromServer(doc(dbB, 'users', UID, 'countdowns', id))).data()
    expect(gone?.deletedAt).not.toBeNull()
  })

  it('смена названия на одном устройстве и даты на другом не мешают друг другу', async () => {
    const a = createCountdownsRepo(dbA, UID)
    const b = createCountdownsRepo(dbB, UID)
    const id = await a.create({ name: 'Поставка', date: '2026-11-10' })
    await getDocFromServer(doc(dbB, 'users', UID, 'countdowns', id))
    await disableNetwork(dbA)
    await disableNetwork(dbB)
    void a.update(id, { name: 'Поставка вентиляторов' })
    void b.update(id, { date: '2026-11-20' })
    await goOnline(dbA, dbB)
    expect((await getDocFromServer(doc(dbA, 'users', UID, 'countdowns', id))).data()).toMatchObject({ name: 'Поставка вентиляторов', date: '2026-11-20' })
  })
})

describe('история изменений', () => {
  /** Подписка нужна репозиторию, чтобы знать, что было до правки. Ждём первый снимок задач */
  async function watched(db: Firestore) {
    const repo = createTasksRepo(db, UID)
    await new Promise<void>((resolve, reject) => repo.subscribe(() => resolve(), reject))
    return repo
  }
  const entries = (id: string, repo: ReturnType<typeof createTasksRepo>) =>
    new Promise<Array<{ id: string; changes: Record<string, { from: unknown; to: unknown }> }>>((resolve) => {
      const stop = repo.subscribeHistory(id, (list) => (stop(), resolve(list)))
    })

  it('правка пишется в историю с тем, что было и что стало, и видна на другом устройстве', async () => {
    const a = createTasksRepo(dbA, UID)
    const id = await a.create({ projectId: 'inbox', title: 'Позвонить' })
    const repoA = await watched(dbA)
    await repoA.update(id, { title: 'Позвонить поставщику', priority: 5 })

    const repoB = createTasksRepo(dbB, UID)
    const list = await entries(id, repoB)
    expect(list).toHaveLength(1)
    expect(list[0].changes.title).toEqual({ from: 'Позвонить', to: 'Позвонить поставщику' })
    expect(list[0].changes.priority).toEqual({ from: 0, to: 5 })
  })

  it('правки подряд склеиваются в одну запись, возврат к прежнему убирает её', async () => {
    const a = createTasksRepo(dbA, UID)
    const id = await a.create({ projectId: 'inbox', title: 'А' })
    const repo = await watched(dbA)
    await repo.update(id, { title: 'Аб' })
    await repo.update(id, { title: 'Абв' })
    const one = await entries(id, repo)
    expect(one).toHaveLength(1)
    expect(one[0].changes.title).toEqual({ from: 'А', to: 'Абв' })

    await repo.update(id, { title: 'А' })
    expect(await entries(id, repo)).toHaveLength(0)
  })

  it('откат возвращает прежнее значение, а правка без перемен в историю не идёт', async () => {
    const a = createTasksRepo(dbA, UID)
    const id = await a.create({ projectId: 'inbox', title: 'Исходное' })
    const repo = await watched(dbA)
    await repo.update(id, { title: 'Исходное' })
    expect(await entries(id, repo)).toHaveLength(0)

    await repo.update(id, { due: '2026-10-25', isAllDay: true })
    const [entry] = await entries(id, repo)
    expect(entry.changes.due).toEqual({ from: null, to: '2026-10-25' })
    await repo.update(id, rollbackPatch(entry.changes as never) as never)
    expect((await serverTask(dbB, id))?.due).toBeNull()
  })

  it('выполнение попадает в историю, а окончательное удаление задачи чистит её историю', async () => {
    const a = createTasksRepo(dbA, UID)
    const id = await a.create({ projectId: 'inbox', title: 'Сделать' })
    const repo = await watched(dbA)
    await repo.complete(id, true)
    const [entry] = await entries(id, repo)
    expect(entry.changes.status).toEqual({ from: 'open', to: 'done' })

    await repo.softDelete(id)
    await repo.purge(id)
    expect(await entries(id, repo)).toHaveLength(0)
  })
})

describe('файлы к задачам', () => {
  const bytesOf = (n: number) => new Uint8Array(n).map((_, i) => (i * 31 + 7) % 256)
  const filesOf = (repo: ReturnType<typeof createFilesRepo>, taskId: string) =>
    new Promise<Array<{ id: string; name: string; size: number; chunks: number }>>((resolve) => {
      const stop = repo.subscribe(taskId, (list) => (stop(), resolve(list)))
    })

  it('файл в несколько кусков целиком читается на другом устройстве', async () => {
    const a = createFilesRepo(dbA, UID)
    const bytes = bytesOf(1_500_000)
    const id = await a.add('t1', 'смета.pdf', 'application/pdf', bytes)

    const b = createFilesRepo(dbB, UID)
    const [meta] = await filesOf(b, 't1')
    expect(meta).toMatchObject({ id, name: 'смета.pdf', size: 1_500_000 })
    expect(meta.chunks).toBeGreaterThan(2)
    const blob = await b.read({ id, type: 'application/pdf' })
    expect(blob.size).toBe(1_500_000)
    expect(Array.from(new Uint8Array(await blob.arrayBuffer()))).toEqual(Array.from(bytes))
  })

  it('больше 5 МБ не принимается, удаление стирает файл и все его куски', async () => {
    const a = createFilesRepo(dbA, UID)
    await expect(a.add('t1', 'огромный.bin', 'application/octet-stream', bytesOf(5 * 1024 * 1024 + 1))).rejects.toThrow('5 МБ')

    const id = await a.add('t1', 'фото.jpg', 'image/jpeg', bytesOf(900_000))
    const [meta] = await filesOf(a, 't1')
    await a.remove(meta)
    expect(await filesOf(a, 't1')).toHaveLength(0)
    const left = await getDocFromServer(doc(dbB, 'users', UID, 'taskFileChunks', `${id}~0`)).then((d) => d.exists())
    expect(left).toBe(false)
  })

  it('окончательное удаление задачи уносит и её файлы', async () => {
    const tasks = createTasksRepo(dbA, UID)
    const files = createFilesRepo(dbA, UID)
    const taskId = await tasks.create({ projectId: 'inbox', title: 'С вложением' })
    await files.add(taskId, 'план.png', 'image/png', bytesOf(10_000))
    expect(await filesOf(files, taskId)).toHaveLength(1)
    await tasks.softDelete(taskId)
    await tasks.purge(taskId)
    expect(await filesOf(files, taskId)).toHaveLength(0)
  })
})
