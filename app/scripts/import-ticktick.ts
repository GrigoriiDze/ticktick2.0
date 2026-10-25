// Импорт из базы десктопного TickTick в Firestore.
// По умолчанию пишет в локальный эмулятор (127.0.0.1:8080 и 9099), в облако только с флагом --real
//
// Запуск из папки app:
//   npx tsx scripts/import-ticktick.ts <TickTick.db> --email a@b.c --password ...            (эмулятор)
//   npx tsx scripts/import-ticktick.ts <TickTick.db> --email a@b.c --password ... --real     (настоящий проект)
import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { connectFirestoreEmulator, initializeFirestore } from 'firebase/firestore'
import { writeImport } from '../src/import/write'
import { buildImport } from './build-import'
import { readDesktopDb } from './ticktick-db'

const args = process.argv.slice(2)
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : undefined
}
const path = args[0]
const email = flag('email')
const password = flag('password')
const real = args.includes('--real')
if (!path || !email || !password) {
  console.error('Нужны путь к TickTick.db, --email и --password')
  process.exit(1)
}

const app = initializeApp({
  apiKey: 'AIzaSyA_TbrL3kAd292kSiqe3vBXZX6ALMlEaZY',
  authDomain: 'ticktick-47613.firebaseapp.com',
  // Тот же идентификатор, что в приложении: эмулятор хранит данные раздельно по проектам
  projectId: 'ticktick-47613',
})
const auth = getAuth(app)
const db = initializeFirestore(app, {})
if (!real) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
}

const bundle = buildImport(readDesktopDb(path))
const { groups, columns, projects, tasks, habits, checkins } = bundle

async function main() {
  let user
  try {
    user = (await signInWithEmailAndPassword(auth, email, password)).user
  } catch {
    if (real) throw new Error('Вход не удался. В настоящий проект импортируем только в существующий аккаунт')
    user = (await createUserWithEmailAndPassword(auth, email, password)).user
  }

  console.log(real ? 'ЦЕЛЬ: настоящий проект Firebase' : 'ЦЕЛЬ: локальный эмулятор', '| пользователь', user.uid)
  const t0 = Date.now()
  const result = await writeImport(db, user.uid, projects, tasks, habits, checkins, (done, total) => process.stdout.write(`\rзаписано ${done} из ${total}`), groups, columns)
  console.log(`\nГотово за ${((Date.now() - t0) / 1000).toFixed(1)} с`, JSON.stringify(result))
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e)
    process.exit(1)
  },
)
