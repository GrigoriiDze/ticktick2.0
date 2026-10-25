import type { ChecklistItem, Task } from './types'

// ---------- Чек-лист ----------

export function sortedItems(items: Record<string, ChecklistItem>): Array<[string, ChecklistItem]> {
  return Object.entries(items).sort((a, b) => a[1].sortOrder - b[1].sortOrder)
}

/** Пустые пункты (в TickTick бывают случайные) в счёт не идут */
export function checklistProgress(items: Record<string, ChecklistItem>): { done: number; total: number } {
  let done = 0
  let total = 0
  for (const item of Object.values(items)) {
    if (!item.title.trim()) continue
    total++
    if (item.done) done++
  }
  return { done, total }
}

/** Порядок нового пункта: в конец списка */
export function nextItemOrder(items: Record<string, ChecklistItem>): number {
  const orders = Object.values(items).map((i) => i.sortOrder)
  return orders.length ? Math.max(...orders) + 1024 : 1024
}

// ---------- Теги ----------

/** Название тега: без решётки и лишних пробелов. Пустое значение означает, что тег не задан */
export function normalizeTag(raw: string): string {
  return raw.trim().replace(/^#+/, '').trim().replace(/\s+/g, ' ')
}

export function hasTag(tags: string[], tag: string): boolean {
  const key = tag.toLowerCase()
  return tags.some((t) => t.toLowerCase() === key)
}

/** Все теги из открытых задач с количеством. Регистр объединяется, показывается первое написание */
export function tagCounts(tasks: Task[]): Array<{ tag: string; count: number }> {
  const map = new Map<string, { tag: string; count: number }>()
  for (const t of tasks) {
    if (t.status !== 'open') continue
    for (const tag of t.tags) {
      const key = tag.toLowerCase()
      const entry = map.get(key)
      if (entry) entry.count++
      else map.set(key, { tag, count: 1 })
    }
  }
  return [...map.values()].sort((a, b) => a.tag.localeCompare(b.tag, 'ru'))
}

// ---------- Корзина ----------

export const TRASH_DAYS = 30

/** Задача лежит в корзине дольше срока хранения */
export function isExpired(deletedAtMs: number, now: number): boolean {
  return now - deletedAtMs > TRASH_DAYS * 86_400_000
}

/** Сколько дней осталось до окончательного удаления, округляя вверх. Минимум 0 */
export function daysLeft(deletedAtMs: number, now: number): number {
  // Время на экране обновляется раз в минуту и может чуть отставать от метки сервера, поэтому не больше полного срока
  return Math.min(TRASH_DAYS, Math.max(0, Math.ceil(TRASH_DAYS - (now - deletedAtMs) / 86_400_000)))
}

/** Описание, как его хранит редактор (markdown с экранированием), обратно в обычный текст: для поиска и «Поделиться» */
export function plainText(markdown: string): string {
  return markdown
    .replace(/\\([\\`*_[\]~])/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
}
