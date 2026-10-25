import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { bytesToBase64, isImage, MAX_FILE_BYTES } from '../domain/files'

/** Фото больше этого размера уменьшаем перед сохранением: снимок с телефона весит 3–6 МБ, а нужен он для просмотра */
const SHRINK_OVER = 600 * 1024
const MAX_SIDE = 1800

export interface Upload {
  name: string
  type: string
  bytes: Uint8Array
}

/** Готовит файл к сохранению: большие фото уменьшает до 1800 пикселей и пересохраняет в JPEG. Слишком большой файл: ошибка словами */
export async function prepareUpload(file: File): Promise<Upload> {
  let blob: Blob = file
  let name = file.name || 'файл'
  let type = file.type || 'application/octet-stream'
  if (isImage(type) && type !== 'image/gif' && file.size > SHRINK_OVER) {
    try {
      const bmp = await createImageBitmap(file)
      const k = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(bmp.width * k)
      canvas.height = Math.round(bmp.height * k)
      const g = canvas.getContext('2d')!
      g.fillStyle = '#fff'
      g.fillRect(0, 0, canvas.width, canvas.height)
      g.drawImage(bmp, 0, 0, canvas.width, canvas.height)
      const jpeg = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82))
      if (jpeg && jpeg.size < file.size) {
        blob = jpeg
        type = 'image/jpeg'
        name = name.replace(/\.[^.]+$/, '') + '.jpg'
      }
    } catch {
      // не получилось уменьшить: сохраняем как есть, если влезет
    }
  }
  if (blob.size > MAX_FILE_BYTES) throw new Error(`«${name}» больше 5 МБ, такой файл не сохранить`)
  return { name, type, bytes: new Uint8Array(await blob.arrayBuffer()) }
}

/** Открывает файл. На телефоне через системное окно «Открыть в приложении», на компьютере в новой вкладке или скачиванием */
export async function openFile(blob: Blob, name: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const safe = name.replace(/[^\p{L}\p{N}._ -]/gu, '_')
    const bytes = new Uint8Array(await blob.arrayBuffer())
    const saved = await Filesystem.writeFile({ path: safe, data: bytesToBase64(bytes), directory: Directory.Cache })
    try {
      await Share.share({ title: name, url: saved.uri, dialogTitle: 'Открыть файл' })
    } catch (e) {
      if (e instanceof Error && /cancel|abort/i.test(`${e.name} ${e.message}`)) return
      throw e
    }
    return
  }
  const url = URL.createObjectURL(blob)
  if (blob.type.startsWith('image/') || blob.type === 'application/pdf') window.open(url, '_blank')
  else {
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
