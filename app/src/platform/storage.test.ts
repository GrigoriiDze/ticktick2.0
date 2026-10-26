import { beforeEach, describe, expect, it, vi } from 'vitest'
import { StorageService } from './storage'

describe('StorageService', () => {
  beforeEach(() => {
    StorageService.clear()
  })

  it('reads and writes typed JSON objects', () => {
    interface Sample {
      id: string
      count: number
    }
    const fallback: Sample = { id: 'default', count: 0 }
    expect(StorageService.get('test_key', fallback)).toEqual(fallback)

    const updated: Sample = { id: 'item_1', count: 42 }
    StorageService.set('test_key', updated)
    expect(StorageService.get('test_key', fallback)).toEqual(updated)
  })

  it('reads and writes boolean flags', () => {
    expect(StorageService.getBool('flag_key', false)).toBe(false)
    StorageService.setBool('flag_key', true)
    expect(StorageService.getBool('flag_key', false)).toBe(true)

    StorageService.setBool('flag_key', false)
    expect(StorageService.getBool('flag_key', true)).toBe(false)
  })

  it('notifies subscribers on change', () => {
    const listener = vi.fn()
    const unsubscribe = StorageService.subscribe('sub_key', listener)

    StorageService.set('sub_key', { status: 'ok' })
    expect(listener).toHaveBeenCalledWith({ status: 'ok' })

    unsubscribe()
    StorageService.set('sub_key', { status: 'changed' })
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('safely handles corrupted JSON and falls back', () => {
    StorageService.setString('corrupted', 'invalid json {[')
    expect(StorageService.get('corrupted', { ok: false })).toEqual({ ok: false })
  })
})

