import { describe, expect, it } from 'vitest'
import { checklistProgress, daysLeft, hasTag, isExpired, nextItemOrder, normalizeTag, sortedItems, tagCounts, TRASH_DAYS } from './extras'
import type { Task } from './types'

const item = (title: string, done: boolean, sortOrder: number) => ({ title, done, sortOrder })

describe('чек-лист', () => {
  it('пункты идут в заданном порядке', () => {
    const list = sortedItems({ b: item('Второй', false, 2), a: item('Первый', false, 1), c: item('Третий', true, 3) })
    expect(list.map(([id]) => id)).toEqual(['a', 'b', 'c'])
  })

  it('прогресс не считает пустые пункты', () => {
    expect(checklistProgress({ a: item('Палатка', true, 1), b: item('Спальник', false, 2), c: item('  ', false, 3) })).toEqual({ done: 1, total: 2 })
    expect(checklistProgress({})).toEqual({ done: 0, total: 0 })
  })

  it('новый пункт встаёт в конец', () => {
    expect(nextItemOrder({})).toBe(1024)
    expect(nextItemOrder({ a: item('x', false, 549755813888), b: item('y', false, 0) })).toBe(549755813888 + 1024)
  })
})

describe('теги', () => {
  it('нормализация', () => {
    expect(normalizeTag('  #поставщик ')).toBe('поставщик')
    expect(normalizeTag('##  срочно   дела ')).toBe('срочно дела')
    expect(normalizeTag('#')).toBe('')
    expect(normalizeTag('   ')).toBe('')
  })

  it('сравнение без учёта регистра', () => {
    expect(hasTag(['Поставщик'], 'поставщик')).toBe(true)
    expect(hasTag(['Поставщик'], 'монтаж')).toBe(false)
  })

  it('счётчики по открытым задачам, регистр объединяется', () => {
    const t = (tags: string[], status: Task['status'] = 'open') => ({ tags, status }) as Task
    const counts = tagCounts([t(['Монтаж', 'срочно']), t(['монтаж']), t(['срочно'], 'done'), t([])])
    expect(counts).toEqual([
      { tag: 'Монтаж', count: 2 },
      { tag: 'срочно', count: 1 },
    ])
  })
})

describe('корзина', () => {
  const DAY = 86_400_000
  const now = 1_800_000_000_000

  it('срок хранения 30 дней', () => {
    expect(TRASH_DAYS).toBe(30)
    expect(isExpired(now - 29 * DAY, now)).toBe(false)
    expect(isExpired(now - 30 * DAY, now)).toBe(false)
    expect(isExpired(now - 30 * DAY - 1, now)).toBe(true)
  })

  it('сколько дней осталось', () => {
    expect(daysLeft(now, now)).toBe(30)
    expect(daysLeft(now - 10 * DAY, now)).toBe(20)
    expect(daysLeft(now - 29.5 * DAY, now)).toBe(1)
    expect(daysLeft(now - 40 * DAY, now)).toBe(0)
    // метка сервера чуть позже часов на экране: не показываем больше полного срока
    expect(daysLeft(now + 60_000, now)).toBe(30)
  })
})
