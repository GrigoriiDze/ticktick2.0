import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'

/**
 * Обновление приложения без магазина. Рядом с APK на бесплатном хостинге лежит файл version.json:
 * { "versionCode": 3, "versionName": "1.2", "apk": "https://…/zadachi.apk", "notes": "что нового" }.
 * Приложение сравнивает номер сборки со своим, и если на сервере новее, предлагает скачать
 */
export const UPDATE_URL = (import.meta.env.VITE_UPDATE_URL as string | undefined) ?? 'https://ticktick-47613.web.app/update/version.json'

export interface UpdateInfo {
  versionCode: number
  versionName: string
  apk: string
  notes: string
}

export interface CurrentVersion {
  versionCode: number
  versionName: string
}

/** Новее ли версия на сервере. Сравниваем номер сборки, а не название */
export function isNewer(remote: Pick<UpdateInfo, 'versionCode'>, current: Pick<CurrentVersion, 'versionCode'>): boolean {
  return Number.isFinite(remote.versionCode) && remote.versionCode > current.versionCode
}

/** Разбирает ответ сервера. Мусор и недостающие поля дают null, а не сломанную кнопку */
export function parseUpdate(raw: unknown): UpdateInfo | null {
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Record<string, unknown>
  const code = Number(r.versionCode)
  if (!Number.isInteger(code) || typeof r.apk !== 'string' || !/^https:\/\//.test(r.apk)) return null
  return { versionCode: code, versionName: typeof r.versionName === 'string' ? r.versionName : String(code), apk: r.apk, notes: typeof r.notes === 'string' ? r.notes : '' }
}

/** Версия установленного приложения. В браузере её нет */
export async function currentVersion(): Promise<CurrentVersion | null> {
  if (!Capacitor.isNativePlatform()) return null
  const info = await App.getInfo()
  return { versionCode: Number(info.build), versionName: info.version }
}

/** Есть ли обновление: null, если установлена последняя версия, ошибка, если сервер недоступен */
export async function checkForUpdate(fetcher: typeof fetch = fetch): Promise<{ current: CurrentVersion; update: UpdateInfo | null }> {
  const current = await currentVersion()
  if (!current) throw new Error('Обновления работают в приложении на телефоне')
  const res = await fetcher(`${UPDATE_URL}?t=${Date.now()}`, { cache: 'no-store' })
  if (!res.ok) throw new Error('Сервер обновлений не отвечает')
  const update = parseUpdate(await res.json())
  return { current, update: update && isNewer(update, current) ? update : null }
}
