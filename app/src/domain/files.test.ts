import { describe, expect, it } from 'vitest'
import { base64ToBytes, bytesToBase64, CHUNK_CHARS, chunkId, formatSize, isImage, joinChunks, splitChunks } from './files'

describe('файлы к задачам', () => {
  it('байты проходят через base64 и обратно без потерь, в том числе большие', () => {
    const bytes = new Uint8Array(300_000).map((_, i) => (i * 7) % 256)
    expect(Array.from(base64ToBytes(bytesToBase64(bytes)))).toEqual(Array.from(bytes))
  })

  it('большой файл режется на куски и собирается обратно', () => {
    const bytes = new Uint8Array(2_000_000).map((_, i) => (i * 13) % 251)
    const chunks = splitChunks(bytesToBase64(bytes))
    expect(chunks.length).toBeGreaterThan(3)
    expect(chunks.slice(0, -1).every((c) => c.length === CHUNK_CHARS)).toBe(true)
    expect(joinChunks(chunks).length).toBe(bytes.length)
    expect(joinChunks(chunks)[1_999_999]).toBe(bytes[1_999_999])
  })

  it('пустой файл не ломает нарезку', () => {
    expect(splitChunks('')).toEqual([''])
    expect(joinChunks([''])).toHaveLength(0)
  })

  it('размер по-русски, картинки и номера кусков', () => {
    expect(formatSize(500)).toBe('500 Б')
    expect(formatSize(340 * 1024)).toBe('340 КБ')
    expect(formatSize(2.4 * 1024 * 1024)).toBe('2,4 МБ')
    expect(isImage('image/jpeg')).toBe(true)
    expect(isImage('application/pdf')).toBe(false)
    expect(chunkId('abc', 3)).toBe('abc~3')
  })
})
