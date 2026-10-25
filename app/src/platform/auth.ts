import { Capacitor } from '@capacitor/core'
import { FirebaseAuthentication } from '@capacitor-firebase/authentication'
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth'
import { auth } from '../data/firebase'

export type { User }

export function watchUser(cb: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, cb)
}

/**
 * Google не пускает ко входу из встроенных окон приложений.
 * В APK вход идёт через нативное окно Android, в браузере через всплывающее окно.
 * Состояние входа во всех случаях держит веб-библиотека Firebase, поэтому остальной код один
 */
export async function signInWithGoogle(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const { credential } = await FirebaseAuthentication.signInWithGoogle()
    if (!credential?.idToken) throw new Error('Google не вернул токен входа')
    await signInWithCredential(auth, GoogleAuthProvider.credential(credential.idToken))
    return
  }
  await signInWithPopup(auth, new GoogleAuthProvider())
}

/** Вход и регистрация по почте и паролю. Идёт через веб-библиотеку, поэтому одинаково в браузере и в APK */
export async function signInWithEmail(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email.trim(), password)
}

/** Письмо со ссылкой для нового пароля. Firebase отправляет его бесплатно */
export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim())
}

export async function registerWithEmail(email: string, password: string): Promise<void> {
  await createUserWithEmailAndPassword(auth, email.trim(), password)
}

/** Понятное сообщение вместо кода ошибки Firebase */
export function authErrorText(e: unknown): string {
  const code = (e as { code?: string }).code ?? ''
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Неверная почта или пароль'
    case 'auth/email-already-in-use':
      return 'Эта почта уже зарегистрирована, нажмите «Войти»'
    case 'auth/weak-password':
      return 'Пароль короче 6 символов'
    case 'auth/invalid-email':
      return 'Почта написана с ошибкой'
    case 'auth/too-many-requests':
      return 'Слишком много попыток, подождите несколько минут'
    case 'auth/network-request-failed':
      return 'Нет связи с сервером'
    case 'auth/operation-not-allowed':
      return 'Вход по почте выключен в настройках проекта'
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return ''
    default: {
      const text = (e as Error).message || ''
      // Нативное окно Google закрыто или не получило разрешения проекта
      if (/cancel/i.test(text)) return 'Вход через Google не завершён. Попробуйте ещё раз или войдите по почте'
      return text || 'Не получилось войти'
    }
  }
}

export async function signOut(): Promise<void> {
  if (Capacitor.isNativePlatform()) await FirebaseAuthentication.signOut()
  await fbSignOut(auth)
}
