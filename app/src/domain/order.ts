const STEP = 1024

/**
 * Порядок элементов задаётся дробными числами. Чтобы поставить элемент между соседями,
 * берём среднее. Меняется одна запись, а не весь список.
 */
export function orderBetween(before: number | null, after: number | null): number {
  if (before === null && after === null) return STEP
  if (before === null) return (after as number) - STEP
  if (after === null) return before + STEP
  return (before + after) / 2
}

/**
 * Числа сошлись так близко, что среднее равно одному из соседей.
 * Тогда список перенумеровывается целиком (редкий случай).
 */
export function needsRenumber(before: number, after: number): boolean {
  const mid = (before + after) / 2
  return mid <= before || mid >= after
}

export function renumber<T extends { sortOrder: number }>(list: T[]): Array<{ item: T; sortOrder: number }> {
  return list.map((item, i) => ({ item, sortOrder: (i + 1) * STEP }))
}
