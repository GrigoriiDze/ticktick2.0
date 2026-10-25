import { useEffect, useRef, useState } from 'react'

/** Сколько длится уход окна с экрана. Совпадает с --t-exit в стилях */
export const EXIT_MS = 200

/**
 * Окно, шторка или меню исчезают плавно, а не пропадают. Пока value не пустое, окно показывается как есть.
 * Когда оно стало пустым, ещё EXIT_MS держим последнее значение и сообщаем leaving: окно играет уход и только потом убирается
 */
export function useExit<T>(value: T | null | false | undefined, ms = EXIT_MS): { value: T | null; leaving: boolean } {
  const last = useRef<T | null>(null)
  const [done, setDone] = useState(true)
  if (value) last.current = value
  useEffect(() => {
    if (value) {
      setDone(false)
      return
    }
    const id = window.setTimeout(() => setDone(true), ms)
    return () => window.clearTimeout(id)
  }, [value, ms])
  const shown = value ? value : !done ? last.current : null
  return { value: shown, leaving: !value && shown !== null }
}
