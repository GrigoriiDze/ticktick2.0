import { useEffect, useState } from 'react'
import type { DateCtx } from '../domain/dates'

/** Текущий момент, обновляется раз в минуту: подписи «просрочено» и списки «Сегодня» меняются сами */
export function useDateCtx(): DateCtx {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000)
    const onVisible = () => document.visibilityState === 'visible' && setNow(Date.now())
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])
  return { now, tz: Intl.DateTimeFormat().resolvedOptions().timeZone }
}
