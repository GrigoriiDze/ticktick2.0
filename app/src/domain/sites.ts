import { addDays, dayKeyOf, isOverdue, type DateCtx } from './dates'
import type { Project, SiteStage, Task } from './types'

export type Site = NonNullable<Project['site']>

/** Этапы работ на объекте. Порядок слева направо на доске */
export const STAGES: Array<{ id: SiteStage; title: string }> = [
  { id: 'measure', title: 'Замер' },
  { id: 'estimate', title: 'Смета' },
  { id: 'supply', title: 'Комплектация' },
  { id: 'install', title: 'Монтаж' },
  { id: 'commissioning', title: 'Пусконаладка' },
  { id: 'done', title: 'Сдан' },
]

export function stageTitle(id: SiteStage): string {
  return STAGES.find((s) => s.id === id)?.title ?? id
}

export function defaultSite(): Site {
  return { address: '', contactName: '', contactPhone: '', budget: null, drawingsUrl: '', stage: 'measure' }
}

export function isSite(p: Project): p is Project & { site: Site } {
  return p.site !== null && p.site !== undefined
}

/** Объекты по этапам. Внутри этапа по алфавиту */
export function objectsByStage(projects: Project[]): Record<SiteStage, Array<Project & { site: Site }>> {
  const out = Object.fromEntries(STAGES.map((s) => [s.id, [] as Array<Project & { site: Site }>])) as Record<
    SiteStage,
    Array<Project & { site: Site }>
  >
  for (const p of projects) {
    if (!isSite(p) || p.closed) continue
    ;(out[p.site.stage] ?? out.measure).push(p)
  }
  for (const list of Object.values(out)) list.sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  return out
}

/** Открытые задачи объекта: сколько всего, просрочено, ждут чего-то снаружи (и из них зависли) и сколько выездов на ближайшие семь дней */
export function siteStats(
  projectId: string,
  tasks: Task[],
  ctx: DateCtx,
): { open: number; overdue: number; waiting: number; stuck: number; visits: number } {
  const from = dayKeyOf(ctx.now, ctx.tz)
  const to = addDays(from, 6)
  let open = 0
  let overdue = 0
  let waiting = 0
  let stuck = 0
  let visits = 0
  for (const t of tasks) {
    if (t.projectId !== projectId || t.status !== 'open') continue
    open++
    if (isOverdue(t, ctx)) overdue++
    if (t.waiting) {
      waiting++
      if (t.waiting.until !== null && t.waiting.until < from) stuck++
    }
    // Выезд: задача с адресом, назначенная на ближайшую неделю
    if (t.address?.trim() && t.due !== null) {
      const day = typeof t.due === 'number' ? dayKeyOf(t.due, ctx.tz) : t.due
      if (day >= from && day <= to) visits++
    }
  }
  return { open, overdue, waiting, stuck, visits }
}

/** Ссылка, которая открывает адрес в Яндекс Картах или Навигаторе, если они установлены */
export function navigatorUrl(address: string): string | null {
  const text = address.trim()
  return text ? `https://yandex.ru/maps/?text=${encodeURIComponent(text)}` : null
}

/** Ссылка для звонка. Оставляет цифры и плюс в начале, без цифр или с короткой записью возвращает null */
export function phoneHref(phone: string): string | null {
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 5) return null
  return `tel:${phone.trim().startsWith('+') ? '+' : ''}${digits}`
}

/** 1500000 превращает в «1 500 000 ₽» */
export function formatBudget(n: number | null): string {
  if (n === null || Number.isNaN(n)) return ''
  return `${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} ₽`
}

/** Склонение: 1 задача, 2 задачи, 5 задач */
export function plural(n: number, forms: [string, string, string]): string {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return forms[0]
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return forms[1]
  return forms[2]
}
