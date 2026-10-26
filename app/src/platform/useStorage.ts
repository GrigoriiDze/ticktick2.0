import { useEffect, useState, useCallback } from 'react'
import { StorageService, type StorageKey } from './storage'

/**
 * Хук для реактивного чтения и записи ключа в LocalStorage.
 * Автоматически подписывается на изменения значения из других компонентов.
 */
export function useStorage<T>(key: StorageKey, fallback: T): [T, (val: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => StorageService.get<T>(key, fallback))

  useEffect(() => {
    // Подписка на обновления от других компонентов
    const unsubscribe = StorageService.subscribe(key, (nextVal) => {
      setState(nextVal !== null ? (nextVal as T) : fallback)
    })
    return unsubscribe
  }, [key, fallback])

  const setValue = useCallback(
    (action: T | ((prev: T) => T)) => {
      setState((prev) => {
        const next = typeof action === 'function' ? (action as (prev: T) => T)(prev) : action
        StorageService.set(key, next)
        return next
      })
    },
    [key],
  )

  return [state, setValue]
}

/**
 * Хук для булевых значений с приведением '1' / '0'.
 */
export function useStorageBool(key: StorageKey, fallback: boolean): [boolean, (val: boolean | ((prev: boolean) => boolean)) => void] {
  const [state, setState] = useState<boolean>(() => StorageService.getBool(key, fallback))

  useEffect(() => {
    const unsubscribe = StorageService.subscribe(key, (nextVal) => {
      setState(typeof nextVal === 'boolean' ? nextVal : StorageService.getBool(key, fallback))
    })
    return unsubscribe
  }, [key, fallback])

  const setValue = useCallback(
    (action: boolean | ((prev: boolean) => boolean)) => {
      setState((prev) => {
        const next = typeof action === 'function' ? (action as (prev: boolean) => boolean)(prev) : action
        StorageService.setBool(key, next)
        return next
      })
    },
    [key],
  )

  return [state, setValue]
}

