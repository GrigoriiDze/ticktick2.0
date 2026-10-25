import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'

// Ключ веб-приложения Firebase публичный по замыслу. Защиту дают правила базы и вход
const config = {
  apiKey: 'AIzaSyA_TbrL3kAd292kSiqe3vBXZX6ALMlEaZY',
  authDomain: 'ticktick-47613.firebaseapp.com',
  projectId: 'ticktick-47613',
  storageBucket: 'ticktick-47613.firebasestorage.app',
  messagingSenderId: '876314461466',
  appId: '1:876314461466:web:2696e818c3085404f058a3',
}

const app = initializeApp(config)

export const auth = getAuth(app)

// Полная копия данных хранится на устройстве, приложение работает без сети
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
})

if (import.meta.env.VITE_USE_EMULATOR === '1') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
}
