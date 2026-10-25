import { formatDay, today, type DateCtx } from './dates'
import type { Task, Waiting } from './types'

/**
 * Метка «ждём»: на что задача упёрлась. Монтаж вентиляции постоянно встаёт из-за неоплаченного счёта,
 * задержки поставки установок или несогласованных дополнительных работ, поэтому все такие задачи
 * собираются в один список «Зависло», а просроченные по сроку ожидания идут первыми
 */
export const WAITING_KINDS: Array<{ id: Waiting['kind']; title: string; what: string }> = [
  { id: 'payment', title: 'Оплату', what: 'оплату' },
  { id: 'delivery', title: 'Поставку', what: 'поставку' },
  { id: 'approval', title: 'Согласование', what: 'согласование' },
]

export function isWaiting(t: Task): boolean {
  return t.status === 'open' && t.waiting !== null && t.waiting !== undefined
}

/** Срок ожидания прошёл, а ответа нет: пора напомнить или звонить */
export function isStuck(t: Task, ctx: DateCtx): boolean {
  return isWaiting(t) && t.waiting!.until !== null && t.waiting!.until < today(ctx)
}

export function waitingLabel(w: Waiting, ctx: DateCtx): string {
  const what = WAITING_KINDS.find((k) => k.id === w.kind)?.what ?? ''
  return w.until ? `Ждём ${what} до ${formatDay(w.until, ctx)}` : `Ждём ${what}`
}

/** Сначала просроченные, потом по сроку ожидания, без срока в конце */
export function compareWaiting(a: Task, b: Task, ctx: DateCtx): number {
  const sa = isStuck(a, ctx) ? 0 : 1
  const sb = isStuck(b, ctx) ? 0 : 1
  if (sa !== sb) return sa - sb
  const ua = a.waiting?.until ?? '9999-12-31'
  const ub = b.waiting?.until ?? '9999-12-31'
  if (ua !== ub) return ua < ub ? -1 : 1
  return a.sortOrder - b.sortOrder
}

export function waitingCount(tasks: Task[], ctx: DateCtx): { total: number; stuck: number } {
  let total = 0
  let stuck = 0
  for (const t of tasks) {
    if (!isWaiting(t)) continue
    total++
    if (isStuck(t, ctx)) stuck++
  }
  return { total, stuck }
}
