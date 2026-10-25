import type { Stamp } from './types'

/** Файл, прикреплённый к задаче (сам файл лежит кусками в отдельной коллекции) */
export interface TaskFile {
  id: string
  taskId: string
  name: string
  type: string
  size: number
  chunks: number
  createdAt: Stamp
}

/** Файлы к задачам лежат в той же базе Firestore, нарезанные на куски (платное хранилище Firebase Storage не нужно) */

/** Больше файл не принимаем: это 8 кусков, дальше база начинает заметно тормозить и тратить бесплатные чтения */
export const MAX_FILE_BYTES = 5 * 1024 * 1024
/** Символов base64 в одном куске. Кратно 4, чтобы куски декодировались по отдельности. Документ Firestore до 1 МиБ */
export const CHUNK_CHARS = 700_000

export function bytesToBase64(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i += 0x8000) out += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(out)
}

export function base64ToBytes(text: string): Uint8Array {
  const bin = atob(text)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export function splitChunks(base64: string, size = CHUNK_CHARS): string[] {
  const out: string[] = []
  for (let i = 0; i < base64.length; i += size) out.push(base64.slice(i, i + size))
  return out.length ? out : ['']
}

/** Склеивает куски обратно в байты */
export function joinChunks(chunks: string[]): Uint8Array {
  const parts = chunks.map(base64ToBytes)
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let at = 0
  for (const p of parts) {
    out.set(p, at)
    at += p.length
  }
  return out
}

/** «340 КБ», «2,4 МБ» */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} КБ`
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} МБ`
}

export function isImage(type: string): boolean {
  return /^image\/(jpeg|png|webp|gif|avif)$/i.test(type)
}

/** Идентификатор куска: по нему кусок находится без запроса и не дублируется при повторной записи */
export const chunkId = (fileId: string, index: number) => `${fileId}~${index}`
