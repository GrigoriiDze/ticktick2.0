import { Capacitor } from '@capacitor/core'
import { Share } from '@capacitor/share'

/** Можно ли поделиться: на телефоне через системное окно, в браузере через navigator.share, если он есть */
export function canShare(): boolean {
  return Capacitor.isNativePlatform() || (typeof navigator !== 'undefined' && typeof navigator.share === 'function')
}

/** Открывает системное окно «Поделиться». Отмену пользователем не считаем ошибкой */
export async function shareText(title: string, text: string): Promise<void> {
  try {
    if (Capacitor.isNativePlatform()) await Share.share({ title, text, dialogTitle: 'Поделиться задачей' })
    else await navigator.share({ title, text })
  } catch (e) {
    if (e instanceof Error && /cancel|abort/i.test(`${e.name} ${e.message}`)) return
    throw e
  }
}
