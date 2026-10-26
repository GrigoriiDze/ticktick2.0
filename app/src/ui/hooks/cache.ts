import { StorageService } from '../../platform/storage'

export function readWsCache<T>(uid: string, key: string): T | null {
  return StorageService.get<T | null>(`tt_ws_${uid}_${key}`, null)
}

export function writeWsCache<T>(uid: string, key: string, val: T): void {
  StorageService.set(`tt_ws_${uid}_${key}`, val)
}

