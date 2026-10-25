import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing'
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'

let env

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-ticktick',
    firestore: {
      rules: readFileSync(resolve(import.meta.dirname, '../../firestore.rules'), 'utf8'),
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
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'users/alice/tasks/t1'), { title: 'Замер, Свободы 5' })
  })
})

describe('чтение и запись своих данных', () => {
  it('владелец читает свою задачу', async () => {
    const db = env.authenticatedContext('alice').firestore()
    await assertSucceeds(getDoc(doc(db, 'users/alice/tasks/t1')))
  })

  it('владелец создаёт, правит и удаляет свою задачу', async () => {
    const db = env.authenticatedContext('alice').firestore()
    await assertSucceeds(setDoc(doc(db, 'users/alice/tasks/t2'), { title: 'Счёт на приточку' }))
    await assertSucceeds(updateDoc(doc(db, 'users/alice/tasks/t2'), { title: 'Счёт оплачен' }))
    await assertSucceeds(deleteDoc(doc(db, 'users/alice/tasks/t2')))
  })

  it('владелец пишет в глубокие подколлекции', async () => {
    const db = env.authenticatedContext('alice').firestore()
    await assertSucceeds(setDoc(doc(db, 'users/alice/projects/p1/columns/c1'), { name: 'Замер' }))
  })
})

describe('чужие данные', () => {
  it('другой пользователь не читает чужую задачу', async () => {
    const db = env.authenticatedContext('bob').firestore()
    await assertFails(getDoc(doc(db, 'users/alice/tasks/t1')))
  })

  it('другой пользователь не пишет в чужую ветку', async () => {
    const db = env.authenticatedContext('bob').firestore()
    await assertFails(setDoc(doc(db, 'users/alice/tasks/t3'), { title: 'Подмена' }))
    await assertFails(updateDoc(doc(db, 'users/alice/tasks/t1'), { title: 'Подмена' }))
    await assertFails(deleteDoc(doc(db, 'users/alice/tasks/t1')))
  })
})

describe('без входа', () => {
  it('аноним не читает и не пишет', async () => {
    const db = env.unauthenticatedContext().firestore()
    await assertFails(getDoc(doc(db, 'users/alice/tasks/t1')))
    await assertFails(setDoc(doc(db, 'users/alice/tasks/t4'), { title: 'Аноним' }))
  })
})

describe('всё вне users закрыто', () => {
  it('даже вошедший пользователь не пишет в чужие коллекции', async () => {
    const db = env.authenticatedContext('alice').firestore()
    await assertFails(setDoc(doc(db, 'public/x'), { a: 1 }))
    await assertFails(getDoc(doc(db, 'public/x')))
  })

  it('нельзя писать прямо в документ users/{uid} другого пользователя', async () => {
    const db = env.authenticatedContext('bob').firestore()
    await assertFails(setDoc(doc(db, 'users/alice'), { name: 'x' }))
  })
})
