import { useEffect, useState } from 'react'

/** С какой ширины окна включается раскладка для компьютера: полоса значков, боковое меню, список и карточка справа */
export const WIDE_QUERY = '(min-width: 900px)'

export function useWide(): boolean {
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.matchMedia(WIDE_QUERY).matches)
  useEffect(() => {
    const mq = window.matchMedia(WIDE_QUERY)
    const on = () => setWide(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return wide
}
